// Gig reads (ROADMAP 4.3.4): getGig, lookupGig (the page, spec 04 AC-26…AC-30, AC-33) and listMyGigs (Selling →
// Gigs, AC-20). Visibility (AC-28, contract `x-permission`): an active gig of a listable owner (spec 03 P-29) for
// everyone; the owner also sees their pending and rejected gigs; deleted gigs and everything else are 404 (staff
// read through adminGetGig, 4.3.7). Text fields in the request language with the Georgian fallback per field
// (AC-27, `contentLocale`). Neutral values of later slices (4.3.1 handoff §D): the seller's rating stays empty until
// slice 6, `ordersInQueueCount` is the stored counter (0 until slice 5), Premium comes from PremiumStatus (slice 8).
// listRelatedGigs (4.3.5a, AC-32, P-137): "You may also like" under the same visibility as the page.
import { Inject, Injectable } from '@nestjs/common';
import type { components, Locale } from '@mytask/types';
import { Prisma, type GigStatus } from '../../generated/prisma/client';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { afterCursor, decodeCursor, page } from '../../platform/pagination';
import { GigCards, ratingSummary } from '../catalog/gig-cards';
import { LISTABLE_OWNER } from '../catalog/list-rules';
import { localized } from '../catalog/localized';
import { imageVariants } from '../files/image-variants';
import { UserSummaries } from '../profiles/user-summaries';
import { FULL, gigDocument, money, notFound, type FullGig } from './gigs.service';

type S = components['schemas'];
type Translate = (key: string) => string;

/** Public uid (legacy `CreateComponent.php:676`): 20 hex characters, matched case-insensitively (AC-33). */
const UID = /^[0-9A-Fa-f]{20}$/;
const LISTED_STATUSES: readonly GigStatus[] = ['active', 'pending', 'rejected'];
const NO_RATING: S['RatingSummary'] = { count: 0, averageTenths: null };
const RELATED_MAX = 40;

/**
 * Title and plain description of every gig in the request language (`g`, `ka`, `en` = gigs and its two translation
 * rows), lower-cased, with the Georgian fallback of `localized()`: on English pages each field falls back to the
 * Georgian one; on Georgian pages only the title may borrow the English one. Plain text as `richTextPlainText`:
 * tags removed, the four entities the sanitiser writes decoded, whitespace runs as one space. The viewed gig and
 * the candidates go through these same expressions, so "contains" compares like with like.
 */
function relatedTexts(locale: Locale) {
  const [wanted, other] = locale === 'en' ? ['en', 'ka'] : ['ka', 'en'];
  const field = (column: 'title' | 'description', fallback: boolean) => {
    const own = Prisma.sql`NULLIF(btrim(${Prisma.raw(`${wanted}."${column}"`)}), '')`;
    return fallback
      ? Prisma.sql`COALESCE(${own}, ${Prisma.raw(`${other}."${column}"`)}, '')`
      : Prisma.sql`COALESCE(${own}, '')`;
  };
  const plain = Prisma.sql`btrim(regexp_replace(
    replace(replace(replace(replace(
      regexp_replace(${field('description', locale === 'en')}, '<[^>]*>', '', 'g'),
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&amp;', '&'),
    '[[:space:]]+', ' ', 'g'))`;
  return Prisma.sql`
    SELECT g."id", g."status", g."owner_id", g."subcategory_id",
           lower(${field('title', true)}) AS "title", lower(${plain}) AS "description"
    FROM "gigs" g
    LEFT JOIN "gig_translations" ka ON ka."gig_id" = g."id" AND ka."locale" = 'ka'
    LEFT JOIN "gig_translations" en ON en."gig_id" = g."id" AND en."locale" = 'en'`;
}

