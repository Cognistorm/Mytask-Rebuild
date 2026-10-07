// Staff gig moderation (ROADMAP 4.3.7; spec 16 AC-19, AC-20, AC-31; spec 04 AC-17, AC-18, AC-28): the list and the
// pending queue, the detail in both languages with the owner summary, publish / reject (first decision wins), remove
// (an active gig becomes deleted like an owner deletion, internal reason) and restore (staff removals only, within
// 30 days, refused over the owner's plan limit, Owner Q-123 (b), ADR-024). Every decision locks the gig row,
// re-reads its state, writes the search document and the audit row in one transaction. Staff never edit content
// (P-117). The owner's emails EV-20 (publish), EV-21 (reject, with the reason) and EV-130 (restore) are queued in
// the same transaction (4.3.8; in-app + push wait for slice 15); the realtime `gig.status_changed` waits for the
// gateway (slice 08).
import { Inject, Injectable } from '@nestjs/common';
import type { components, Locale } from '@mytask/types';
import type { GigStatus, Prisma } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { decodeCursor, encodeCursor } from '../../platform/pagination';
import type { RequestContext } from '../auth/request-context';
import { ratingSummary } from '../catalog/gig-cards';
import { localized } from '../catalog/localized';
import { SearchIndex } from '../catalog/search-index';
import { imageVariants } from '../files/image-variants';
import { UserSummaries } from '../profiles/user-summaries';
import { allows, GigLimits } from './gig-limits';
import { FULL, gigDocument, money, notFound, type FullGig } from './gigs.service';

type S = components['schemas'];
type Tx = Prisma.TransactionClient;
type Translate = RequestContext['t'];
type Action = 'gig.publish' | 'gig.reject' | 'gig.remove' | 'gig.restore';
/** The owner's email per decision (spec 15); a staff removal notifies nobody (contract). */
const OWNER_EMAIL = {
  'gig.publish': 'EV-20',
  'gig.reject': 'EV-21',
  'gig.restore': 'EV-130',
} as const satisfies Partial<Record<Action, string>>;

/** Spec 16 AC-20: a staff removal can be restored for 30 days. */
const RESTORE_DAYS = 30;
const DAY_MS = 86_400_000;
const UID = /^[0-9A-Fa-f]{20}$/;

const alreadyDecided = (currentState: string) =>
  new ApiException(409, 'STATE_CONFLICT', 't_item_already_decided', { currentState });

const invalidReason = (t: Translate) =>
  new ApiException(400, 'VALIDATION_FAILED', 't_validator_required', {
    fields: [
      {
        field: 'reason',
        code: 'required',
        message: t('t_validator_required'),
        messageKey: 't_validator_required',
      },
    ],
  });

/** Locks the gig row for this transaction and returns its current state; 404 when it does not exist. */
async function lockGig(tx: Tx, gigId: string) {
  const [row] = await tx.$queryRaw<
    {
      status: GigStatus;
      owner_id: string;
      orders_in_queue: number;
      deleted_by: string | null;
      deleted_at: Date | null;
      published_at: Date | null;
    }[]
  >`SELECT "status"::text AS "status", "owner_id"::text AS "owner_id", "orders_in_queue",
           "deleted_by"::text AS "deleted_by", "deleted_at", "published_at"
    FROM "gigs" WHERE "id" = ${gigId}::uuid FOR UPDATE`;
  if (!row) throw notFound();
  return row;
}

