// The owner's gig writes (spec 04 AC-3…AC-16, AC-19, AC-33; ROADMAP 4.3.3b): validate the whole wizard (all field
// errors at once), check the files, then in one transaction lock the owner, re-check the plan limit, mark the
// files attached, save the gig with its children, index it for search and queue EV-19 when it waits for review
// (S-070 OFF). Settings are read before the transaction starts (a settings read inside it would wait for a
// second connection). updateGig/deleteGig join in 4.3.3c.
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { components } from '@mytask/types';
import type {
  File as FileRow,
  FilePurpose,
  Gig,
  GigDocument,
  GigFaq,
  GigImage,
  GigTranslation,
  GigUpgrade,
  Prisma,
} from '../../generated/prisma/client';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { RichText } from '../../platform/rich-text/rich-text';
import { SettingsService } from '../../platform/settings/settings.service';
import { newPublicUid, uidSlug } from '../../platform/slug';
import type { RequestContext } from '../auth/request-context';
import { SearchIndex } from '../catalog/search-index';
import { imageVariants } from '../files/image-variants';
import { FileAttachments } from '../files/files.service';
import {
  checkCategoryChain,
  checkDescription,
  checkFaqs,
  checkFileList,
  checkPrice,
  checkRevisions,
  checkSeo,
  checkTitle,
  checkUpgrades,
  type FieldIssue,
} from './gig-input';
import { GigLimits } from './gig-limits';

type S = components['schemas'];
type Tx = Prisma.TransactionClient;
type Translate = RequestContext['t'];
type FullGig = Gig & {
  translations: GigTranslation[];
  upgrades: GigUpgrade[];
  faqs: GigFaq[];
  images: GigImage[];
  documents: GigDocument[];
};

const BY_POSITION = { orderBy: { position: 'asc' } } as const;
const FULL = {
  translations: true,
  upgrades: { where: { deletedAt: null }, ...BY_POSITION },
  faqs: BY_POSITION,
  images: BY_POSITION,
  documents: BY_POSITION,
} as const;
const GIG_PURPOSES: readonly FilePurpose[] = ['gig_thumbnail', 'gig_image', 'gig_document'];

const fileMismatch = () => new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_file_not_found');