@Injectable()
export class GigPages {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly summaries: UserSummaries,
    private readonly cards: GigCards,
  ) {}

  async get(gigId: string, locale: Locale, viewerId: string | null): Promise<S['Gig']> {
    const gig = await this.prisma.gig.findUnique({ where: { id: gigId }, include: FULL });
    return this.page(gig, locale, viewerId);
  }

  /** `/service/{slug}`: the web sends the text after the slug's last `-`; the web answers 301 when `slug` differs. */
  async lookup(uid: string, locale: Locale, viewerId: string | null): Promise<S['Gig']> {
    if (!UID.test(uid)) throw notFound();
    const gig = await this.prisma.gig.findUnique({
      where: { uid: uid.toUpperCase() },
      include: FULL,
    });
    return this.page(gig, locale, viewerId);
  }

  /**
   * AC-28 + P-29 (contract `x-permission` of getGig, shared with listRelatedGigs): others see only active gigs of
   * listable owners (`LISTABLE_OWNER` of the lists); the owner also their pending and rejected ones; deleted → 404
   * for everyone. Returns the owner row.
   */
  private async visibleOwner(
    gig: { status: GigStatus; ownerId: string } | null,
    viewerId: string | null,
  ) {
    if (!gig || gig.status === 'deleted') throw notFound();
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: gig.ownerId },
      include: { profile: { select: { unavailableUntil: true } } },
    });
    if (gig.ownerId !== viewerId) {
      const listable =
        (owner.status === 'active' || owner.status === 'verified') &&
        owner.deletedAt === null &&
        !owner.isRestricted;
      if (gig.status !== 'active' || !listable) throw notFound();
    }
    return owner;
  }

  // ------------------------------------------------------------------ the page (AC-26…AC-30)

  private async page(
    gig: FullGig | null,
    locale: Locale,
    viewerId: string | null,
  ): Promise<S['Gig']> {
    if (!gig) throw notFound();
    const owner = await this.visibleOwner(gig, viewerId);
    const isOwner = gig.ownerId === viewerId;

    const fileIds = [
      gig.thumbnailFileId,
      ...gig.images.map((i) => i.fileId),
      ...gig.documents.map((d) => d.fileId),
    ];
    const [files, categories, seller, favorite, report] = await Promise.all([
      this.prisma.file.findMany({ where: { id: { in: fileIds } } }),
      this.prisma.gigCategory.findMany({
        where: { id: { in: [gig.categoryId, gig.subcategoryId, gig.childcategoryId] } },
        include: { translations: { select: { locale: true, name: true } } },
      }),
      this.summaries.one(gig.ownerId),
      viewerId && !isOwner
        ? this.prisma.favorite.count({ where: { userId: viewerId, gigId: gig.id } })
        : 0,
      viewerId && !isOwner
        ? this.prisma.report.count({
            where: { reporterUserId: viewerId, targetType: 'gig', targetId: gig.id },
          })
        : 0,
    ]);
    const byId = new Map(files.map((f) => [f.id, f]));
    const image = (id: string) => {
      const f = byId.get(id);
      return f ? imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL) : null;
    };
    const thumbnail = image(gig.thumbnailFileId);
    // Only ready public images are accepted on save, so a thumbnail without variants is never expected.
    if (!thumbnail)
      throw new Error(`gig ${gig.id} thumbnail ${gig.thumbnailFileId} has no variants`);
    const category = (id: string): S['CategoryRef'] => {
      const row = categories.find((c) => c.id === id);
      if (!row) throw new Error(`gig ${gig.id} category ${id} not found`);
      const { values, contentLocale } = localized(row.translations, locale, ['name']);
      return { id: row.id, slug: row.slug, name: values.name ?? '', contentLocale };
    };

    const text = localized(gig.translations, locale, ['title', 'description']);
    const en = gig.translations.find((t) => t.locale === 'en');
    const now = new Date();
    const until = owner.profile?.unavailableUntil;
    const unavailableUntil = until && until > now ? until : null;
    return {
      id: gig.id,
      uid: gig.uid,
      slug: gig.slug,
      status: gig.status,
      title: text.values.title ?? '',
      description: text.values.description ?? '',
      contentLocale: text.contentLocale,
      // Both English texts (spec 17 AC-4); an English row may hold one empty field (createGig).
      hasEnglish: !!en?.title.trim() && !!en.description.trim(),
      category: category(gig.categoryId),
      subcategory: category(gig.subcategoryId),
      childCategory: category(gig.childcategoryId),
      price: money(gig.priceTetri),
      deliveryDays: gig.deliveryDays as S['GigDeliveryDays'],
      revisionsAllowed: gig.revisionsAllowed,
      upgrades: gig.upgrades.map((u) => ({
        id: u.id,
        title: u.title,
        price: money(u.priceTetri),
        extraDays: u.extraDays as S['GigDeliveryDays'],
      })),
      faqs: gig.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      thumbnail,
      images: gig.images.flatMap((i) => image(i.fileId) ?? []),
      // EC-8: documents stay visible while S-080 is OFF; only new uploads are refused.
      documents: gig.documents.flatMap((d) => {
        const f = byId.get(d.fileId);
        return f ? (gigDocument(f, this.env.PUBLIC_MEDIA_BASE_URL) ?? []) : [];
      }),
      seller: {
        user: seller,
        rating: NO_RATING,
        unavailableUntil: unavailableUntil?.toISOString() ?? null,
        // AC-29: the notice and the cart refusal while the seller is unavailable or restricted.
        isAcceptingOrders: unavailableUntil === null && !owner.isRestricted,
      },
      isFeatured: seller.isPremium,
      rating: ratingSummary(gig.ratingCount, gig.ratingSum),
      ordersInQueueCount: gig.ordersInQueue,
      seoTitle: gig.seoTitle,
      seoDescription: gig.seoDescription,
      publishedAt: gig.publishedAt?.toISOString() ?? null,
      updatedAt: gig.updatedAt.toISOString(),
      viewer: viewerId ? { isOwner, isFavorite: favorite > 0, hasReported: report > 0 } : null,
    };
  }

  // ------------------------------------------------------------------ listRelatedGigs (AC-32, P-137, EC-13)

  /**
   * Other active gigs of listable owners (the same seller's too) that match at least one of: M1 same sub-category;
   * M2 title contains the viewed title; M3 description contains the viewed title; M4 description contains the
   * viewed description. Case-insensitive substrings (`strpos`, so `%` and `_` are ordinary characters); an empty
   * viewed text matches nothing. Random order on every call, at most 40, no Premium boost, no filling up; empty →
   * the client hides the section.
   */
  async related(
    gigId: string,
    locale: Locale,
    viewerId: string | null,
  ): Promise<S['GigRelatedList']> {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      select: { status: true, ownerId: true },
    });
    await this.visibleOwner(gig, viewerId);
    const texts = relatedTexts(locale);
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT c."id"
      FROM (${texts}) c
      JOIN "users" u ON u."id" = c."owner_id"
      CROSS JOIN (${texts} WHERE g."id" = ${gigId}::uuid) v
      WHERE c."id" <> v."id" AND c."status" = 'active' AND ${LISTABLE_OWNER}
        AND (c."subcategory_id" = v."subcategory_id"
          OR (v."title" <> '' AND (strpos(c."title", v."title") > 0 OR strpos(c."description", v."title") > 0))
          OR (v."description" <> '' AND strpos(c."description", v."description") > 0))
      ORDER BY random()
      LIMIT ${RELATED_MAX}`;
    return {
      gigs: await this.cards.cards(
        rows.map((r) => r.id),
        locale,
        viewerId,
      ),
    };
  }

  // ------------------------------------------------------------------ listMyGigs (AC-20)

  /** The caller's non-deleted gigs, newest first; the rejection reason only while rejected. */
  async listMine(
    userId: string,
    query: { status?: GigStatus[]; cursor?: string; limit?: number },
    locale: Locale,
    t: Translate,
  ): Promise<S['GigOwnerListItemPage']> {
    const limit = query.limit ?? 20;
    const statuses = query.status?.length ? query.status : LISTED_STATUSES;
    const rows = await this.prisma.gig.findMany({
      where: {
        ownerId: userId,
        status: { in: statuses.filter((s) => LISTED_STATUSES.includes(s)) },
        ...afterCursor(decodeCursor(query.cursor, t), 'desc'),
      },
      include: { translations: { select: { locale: true, title: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const { data, nextCursor } = page(rows, limit);
    const thumbs = new Map(
      (
        await this.prisma.file.findMany({
          where: { id: { in: data.map((g) => g.thumbnailFileId) } },
        })
      ).map((f) => [f.id, f]),
    );
    return {
      data: data.map((g) => {
        const { values, contentLocale } = localized(g.translations, locale, ['title']);
        const thumb = thumbs.get(g.thumbnailFileId);
        return {
          id: g.id,
          uid: g.uid,
          slug: g.slug,
          title: values.title ?? '',
          contentLocale,
          thumbnail: thumb ? imageVariants(thumb, this.env.PUBLIC_MEDIA_BASE_URL) : null,
          price: money(g.priceTetri),
          status: g.status,
          rejectionReason: g.status === 'rejected' ? g.rejectionReason : null,
          ordersInQueueCount: g.ordersInQueue,
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        };
      }),
      nextCursor,
    };
  }
}
