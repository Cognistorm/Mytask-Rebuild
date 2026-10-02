// Portfolio (spec 02 AC-24…AC-28, AC-42, R-P6; spec 16 AC-19, AC-21; ROADMAP 4.1.12): the owner's create, edit
// and delete, the public list and item, and the staff queue (approve, reject with a reason, remove).
// Slug = legacy `substr(Str::slug(title), 0, 138) . '-' . uid()` with a 20-char upper-case hex uid
// (legacy `Seller/Portfolio/Options/CreateComponent.php:120-126`, `helpers.php:76`). Every save follows S-071:
// `active` at once, or `pending` + EV-14 to every S-100 address (legacy `EditComponent.php:186-226`).
// Staff decisions are compare-and-set on `pending` (first decision wins); the reject reason lives on the row
// while `rejected` and in the audit log for good.
import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { components } from '@mytask/types';
import type {
  File as FileRow,
  PortfolioImage,
  PortfolioItem,
  PortfolioStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { afterCursor, decodeCursor, page } from '../../platform/pagination';
import { SettingsService } from '../../platform/settings/settings.service';
import { slugify } from '../../platform/slug';
import type { RequestContext } from '../auth/request-context';
import { imageVariants } from '../files/image-variants';
import { FileAttachments, FilesService } from '../files/files.service';
import { UserSummaries } from './user-summaries';

type S = components['schemas'];
type Tx = Prisma.TransactionClient;
type Item = PortfolioItem & { images: PortfolioImage[] };
type Translate = RequestContext['t'];

const WITH_IMAGES = { images: { orderBy: { position: 'asc' } } } as const;
/** Owners whose profile is public (AC-9): others' items answer 404 like the profile. */
const VISIBLE_OWNER = {
  deletedAt: null,
  status: { in: ['active', 'verified'] },
} satisfies Prisma.UserWhereInput;
const UID = /^[0-9A-Fa-f]{20}$/;

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
const invalid = (
  t: Translate,
  field: string,
  code: string,
  key: string,
  params?: Record<string, number>,
) =>
  new ApiException(400, 'VALIDATION_FAILED', key, {
    fields: [
      { field, code, message: t(key, params), messageKey: key, ...(params ? { params } : {}) },
    ],
  });

const newUid = () => randomBytes(10).toString('hex').toUpperCase();
const slugOf = (title: string, uid: string) => `${slugify(title).slice(0, 138)}-${uid}`;

/** Every file of an item (thumbnail + gallery), once. */
const fileIdsOf = (item: Item) => [
  ...new Set([item.thumbnailFileId, ...item.images.map((i) => i.fileId)]),
];

export interface ItemInput {
  title?: string;
  description?: string;
  thumbnailFileId?: string;
  imageFileIds?: string[];
  projectUrl?: string | null;
  videoUrl?: string | null;
}

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger('Portfolio');

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly files: FilesService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly summaries: UserSummaries,
    attachmentChecks: FileAttachments,
  ) {
    // A thumbnail or gallery image cannot be deleted through deleteFile (409) while its item exists.
    attachmentChecks.register(
      async (file) => file.purpose === 'portfolio_image' && (await this.isUsed(file.id)),
    );
  }

  private async isUsed(fileId: string, exceptItemId?: string): Promise<boolean> {
    const not = exceptItemId ? { not: exceptItemId } : undefined;
    const [thumbs, images] = await Promise.all([
      this.prisma.portfolioItem.count({ where: { thumbnailFileId: fileId, id: not } }),
      this.prisma.portfolioImage.count({ where: { fileId, portfolioItemId: not } }),
    ]);
    return thumbs + images > 0;
  }

  // ------------------------------------------------------------------ owner (AC-24, AC-25, AC-27, AC-42)

  async create(userId: string, input: S['PortfolioItemCreateRequest'], ctx: RequestContext) {
    const data = await this.checkInput(userId, input, ctx.t, null);
    const autoApprove = await this.settings.get('S-071');
    const admins = await this.settings.get('S-100');
    const uid = newUid();
    const now = new Date();
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.portfolioItem.create({
        data: {
          uid,
          userId,
          slug: slugOf(data.title!, uid),
          title: data.title!,
          description: data.description!,
          projectUrl: data.projectUrl ?? null,
          videoUrl: data.videoUrl ?? null,
          thumbnailFileId: data.thumbnailFileId!,
          status: autoApprove ? 'active' : 'pending',
          publishedAt: autoApprove ? now : null,
          images: {
            create: data.imageFileIds!.map((fileId, position) => ({ fileId, position })),
          },
        },
        include: WITH_IMAGES,
      });
      if (!autoApprove) await this.notifyPending(created, admins, tx);
      return created;
    });
    return this.view(item, userId);
  }

  /**
   * New data replaces the old; `imageFileIds` replaces the whole gallery. Any save follows S-071 again, also
   * for an `active` or `rejected` item; the rejection reason is cleared for the owner (AC-42). Files the item
   * no longer uses are deleted afterwards.
   */
  async update(
    userId: string,
    itemId: string,
    input: S['PortfolioItemUpdateRequest'],
    ctx: RequestContext,
  ): Promise<S['PortfolioItem']> {
    const before = await this.ownItem(userId, itemId);
    const data = await this.checkInput(userId, input, ctx.t, before.id);
    const autoApprove = await this.settings.get('S-071');
    const admins = await this.settings.get('S-100');
    const title = data.title ?? before.title;
    const item = await this.prisma.$transaction(async (tx) => {
      if (data.imageFileIds) {
        await tx.portfolioImage.deleteMany({ where: { portfolioItemId: before.id } });
      }
      const saved = await tx.portfolioItem.update({
        where: { id: before.id },
        data: {
          title,
          slug: slugOf(title, before.uid),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.thumbnailFileId ? { thumbnailFileId: data.thumbnailFileId } : {}),
          ...(data.projectUrl !== undefined ? { projectUrl: data.projectUrl } : {}),
          ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
          status: autoApprove ? 'active' : 'pending',
          publishedAt: autoApprove ? (before.publishedAt ?? new Date()) : before.publishedAt,
          rejectionReason: null,
          rejectedAt: null,
          reviewedByStaffId: null,
          reviewedAt: null,
          ...(data.imageFileIds
            ? {
                images: {
                  create: data.imageFileIds.map((fileId, position) => ({ fileId, position })),
                },
              }
            : {}),
        },
        include: WITH_IMAGES,
      });
      if (!autoApprove) await this.notifyPending(saved, admins, tx);
      return saved;
    });
    const kept = new Set(fileIdsOf(item));
    await this.purge(fileIdsOf(before).filter((id) => !kept.has(id)));
    return this.view(item, userId);
  }

  /** The owner deletes an item at any time, with its files (AC-27, AC-42). */
  async remove(userId: string, itemId: string): Promise<void> {
    const item = await this.ownItem(userId, itemId);
    await this.prisma.portfolioItem.delete({ where: { id: item.id } });
    await this.purge(fileIdsOf(item));
  }

  private async ownItem(userId: string, itemId: string): Promise<Item> {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: WITH_IMAGES,
    });
    if (!item || item.userId !== userId) throw notFound();
    return item;
  }

  /**
   * Trimmed texts and links (the contract checked lengths before trimming); files are ready own
   * `portfolio_image` uploads not used by another item; 1…S-089 gallery images, duplicates once.
   */
  private async checkInput(
    userId: string,
    input: ItemInput,
    t: Translate,
    itemId: string | null,
  ): Promise<ItemInput> {
    const out: ItemInput = {};
    if (input.title !== undefined) {
      out.title = input.title.trim();
      if (out.title.length < 3)
        throw invalid(t, 'title', 'too_short', 't_validator_min', { min: 3 });
    }
    if (input.description !== undefined) {
      out.description = input.description.trim();
      if (out.description.length < 10) {
        throw invalid(t, 'description', 'too_short', 't_validator_min', { min: 10 });
      }
    }
    for (const field of ['projectUrl', 'videoUrl'] as const) {
      const value = input[field];
      if (value === undefined) continue;
      const trimmed = value?.trim() || null;
      if (trimmed !== null && !isHttpUrl(trimmed))
        throw invalid(t, field, 'format', 't_validator_url');
      out[field] = trimmed;
    }
    if (input.imageFileIds !== undefined) {
      out.imageFileIds = [...new Set(input.imageFileIds)];
      const max = await this.settings.get('S-089');
      if (out.imageFileIds.length > max) {
        throw invalid(t, 'imageFileIds', 'max_items', 't_validator_max_array', { max });
      }
    }
    out.thumbnailFileId = input.thumbnailFileId;
    const ids = [
      ...(out.thumbnailFileId ? [out.thumbnailFileId] : []),
      ...(out.imageFileIds ?? []),
    ];
    const rows = ids.length ? await this.prisma.file.findMany({ where: { id: { in: ids } } }) : [];
    for (const id of new Set(ids)) {
      const f = rows.find((r) => r.id === id);
      if (
        !f ||
        f.ownerUserId !== userId ||
        f.purpose !== 'portfolio_image' ||
        f.status === 'deleted' ||
        (await this.isUsed(id, itemId ?? undefined))
      ) {
        throw new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_file_not_found');
      }
      if (f.status !== 'ready') throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
    }
    return out;
  }

  /**
   * EV-14 `Admin/PendingPortfolio` to every S-100 address (Q-026), in the same transaction. S-100 is read
   * before the transaction starts (a settings read inside it would wait for a second connection).
   */
  private async notifyPending(
    item: PortfolioItem,
    admins: readonly string[],
    tx: Tx,
  ): Promise<void> {
    if (!admins.length) return;
    await this.outbox.add(
      'EV-14',
      { type: 'portfolio_item', id: item.id },
      { to: [...admins], locale: 'ka', params: { title: item.title } },
      tx,
    );
  }

  /** Best effort: the item is already right; a left-over file is only storage, never shown. */
  private async purge(fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      try {
        await this.files.purgeDetached(id);
      } catch (e) {
        this.logger.warn({ fileId: id, err: e }, 'portfolio file not deleted');
      }
    }
  }

  // ------------------------------------------------------------------ public reads (AC-28, AC-42)

  /** Active items of a public profile, newest first; the owner also gets pending and rejected ones. */
  async list(
    username: string,
    viewerId: string | null,
    query: { cursor?: string; limit?: number },
    t: Translate,
  ): Promise<S['PortfolioItemPage']> {
    const owner = await this.prisma.user.findFirst({
      where: { username, ...VISIBLE_OWNER },
      select: { id: true },
    });
    if (!owner) throw notFound();
    const limit = query.limit ?? 20;
    const rows = await this.prisma.portfolioItem.findMany({
      where: {
        userId: owner.id,
        ...(viewerId === owner.id ? {} : { status: 'active' }),
        ...afterCursor(decodeCursor(query.cursor, t), 'desc'),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const { data, nextCursor } = page(rows, limit);
    const thumbs = await this.fileMap(data.map((r) => r.thumbnailFileId));
    return {
      data: data.flatMap((r) => {
        const thumbnail = this.image(thumbs, r.thumbnailFileId);
        // Thumbnails are checked `ready` on save; one that cannot be shown leaves the card out.
        return thumbnail
          ? [{ id: r.id, uid: r.uid, slug: r.slug, title: r.title, thumbnail, status: r.status }]
          : [];
      }),
      nextCursor,
    };
  }

  async get(itemId: string, viewerId: string | null): Promise<S['PortfolioItem']> {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: WITH_IMAGES,
    });
    return this.visible(item, viewerId);
  }

  /** By `uid` or by `slug` (the uid is its suffix); exactly one of them. */
  async lookup(
    query: { uid?: string; slug?: string },
    viewerId: string | null,
    t: Translate,
  ): Promise<S['PortfolioItem']> {
    if ((query.uid === undefined) === (query.slug === undefined)) {
      throw invalid(
        t,
        query.uid === undefined ? 'uid' : 'slug',
        'required',
        't_validator_required',
      );
    }
    const uid = query.uid ?? query.slug!.slice(query.slug!.lastIndexOf('-') + 1);
    if (!UID.test(uid)) throw notFound();
    const item = await this.prisma.portfolioItem.findUnique({
      where: { uid: uid.toUpperCase() },
      include: WITH_IMAGES,
    });
    return this.visible(item, viewerId);
  }

  /** Others see only active items of public profiles; the owner sees every own item (AC-28, AC-42). */
  private async visible(item: Item | null, viewerId: string | null): Promise<S['PortfolioItem']> {
    if (!item) throw notFound();
    if (item.userId !== viewerId) {
      if (item.status !== 'active') throw notFound();
      const owner = await this.prisma.user.count({ where: { id: item.userId, ...VISIBLE_OWNER } });
      if (!owner) throw notFound();
    }
    return this.view(item, viewerId);
  }

  // ------------------------------------------------------------------ staff (spec 16 AC-19, AC-21)

  /** Default: the pending queue, oldest first, with its total; other statuses newest first. */
  async adminList(
    query: {
      status?: PortfolioStatus;
      userId?: string;
      createdFrom?: string;
      createdTo?: string;
      cursor?: string;
      limit?: number;
    },
    t: Translate,
  ): Promise<S['AdminPortfolioItemPage']> {
    const status = query.status ?? 'pending';
    const dir = status === 'pending' ? 'asc' : 'desc';
    const limit = query.limit ?? 50;
    const where: Prisma.PortfolioItemWhereInput = {
      status,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
              ...(query.createdTo ? { lt: new Date(query.createdTo) } : {}),
            },
          }
        : {}),
    };
    const [rows, totalCount] = await Promise.all([
      this.prisma.portfolioItem.findMany({
        where: { AND: [where, afterCursor(decodeCursor(query.cursor, t), dir)] },
        include: WITH_IMAGES,
        orderBy: [{ createdAt: dir }, { id: dir }],
        take: limit + 1,
      }),
      this.prisma.portfolioItem.count({ where }),
    ]);
    const { data, nextCursor } = page(rows, limit);
    return { data: await this.adminViews(data), nextCursor, totalCount };
  }

  async adminGet(itemId: string): Promise<S['AdminPortfolioItem']> {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: WITH_IMAGES,
    });
    if (!item) throw notFound();
    return (await this.adminViews([item]))[0]!;
  }

  /** AC-26: pending → active; EV-15 to the owner. */
  async approve(
    itemId: string,
    note: string | null,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminPortfolioItem']> {
    const item = await this.pendingDecision(itemId, staffId, ctx, {
      action: 'portfolio.approve',
      event: 'EV-15',
      reason: note?.trim() || null,
      data: (before, now) => ({ status: 'active', publishedAt: before.publishedAt ?? now }),
    });
    return (await this.adminViews([item]))[0]!;
  }

  /** AC-42: pending → rejected with the reason shown to the owner; EV-126 to the owner. */
  async reject(
    itemId: string,
    reasonInput: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminPortfolioItem']> {
    const reason = reasonInput.trim();
    if (!reason) throw invalid(ctx.t, 'reason', 'required', 't_validator_required');
    const item = await this.pendingDecision(itemId, staffId, ctx, {
      action: 'portfolio.reject',
      event: 'EV-126',
      reason,
      data: (_, now) => ({ status: 'rejected', rejectionReason: reason, rejectedAt: now }),
    });
    return (await this.adminViews([item]))[0]!;
  }

  /** First decision wins: compare-and-set on `pending` (409 `t_item_already_decided` otherwise). */
  private async pendingDecision(
    itemId: string,
    staffId: string,
    ctx: RequestContext,
    d: {
      action: 'portfolio.approve' | 'portfolio.reject';
      event: 'EV-15' | 'EV-126';
      reason: string | null;
      data: (before: PortfolioItem, now: Date) => Prisma.PortfolioItemUpdateManyMutationInput;
    },
  ): Promise<Item> {
    const before = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!before) throw notFound();
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const moved = await tx.portfolioItem.updateMany({
        where: { id: itemId, status: 'pending', updatedAt: before.updatedAt },
        data: { ...d.data(before, now), reviewedByStaffId: staffId, reviewedAt: now },
      });
      if (moved.count !== 1) {
        throw new ApiException(409, 'STATE_CONFLICT', 't_item_already_decided', {
          currentState: (await tx.portfolioItem.findUnique({ where: { id: itemId } }))?.status,
        });
      }
      const item = await tx.portfolioItem.findUniqueOrThrow({
        where: { id: itemId },
        include: WITH_IMAGES,
      });
      await this.outbox.add(
        d.event,
        { type: 'portfolio_item', id: item.id },
        {
          userId: item.userId,
          params: {
            title: item.title,
            ...(d.event === 'EV-126' ? { reason: d.reason! } : {}),
          },
        },
        tx,
      );
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'portfolio.moderate',
          action: d.action,
          targetType: 'portfolio_item',
          targetId: item.id,
          before: { status: before.status },
          after: { userId: item.userId, status: item.status, title: item.title },
          reason: d.reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
      return item;
    });
  }

  /** Spec 16 AC-21: deletes a pending, published or rejected item and its files; the reason is audited. */
  async adminRemove(
    itemId: string,
    reasonInput: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const reason = reasonInput.trim();
    if (!reason) throw invalid(ctx.t, 'reason', 'required', 't_validator_required');
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: WITH_IMAGES,
    });
    if (!item) throw notFound();
    await this.prisma.$transaction(async (tx) => {
      const gone = await tx.portfolioItem.deleteMany({ where: { id: item.id } });
      if (gone.count !== 1) throw notFound();
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'portfolio.moderate',
          action: 'portfolio.remove',
          targetType: 'portfolio_item',
          targetId: item.id,
          before: { userId: item.userId, status: item.status, title: item.title },
          reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
    await this.purge(fileIdsOf(item));
  }

  // ------------------------------------------------------------------ mapping

  private async fileMap(ids: string[]): Promise<Map<string, FileRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.file.findMany({ where: { id: { in: [...new Set(ids)] } } });
    return new Map(rows.map((f) => [f.id, f]));
  }

  private image(files: Map<string, FileRow>, id: string): S['ImageVariants'] | null {
    const f = files.get(id);
    return f ? imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL) : null;
  }

  /** `rejectionReason`/`rejectedAt` only for the owner (`viewerId`) and staff (`null` + `staff`). */
  private async views(
    items: Item[],
    viewerId: string | null,
    staff = false,
  ): Promise<S['PortfolioItem'][]> {
    const [files, owners] = await Promise.all([
      this.fileMap(items.flatMap(fileIdsOf)),
      this.summaries.many(items.map((i) => i.userId)),
    ]);
    return items.map((i) => {
      const isOwn = i.userId === viewerId;
      const thumbnail = this.image(files, i.thumbnailFileId);
      if (!thumbnail) {
        // Never expected: files are checked `ready` on save. Fail loudly rather than break the contract.
        throw new Error(`portfolio item ${i.id}: thumbnail ${i.thumbnailFileId} has no variants`);
      }
      return {
        id: i.id,
        uid: i.uid,
        slug: i.slug,
        title: i.title,
        description: i.description,
        projectUrl: i.projectUrl,
        videoUrl: i.videoUrl,
        thumbnail,
        images: i.images.flatMap((img) => this.image(files, img.fileId) ?? []),
        status: i.status,
        rejectionReason: isOwn || staff ? i.rejectionReason : null,
        rejectedAt: isOwn || staff ? (i.rejectedAt?.toISOString() ?? null) : null,
        owner: owners.get(i.userId)!,
        isOwn,
        publishedAt: i.publishedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      };
    });
  }

  private async view(item: Item, viewerId: string | null): Promise<S['PortfolioItem']> {
    return (await this.views([item], viewerId))[0]!;
  }

  private async adminViews(items: Item[]): Promise<S['AdminPortfolioItem'][]> {
    const views = await this.views(items, null, true);
    const staffIds = [...new Set(items.flatMap((i) => i.reviewedByStaffId ?? []))];
    const staff = staffIds.length
      ? await this.prisma.staff.findMany({ where: { id: { in: staffIds } } })
      : [];
    const owners = new Map<string, S['ModerationOwnerSummary']>();
    for (const userId of new Set(items.map((i) => i.userId))) {
      owners.set(userId, await this.summaries.owner(userId, await this.earlierRejections(userId)));
    }
    return items.map((i, n) => {
      const s = staff.find((x) => x.id === i.reviewedByStaffId);
      return {
        item: views[n]!,
        owner: owners.get(i.userId)!,
        decidedBy: s ? { id: s.id, username: s.username, fullName: s.fullName } : null,
        decidedAt: i.reviewedAt?.toISOString() ?? null,
      };
    });
  }

  /** Staff rejections of this user's portfolio items so far (the audit log keeps them after an edit). */
  private earlierRejections(userId: string): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        action: 'portfolio.reject',
        targetType: 'portfolio_item',
        after: { path: ['userId'], equals: userId },
      },
    });
  }
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    return Boolean(new URL(value).host);
  } catch {
    return false;
  }
}
