// The owner's gig writes (spec 04 AC-3…AC-16, AC-19, AC-33; ROADMAP 4.3.3b): validate the whole wizard (all field
// errors at once), check the files, then in one transaction lock the owner, re-check the plan limit, mark the
// files attached, save the gig with its children, index it for search and queue EV-19 when it waits for review
// (S-070 OFF). Settings are read before the transaction starts (a settings read inside it would wait for a
// second connection). updateGig/deleteGig (4.3.3c) and the owner's edit-form read getGigOwnerView (4.3.4) live here too.
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
import { FileAttachments, FilesService } from '../files/files.service';
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
export type FullGig = Gig & {
  translations: GigTranslation[];
  upgrades: GigUpgrade[];
  faqs: GigFaq[];
  images: GigImage[];
  documents: GigDocument[];
};

const BY_POSITION = { orderBy: { position: 'asc' } } as const;
export const FULL = {
  translations: true,
  upgrades: { where: { deletedAt: null }, ...BY_POSITION },
  faqs: BY_POSITION,
  images: BY_POSITION,
  documents: BY_POSITION,
} as const;
const GIG_PURPOSES: readonly FilePurpose[] = ['gig_thumbnail', 'gig_image', 'gig_document'];

const fileMismatch = () => new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_file_not_found');
export const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

/** Every file of a gig (thumbnail, gallery, documents), once. */
const fileIdsOf = (gig: FullGig) => [
  ...new Set([
    gig.thumbnailFileId,
    ...gig.images.map((i) => i.fileId),
    ...gig.documents.map((d) => d.fileId),
  ]),
];