@Injectable()
export class GigsService {
  private readonly logger = new Logger('Gigs');

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly richText: RichText,
    private readonly outbox: OutboxService,
    private readonly searchIndex: SearchIndex,
    private readonly limits: GigLimits,
    attachmentChecks: FileAttachments,
  ) {
    // A gig's thumbnail, gallery image or document cannot be deleted through deleteFile (409) while a gig uses it.
    attachmentChecks.register(
      async (file) => GIG_PURPOSES.includes(file.purpose) && (await this.isUsed(file.id)),
    );
  }

  // ------------------------------------------------------------------ createGig (AC-3…AC-16, AC-19, AC-33)

  async create(
    userId: string,
    body: S['GigCreateRequest'],
    ctx: RequestContext,
  ): Promise<S['GigOwnerView']> {
    const s = await this.settings.getMany(['S-041', 'S-070', 'S-077', 'S-080', 'S-081', 'S-100']);
    const limit = await this.limits.limitFor(userId);

    const issues: FieldIssue[] = [];
    const title = checkTitle(issues, body.title);
    const description = checkDescription(issues, body.description, (html) =>
      this.richText.sanitize(html, 'user_text'),
    );
    const categories = await this.prisma.gigCategory.findMany({
      where: { id: { in: [body.categoryId, body.subcategoryId, body.childCategoryId] } },
      select: { id: true, parentId: true },
    });
    checkCategoryChain(issues, body, categories);
    const priceTetri = checkPrice(issues, 'price', body.price);
    const revisionsAllowed = checkRevisions(issues, body.revisionsAllowed, s['S-041']);
    const upgrades = checkUpgrades(issues, body.upgrades ?? []);
    const faqs = checkFaqs(issues, body.faqs ?? []);
    const seo = checkSeo(issues, body.seo);
    const imageFileIds = checkFileList(issues, 'imageFileIds', body.imageFileIds, s['S-077']);
    const documentFileIds = checkFileList(
      issues,
      'documentFileIds',
      body.documentFileIds ?? [],
      s['S-081'],
    );
    if (issues.length) throw validationFailed(issues, ctx.t);
    // EC-8: while S-080 is OFF no document can be attached (uploads are refused the same way).
    if (documentFileIds.length && !s['S-080']) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_feature_disabled', { settingId: 'S-080' });
    }
    await this.checkFiles(userId, null, [
      [body.thumbnailFileId, 'gig_thumbnail'],
      ...imageFileIds.map((id) => [id, 'gig_image'] as const),
      ...documentFileIds.map((id) => [id, 'gig_document'] as const),
    ]);

    const autoApprove = s['S-070'];
    const uid = newPublicUid();
    const now = new Date();
    const gig = await this.prisma.$transaction(async (tx) => {
      // AC-3, R-G3: the authoritative check, serialised per owner by the row lock.
      if (!(await this.limits.lockAndCheck(tx, userId, limit))) {
        throw new ApiException(422, 'PLAN_LIMIT_REACHED', 't_plan_gig_limit_reached', {
          limit: limit.gigLimit ?? 0,
          settingId: limit.settingId,
        });
      }
      await markAttached(tx, [body.thumbnailFileId, ...imageFileIds, ...documentFileIds]);
      const created = await tx.gig.create({
        data: {
          uid,
          slug: uidSlug(title.ka, uid),
          ownerId: userId,
          categoryId: body.categoryId,
          subcategoryId: body.subcategoryId,
          childcategoryId: body.childCategoryId,
          priceTetri,
          deliveryDays: body.deliveryDays,
          revisionsAllowed,
          thumbnailFileId: body.thumbnailFileId,
          seoTitle: seo?.title ?? null,
          seoDescription: seo?.description ?? null,
          status: autoApprove ? 'active' : 'pending',
          publishedAt: autoApprove ? now : null,
          submittedAt: autoApprove ? null : now,
          translations: {
            create: (['ka', 'en'] as const).flatMap((locale) =>
              title[locale] === null && description[locale] === null
                ? []
                : [
                    {
                      locale,
                      // English fields are optional one by one (legacy OverviewValidator.php:49-61): a missing
                      // one is stored empty, and readers fall back to Georgian per field (catalog/localized.ts).
                      title: title[locale] ?? '',
                      description: description[locale] ?? '',
                      updatedByUserId: userId,
                    },
                  ],
            ),
          },
          upgrades: {
            create: upgrades.map((u, position) => ({
              title: u.title,
              priceTetri: u.priceTetri,
              extraDays: u.extraDays,
              position,
            })),
          },
          faqs: { create: faqs.map((f, position) => ({ ...f, position })) },
          images: { create: imageFileIds.map((fileId, position) => ({ fileId, position })) },
          documents: { create: documentFileIds.map((fileId, position) => ({ fileId, position })) },
        },
        include: FULL,
      });
      await this.searchIndex.indexGig(created.id, tx);
      // AC-16: EV-19 `Admin/PendingGig` to every S-100 address (Q-026).
      if (!autoApprove && s['S-100'].length) {
        await this.outbox.add(
          'EV-19',
          { type: 'gig', id: created.id },
          { to: [...s['S-100']], locale: 'ka', params: { title: title.ka } },
          tx,
        );
      }
      return created;
    });
    return this.ownerView(gig);
  }

  // ------------------------------------------------------------------ files (AC-14, ADR-009 §3.6)

  /**
   * Each file: the caller's own upload of the expected purpose, not deleted and not used by another gig
   * (else 422 FILE_PURPOSE_MISMATCH), and `ready` (else 422 FILE_NOT_READY).
   */
  private async checkFiles(
    userId: string,
    gigId: string | null,
    wanted: readonly (readonly [string, FilePurpose])[],
  ): Promise<void> {
    const rows = await this.prisma.file.findMany({
      where: { id: { in: wanted.map(([id]) => id) } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const [id, purpose] of wanted) {
      const f = byId.get(id);
      if (!f || f.ownerUserId !== userId || f.purpose !== purpose || f.status === 'deleted') {
        throw fileMismatch();
      }
      if (await this.isUsed(id, gigId)) throw fileMismatch();
      if (f.status !== 'ready') throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
    }
  }

  /** True when a gig other than `exceptGigId` has the file as thumbnail, gallery image or document. */
  private async isUsed(fileId: string, exceptGigId: string | null = null): Promise<boolean> {
    const not = exceptGigId ? { not: exceptGigId } : undefined;
    const [thumbs, images, documents] = await Promise.all([
      this.prisma.gig.count({ where: { thumbnailFileId: fileId, id: not } }),
      this.prisma.gigImage.count({ where: { fileId, gigId: not } }),
      this.prisma.gigDocument.count({ where: { fileId, gigId: not } }),
    ]);
    return thumbs + images + documents > 0;
  }

  // ------------------------------------------------------------------ the owner's form (AC-18, AC-21)

  /** `GigOwnerView`: both languages, file ids with their public URLs, moderation state. */
  async ownerView(gig: FullGig): Promise<S['GigOwnerView']> {
    const ids = [
      gig.thumbnailFileId,
      ...gig.images.map((i) => i.fileId),
      ...gig.documents.map((d) => d.fileId),
    ];
    const files = new Map(
      (await this.prisma.file.findMany({ where: { id: { in: ids } } })).map((f) => [f.id, f]),
    );
    const image = (id: string) => {
      const f = files.get(id);
      return f ? imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL) : null;
    };
    const thumbnail = image(gig.thumbnailFileId);
    if (!thumbnail) {
      // Never expected: only ready public images are accepted. The gig is saved; the view cannot be built.
      this.logger.error(
        { gigId: gig.id, fileId: gig.thumbnailFileId },
        'gig thumbnail has no variants',
      );
      throw new ApiException(500, 'INTERNAL_ERROR', 't_toast_something_went_wrong');
    }
    const ka = gig.translations.find((t) => t.locale === 'ka');
    const en = gig.translations.find((t) => t.locale === 'en') ?? null;
    return {
      id: gig.id,
      uid: gig.uid,
      slug: gig.slug,
      status: gig.status,
      rejectionReason: gig.status === 'rejected' ? gig.rejectionReason : null,
      title: { ka: ka?.title ?? '', en: en?.title || null },
      description: { ka: ka?.description ?? '', en: en?.description || null },
      categoryId: gig.categoryId,
      subcategoryId: gig.subcategoryId,
      childCategoryId: gig.childcategoryId,
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
        const f = files.get(d.fileId);
        return f ? (this.document(f) ?? []) : [];
      }),
      seo:
        gig.seoTitle !== null && gig.seoDescription !== null
          ? { title: gig.seoTitle, description: gig.seoDescription }
          : null,
      ordersInQueueCount: gig.ordersInQueue,
      createdAt: gig.createdAt.toISOString(),
      updatedAt: gig.updatedAt.toISOString(),
      publishedAt: gig.publishedAt?.toISOString() ?? null,
    };
  }

  /** A ready public PDF (R-G11): downloaded straight from the media URL, no sign-in. */
  private document(f: FileRow): S['GigDocument'] | null {
    const base = this.env.PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, '');
    if (!base || f.status !== 'ready' || f.bucket !== 'public_media') return null;
    return {
      fileId: f.id,
      fileName: f.originalName,
      sizeBytes: Number(f.sizeBytes),
      url: `${base}/${f.objectKey}`,
    };
  }
}

const money = (tetri: bigint): S['Money'] => ({ amount: Number(tetri), currency: 'GEL' });

/** AC-19: every invalid field at once; the summary is `t_toast_form_validation_error`. */
function validationFailed(issues: FieldIssue[], t: Translate): ApiException {
  return new ApiException(400, 'VALIDATION_FAILED', 't_toast_form_validation_error', {
    fields: issues.map((i) => ({ ...i, message: t(i.messageKey, i.params) })),
  });
}

/**
 * Security review 07 SEC-74 (as portfolio): marks the files on their own rows inside the save transaction and
 * refuses unless every one is still `ready`; the unattached cleanup updates the same rows, so the two serialise.
 */
async function markAttached(tx: Tx, fileIds: string[]): Promise<void> {
  const ids = [...new Set(fileIds)];
  const done = await tx.file.updateMany({
    where: { id: { in: ids }, status: 'ready' },
    data: { attachedAt: new Date() },
  });
  if (done.count !== ids.length) throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
}