@Injectable()
export class AdminGigs {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly searchIndex: SearchIndex,
    private readonly limits: GigLimits,
    private readonly summaries: UserSummaries,
  ) {}

  // ------------------------------------------------------------------ adminListGigs (AC-19, AC-31)

  /**
   * `status=pending` alone is the moderation queue: oldest submission first (`submittedAt`). Anything else (several
   * statuses, another one, none = every gig) is newest first. `totalCount` counts the whole filtered list.
   */
  async list(
    query: {
      status?: GigStatus[];
      categoryId?: string;
      q?: string;
      userId?: string;
      createdFrom?: string;
      createdTo?: string;
      cursor?: string;
      limit?: number;
    },
    locale: Locale,
    t: Translate,
  ): Promise<S['AdminGigListItemPage']> {
    const limit = query.limit ?? 50;
    const statuses = [...new Set(query.status ?? [])];
    const queue = statuses.length === 1 && statuses[0] === 'pending';
    const q = query.q?.trim();
    const and: Prisma.GigWhereInput[] = [];
    if (statuses.length) and.push({ status: { in: statuses } });
    if (query.userId) and.push({ ownerId: query.userId });
    if (query.categoryId) {
      const id = query.categoryId;
      and.push({ OR: [{ categoryId: id }, { subcategoryId: id }, { childcategoryId: id }] });
    }
    if (q) {
      and.push({
        OR: [
          ...(UID.test(q) ? [{ uid: q.toUpperCase() }] : []),
          { translations: { some: { title: { contains: q, mode: 'insensitive' } } } },
        ],
      });
    }
    if (query.createdFrom || query.createdTo) {
      and.push({
        createdAt: {
          ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
          ...(query.createdTo ? { lt: new Date(query.createdTo) } : {}),
        },
      });
    }
    const where: Prisma.GigWhereInput = { AND: and };

    // The queue's cursor carries `submittedAt` (pending gigs always have it, data-model §3.D); lists use `createdAt`.
    const key = decodeCursor(query.cursor, t);
    const sortKey = queue ? 'submittedAt' : 'createdAt';
    const op = queue ? 'gt' : 'lt';
    const dir = queue ? 'asc' : 'desc';
    const after: Prisma.GigWhereInput = key
      ? {
          OR: [
            { [sortKey]: { [op]: key.createdAt } },
            { [sortKey]: key.createdAt, id: { [op]: key.id } },
          ],
        }
      : {};
    const [rows, totalCount] = await Promise.all([
      this.prisma.gig.findMany({
        where: { AND: [where, after] },
        include: { translations: { select: { locale: true, title: true } } },
        orderBy: [{ [sortKey]: dir }, { id: dir }],
        take: limit + 1,
      }),
      this.prisma.gig.count({ where }),
    ]);
    const more = rows.length > limit;
    const data = more ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      more && last
        ? encodeCursor({ createdAt: (queue && last.submittedAt) || last.createdAt, id: last.id })
        : null;

    const [thumbs, categories, owners] = await Promise.all([
      this.prisma.file.findMany({ where: { id: { in: data.map((g) => g.thumbnailFileId) } } }),
      this.categories(
        data.map((g) => g.categoryId),
        locale,
      ),
      this.summaries.many(data.map((g) => g.ownerId)),
    ]);
    const thumbById = new Map(thumbs.map((f) => [f.id, f]));
    return {
      data: data.map((g) => {
        const { values, contentLocale } = localized(g.translations, locale, ['title']);
        const thumb = thumbById.get(g.thumbnailFileId);
        return {
          id: g.id,
          uid: g.uid,
          slug: g.slug,
          title: values.title ?? '',
          contentLocale,
          thumbnail: thumb ? imageVariants(thumb, this.env.PUBLIC_MEDIA_BASE_URL) : null,
          category: categories.get(g.categoryId)!,
          owner: owners.get(g.ownerId)!,
          status: g.status,
          deletedBy: g.deletedBy,
          price: money(g.priceTetri),
          createdAt: g.createdAt.toISOString(),
          // Gigs published without review (S-070 ON) never had a submission: their creation stands in.
          submittedAt: (g.submittedAt ?? g.createdAt).toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        };
      }),
      nextCursor,
      totalCount,
    };
  }

  // ------------------------------------------------------------------ adminGetGig (AC-19, AC-20; spec 04 AC-28)

  async get(gigId: string, locale: Locale): Promise<S['AdminGig']> {
    const gig = await this.prisma.gig.findUnique({ where: { id: gigId }, include: FULL });
    if (!gig) throw notFound();
    return this.view(gig, locale);
  }

  // ------------------------------------------------------------------ publish / reject (spec 04 AC-17, AC-18)

  /** pending → active; `publishedAt` only the first time. The optional note is audited. */
  async publish(
    gigId: string,
    note: string | null,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminGig']> {
    const gig = await this.decide(
      gigId,
      staffId,
      ctx,
      'gig.publish',
      note?.trim() || null,
      (row, now) => {
        if (row.status !== 'pending') throw alreadyDecided(row.status);
        return { status: 'active', publishedAt: row.published_at ?? now };
      },
    );
    return this.view(gig, ctx.locale);
  }

  /** pending → rejected with the reason shown to the owner (My gigs, the edit screen). */
  async reject(
    gigId: string,
    reasonInput: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminGig']> {
    const reason = reasonInput.trim();
    if (!reason) throw invalidReason(ctx.t);
    const gig = await this.decide(gigId, staffId, ctx, 'gig.reject', reason, (row) => {
      if (row.status !== 'pending') throw alreadyDecided(row.status);
      return { status: 'rejected', rejectionReason: reason };
    });
    return this.view(gig, ctx.locale);
  }

  // ------------------------------------------------------------------ remove / restore (spec 16 AC-20, AC-28)

  /**
   * active → deleted exactly like an owner deletion (`deleteGig`), with `deleted_by = staff`, the staff id and the
   * internal reason; refused while orders are in progress (P-117). The owner is not notified.
   */
  async remove(
    gigId: string,
    reasonInput: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminGig']> {
    const reason = reasonInput.trim();
    if (!reason) throw invalidReason(ctx.t);
    const gig = await this.decide(gigId, staffId, ctx, 'gig.remove', reason, (row, now) => {
      if (row.status !== 'active') throw alreadyDecided(row.status);
      if (row.orders_in_queue > 0) {
        throw new ApiException(
          409,
          'GIG_HAS_ORDERS_IN_QUEUE',
          't_this_gig_has_orders_in_queue_delete',
        );
      }
      return {
        status: 'deleted',
        deletedAt: now,
        deletedBy: 'staff',
        deletedByStaffId: staffId,
        removalReason: reason,
      };
    });
    return this.view(gig, ctx.locale);
  }

  /**
   * A staff removal within 30 days → active again (no re-moderation, also while S-070 is OFF), removal fields
   * cleared. Refused when the owner's non-deleted gigs already reach the plan limit (counted under the owner row
   * lock, as createGig), Q-123 (b).
   */
  async restore(
    gigId: string,
    note: string | null,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminGig']> {
    const owner = await this.prisma.gig.findUnique({
      where: { id: gigId },
      select: { ownerId: true },
    });
    if (!owner) throw notFound();
    // Settings are read before the transaction (a settings read inside it would wait for a second connection).
    const limit = await this.limits.limitFor(owner.ownerId);
    const gig = await this.decide(
      gigId,
      staffId,
      ctx,
      'gig.restore',
      note?.trim() || null,
      async (row, now, tx) => {
        if (row.status !== 'deleted' || row.deleted_by !== 'staff')
          throw alreadyDecided(row.status);
        if (now.getTime() > row.deleted_at!.getTime() + RESTORE_DAYS * DAY_MS) {
          throw new ApiException(422, 'GIG_RESTORE_WINDOW_EXPIRED', 't_gig_restore_window_expired');
        }
        const count = await this.limits.lockAndCount(tx, row.owner_id);
        if (!allows(limit, count)) {
          throw new ApiException(422, 'PLAN_LIMIT_REACHED', 't_admin_gig_restore_plan_limit', {
            limit: limit.gigLimit ?? 0,
            settingId: limit.settingId,
            count,
          });
        }
        return {
          status: 'active',
          deletedAt: null,
          deletedBy: null,
          deletedByStaffId: null,
          removalReason: null,
        };
      },
    );
    return this.view(gig, ctx.locale);
  }

  /**
   * One staff decision: lock the gig row, let `next` check the current state and give the change, save it,
   * refresh the search document, queue the owner's email and write the audit row, all in one transaction. A second
   * decision waits on the lock and then sees the first one's state (first decision wins, AC-19).
   */
  private async decide(
    gigId: string,
    staffId: string,
    ctx: RequestContext,
    action: Action,
    reason: string | null,
    next: (
      row: Awaited<ReturnType<typeof lockGig>>,
      now: Date,
      tx: Tx,
    ) =>
      | (Prisma.GigUncheckedUpdateInput & { status: GigStatus })
      | Promise<Prisma.GigUncheckedUpdateInput & { status: GigStatus }>,
  ): Promise<FullGig> {
    return this.prisma.$transaction(async (tx) => {
      const row = await lockGig(tx, gigId);
      const now = new Date();
      // One update: the check `gigs_deleted_ck` needs status, deleted_at and deleted_by together.
      const gig = await tx.gig.update({
        where: { id: gigId },
        data: await next(row, now, tx),
        include: FULL,
      });
      await this.searchIndex.indexGig(gigId, tx);
      const ka = gig.translations.find((tr) => tr.locale === 'ka');
      const event = action === 'gig.remove' ? null : OWNER_EMAIL[action];
      if (event) {
        // The worker renders in the owner's language: the English title when the gig has one.
        const en = gig.translations.find((tr) => tr.locale === 'en');
        await this.outbox.add(
          event,
          { type: 'gig', id: gigId },
          {
            userId: gig.ownerId,
            params: {
              title: ka?.title ?? '',
              titleEn: en?.title ?? '',
              slug: gig.slug,
              ...(event === 'EV-21' ? { reason: reason ?? '' } : {}),
            },
          },
          tx,
        );
      }
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'gigs.moderate',
          action,
          targetType: 'gig',
          targetId: gigId,
          before: { status: row.status },
          after: { userId: gig.ownerId, status: gig.status, title: ka?.title ?? '' },
          reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
      return gig;
    });
  }

  // ------------------------------------------------------------------ mapping

  /** `CategoryRef` by id in the request language (Georgian fallback). */
  private async categories(ids: string[], locale: Locale): Promise<Map<string, S['CategoryRef']>> {
    const rows = await this.prisma.gigCategory.findMany({
      where: { id: { in: [...new Set(ids)] } },
      include: { translations: { select: { locale: true, name: true } } },
    });
    return new Map(
      rows.map((row) => {
        const { values, contentLocale } = localized(row.translations, locale, ['name']);
        return [row.id, { id: row.id, slug: row.slug, name: values.name ?? '', contentLocale }];
      }),
    );
  }

  /** `AdminGig`: the content in both languages, moderation state and the owner summary. */
  private async view(gig: FullGig, locale: Locale): Promise<S['AdminGig']> {
    const fileIds = [
      gig.thumbnailFileId,
      ...gig.images.map((i) => i.fileId),
      ...gig.documents.map((d) => d.fileId),
    ];
    const [files, categories, ownerSummary] = await Promise.all([
      this.prisma.file.findMany({ where: { id: { in: fileIds } } }),
      this.categories([gig.categoryId, gig.subcategoryId, gig.childcategoryId], locale),
      this.summaries.owner(gig.ownerId, await this.earlierRejections(gig.ownerId)),
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
    const ka = gig.translations.find((tr) => tr.locale === 'ka');
    const en = gig.translations.find((tr) => tr.locale === 'en');
    const staffRemoval = gig.deletedBy === 'staff' ? gig.deletedAt : null;
    return {
      id: gig.id,
      uid: gig.uid,
      slug: gig.slug,
      status: gig.status,
      title: { ka: ka?.title ?? '', en: en?.title || null },
      description: { ka: ka?.description ?? '', en: en?.description || null },
      category: categories.get(gig.categoryId)!,
      subcategory: categories.get(gig.subcategoryId)!,
      childCategory: categories.get(gig.childcategoryId)!,
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
      documents: gig.documents.flatMap((d) => {
        const f = byId.get(d.fileId);
        return f ? (gigDocument(f, this.env.PUBLIC_MEDIA_BASE_URL) ?? []) : [];
      }),
      seo:
        gig.seoTitle !== null && gig.seoDescription !== null
          ? { title: gig.seoTitle, description: gig.seoDescription }
          : null,
      isFeatured: ownerSummary.user.isPremium,
      rating: ratingSummary(gig.ratingCount, gig.ratingSum),
      ordersInQueueCount: gig.ordersInQueue,
      rejectionReason: gig.status === 'rejected' ? gig.rejectionReason : null,
      deletedBy: gig.deletedBy,
      removalReason: gig.deletedBy === 'staff' ? gig.removalReason : null,
      removedAt: gig.deletedAt?.toISOString() ?? null,
      restoreDeadlineAt: staffRemoval
        ? new Date(staffRemoval.getTime() + RESTORE_DAYS * DAY_MS).toISOString()
        : null,
      ownerSummary,
      createdAt: gig.createdAt.toISOString(),
      submittedAt: (gig.submittedAt ?? gig.createdAt).toISOString(),
      publishedAt: gig.publishedAt?.toISOString() ?? null,
      updatedAt: gig.updatedAt.toISOString(),
    };
  }

  /** Staff rejections of this owner's gigs so far (the audit log keeps them after an edit). */
  private earlierRejections(userId: string): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        action: 'gig.reject',
        targetType: 'gig',
        after: { path: ['userId'], equals: userId },
      },
    });
  }
}