/** Locks the gig row for this transaction; 404 when it was deleted meanwhile. */
async function lockLiveGig(tx: Tx, gigId: string): Promise<{ ordersInQueue: number }> {
  const [row] = await tx.$queryRaw<{ status: string; orders_in_queue: number }[]>`
    SELECT "status"::text AS "status", "orders_in_queue" FROM "gigs" WHERE "id" = ${gigId}::uuid FOR UPDATE`;
  if (!row || row.status === 'deleted') throw notFound();
  return { ordersInQueue: row.orders_in_queue };
}

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
    private readonly files: FilesService,
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

  // ------------------------------------------------------------------ updateGig (AC-21…AC-23, AC-25, AC-33)

  /**
   * Only the sent fields change; `title` / `description` carry both languages, lists replace the whole list in
   * order. Never limited by the plan (AC-25). Every save follows S-070 again (AC-22, R-G4): OFF → `pending` +
   * EV-19 (also when it was already pending), ON → `active`. Files the gig no longer uses are deleted afterwards.
   */
  async update(
    userId: string,
    gigId: string,
    body: S['GigUpdateRequest'],
    ctx: RequestContext,
  ): Promise<S['GigOwnerView']> {
    const before = await this.ownGig(userId, gigId);
    const s = await this.settings.getMany(['S-041', 'S-070', 'S-077', 'S-080', 'S-081', 'S-100']);

    const issues: FieldIssue[] = [];
    const title = body.title ? checkTitle(issues, body.title) : undefined;
    const description = body.description
      ? checkDescription(issues, body.description, (html) =>
          this.richText.sanitize(html, 'user_text'),
        )
      : undefined;
    const chain = {
      categoryId: body.categoryId ?? before.categoryId,
      subcategoryId: body.subcategoryId ?? before.subcategoryId,
      childCategoryId: body.childCategoryId ?? before.childcategoryId,
    };
    // A changed level is checked against the levels around it, sent or stored (AC-4, AC-21).
    if (body.categoryId ?? body.subcategoryId ?? body.childCategoryId) {
      const categories = await this.prisma.gigCategory.findMany({
        where: { id: { in: Object.values(chain) } },
        select: { id: true, parentId: true },
      });
      checkCategoryChain(issues, chain, categories);
    }
    const priceTetri = body.price ? checkPrice(issues, 'price', body.price) : undefined;
    const revisionsAllowed =
      body.revisionsAllowed === undefined
        ? undefined
        : checkRevisions(issues, body.revisionsAllowed, s['S-041']);
    const upgrades = body.upgrades ? checkUpgrades(issues, body.upgrades) : undefined;
    // An upgrade keeps its identity by `id` (placed orders refer to it): only this gig's current upgrades, once.
    const keptUpgrades = new Set<string>();
    upgrades?.forEach((u, i) => {
      if (u.id === null) return;
      if (keptUpgrades.has(u.id) || !before.upgrades.some((b) => b.id === u.id)) {
        issues.push({
          field: `upgrades[${i}].id`,
          code: 'not_allowed',
          messageKey: 't_validator_exists',
        });
      }
      keptUpgrades.add(u.id);
    });
    const faqs = body.faqs ? checkFaqs(issues, body.faqs) : undefined;
    const seo = body.seo === undefined ? undefined : checkSeo(issues, body.seo);
    const imageFileIds = body.imageFileIds
      ? checkFileList(issues, 'imageFileIds', body.imageFileIds, s['S-077'])
      : undefined;
    const documentFileIds = body.documentFileIds
      ? checkFileList(issues, 'documentFileIds', body.documentFileIds, s['S-081'])
      : undefined;
    if (issues.length) throw validationFailed(issues, ctx.t);
    // EC-8: while S-080 is OFF the gig keeps (and may reorder or remove) its documents; no new one is added.
    const currentDocuments = new Set(before.documents.map((d) => d.fileId));
    if (documentFileIds?.some((id) => !currentDocuments.has(id)) && !s['S-080']) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_feature_disabled', { settingId: 'S-080' });
    }
    const newFiles: [string, FilePurpose][] = [
      ...(body.thumbnailFileId
        ? [[body.thumbnailFileId, 'gig_thumbnail'] as [string, FilePurpose]]
        : []),
      ...(imageFileIds ?? []).map((id) => [id, 'gig_image'] as [string, FilePurpose]),
      ...(documentFileIds ?? []).map((id) => [id, 'gig_document'] as [string, FilePurpose]),
    ];
    if (newFiles.length) await this.checkFiles(userId, before.id, newFiles);

    const ka = before.translations.find((t) => t.locale === 'ka')!;
    const en = before.translations.find((t) => t.locale === 'en');
    const next = {
      kaTitle: title?.ka ?? ka.title,
      kaDescription: description?.ka ?? ka.description,
      enTitle: title ? title.en : en?.title || null,
      enDescription: description ? description.en : en?.description || null,
    };
    const autoApprove = s['S-070'];
    const now = new Date();
    const gig = await this.prisma.$transaction(async (tx) => {
      // A delete committed meanwhile wins: the row lock orders the two, then the status is read again.
      await lockLiveGig(tx, before.id);
      if (newFiles.length)
        await markAttached(
          tx,
          newFiles.map(([id]) => id),
        );
      if (title || description) {
        await tx.gigTranslation.update({
          where: { gigId_locale: { gigId: before.id, locale: 'ka' } },
          data: { title: next.kaTitle, description: next.kaDescription, updatedByUserId: userId },
        });
        if (next.enTitle === null && next.enDescription === null) {
          await tx.gigTranslation.deleteMany({ where: { gigId: before.id, locale: 'en' } });
        } else {
          // Each English field is optional on its own; a missing one is stored empty (see createGig).
          const enData = {
            title: next.enTitle ?? '',
            description: next.enDescription ?? '',
            updatedByUserId: userId,
          };
          await tx.gigTranslation.upsert({
            where: { gigId_locale: { gigId: before.id, locale: 'en' } },
            create: { gigId: before.id, locale: 'en', ...enData },
            update: enData,
          });
        }
      }
      if (upgrades) {
        // Removed upgrades are only marked deleted (R-G9: placed orders keep theirs).
        await tx.gigUpgrade.updateMany({
          where: { gigId: before.id, deletedAt: null, id: { notIn: [...keptUpgrades] } },
          data: { deletedAt: now },
        });
        for (const [position, u] of upgrades.entries()) {
          const data = {
            title: u.title,
            priceTetri: u.priceTetri,
            extraDays: u.extraDays,
            position,
          };
          if (u.id) await tx.gigUpgrade.update({ where: { id: u.id }, data });
          else await tx.gigUpgrade.create({ data: { gigId: before.id, ...data } });
        }
      }
      if (faqs) {
        await tx.gigFaq.deleteMany({ where: { gigId: before.id } });
        await tx.gigFaq.createMany({
          data: faqs.map((f, position) => ({ gigId: before.id, ...f, position })),
        });
      }
      // Gallery and documents: rewritten in the new order (the position keys are checked at commit, P-34).
      if (imageFileIds) {
        await tx.gigImage.deleteMany({ where: { gigId: before.id } });
        await tx.gigImage.createMany({
          data: imageFileIds.map((fileId, position) => ({ gigId: before.id, fileId, position })),
        });
      }
      if (documentFileIds) {
        await tx.gigDocument.deleteMany({ where: { gigId: before.id } });
        await tx.gigDocument.createMany({
          data: documentFileIds.map((fileId, position) => ({ gigId: before.id, fileId, position })),
        });
      }
      await tx.gig.update({
        where: { id: before.id },
        data: {
          // AC-33, EC-7: a new slug only when the Georgian title changes; old slugs still resolve by uid.
          ...(next.kaTitle !== ka.title ? { slug: uidSlug(next.kaTitle, before.uid) } : {}),
          ...(body.categoryId ? { categoryId: body.categoryId } : {}),
          ...(body.subcategoryId ? { subcategoryId: body.subcategoryId } : {}),
          ...(body.childCategoryId ? { childcategoryId: body.childCategoryId } : {}),
          ...(priceTetri !== undefined ? { priceTetri } : {}),
          ...(body.deliveryDays !== undefined ? { deliveryDays: body.deliveryDays } : {}),
          ...(revisionsAllowed !== undefined ? { revisionsAllowed } : {}),
          ...(body.thumbnailFileId ? { thumbnailFileId: body.thumbnailFileId } : {}),
          ...(seo !== undefined
            ? { seoTitle: seo?.title ?? null, seoDescription: seo?.description ?? null }
            : {}),
          status: autoApprove ? 'active' : 'pending',
          publishedAt: autoApprove ? (before.publishedAt ?? now) : before.publishedAt,
          submittedAt: autoApprove ? before.submittedAt : now,
          rejectionReason: null,
        },
      });
      await this.searchIndex.indexGig(before.id, tx);
      // AC-22: every edit that goes to review sends EV-19, whatever the status was before.
      if (!autoApprove && s['S-100'].length) {
        await this.outbox.add(
          'EV-19',
          { type: 'gig', id: before.id },
          { to: [...s['S-100']], locale: 'ka', params: { title: next.kaTitle } },
          tx,
        );
      }
      return tx.gig.findUniqueOrThrow({ where: { id: before.id }, include: FULL });
    });
    const kept = new Set(fileIdsOf(gig));
    await this.purge(fileIdsOf(before).filter((id) => !kept.has(id)));
    return this.ownerView(gig);
  }

  // ------------------------------------------------------------------ deleteGig (AC-24, R-G8, EC-1)

  /**
   * Refused with 409 while paid order items are unfinished (`orders_in_queue`, kept by spec 06). Otherwise the
   * gig becomes `deleted` by its owner and leaves search; children and files stay for past orders and reviews.
   */
  async remove(userId: string, gigId: string): Promise<void> {
    const gig = await this.ownGig(userId, gigId);
    await this.prisma.$transaction(async (tx) => {
      const { ordersInQueue } = await lockLiveGig(tx, gig.id);
      if (ordersInQueue > 0) {
        throw new ApiException(
          409,
          'GIG_HAS_ORDERS_IN_QUEUE',
          't_this_gig_has_orders_in_queue_delete',
        );
      }
      // One update: the check `gigs_deleted_ck` needs status, deleted_at and deleted_by together.
      await tx.gig.update({
        where: { id: gig.id },
        data: { status: 'deleted', deletedAt: new Date(), deletedBy: 'owner' },
      });
      await this.searchIndex.removeGig(gig.id, tx);
    });
  }

  /** getGigOwnerView (AC-18, AC-21): the edit form's data; another user's or a deleted gig is 404. */
  async getOwnerView(userId: string, gigId: string): Promise<S['GigOwnerView']> {
    return this.ownerView(await this.ownGig(userId, gigId));
  }

  /** The caller's own non-deleted gig; anything else is 404 (contract `x-permission`). */
  private async ownGig(userId: string, gigId: string): Promise<FullGig> {
    const gig = await this.prisma.gig.findUnique({ where: { id: gigId }, include: FULL });
    if (!gig || gig.ownerId !== userId || gig.status === 'deleted') throw notFound();
    return gig;
  }

  /** Best effort after commit: the gig is already right; a left-over file is only storage, never shown. */
  private async purge(fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      try {
        await this.files.purgeDetached(id);
      } catch (e) {
        this.logger.warn({ fileId: id, err: e }, 'gig file not deleted');
      }
    }
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
        return f ? (gigDocument(f, this.env.PUBLIC_MEDIA_BASE_URL) ?? []) : [];
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
}

export const money = (tetri: bigint): S['Money'] => ({ amount: Number(tetri), currency: 'GEL' });

/** A ready public PDF (R-G11): downloaded straight from the media URL, no sign-in. */
export function gigDocument(f: FileRow, mediaBaseUrl: string | undefined): S['GigDocument'] | null {
  const base = mediaBaseUrl?.replace(/\/+$/, '');
  if (!base || f.status !== 'ready' || f.bucket !== 'public_media') return null;
  return {
    fileId: f.id,
    fileName: f.originalName,
    sizeBytes: Number(f.sizeBytes),
    url: `${base}/${f.objectKey}`,
  };
}

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
