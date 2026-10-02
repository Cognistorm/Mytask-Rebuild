// Files F0 (ADR-009 §3–§4, ROADMAP 4.1.3, 4.1.5): createFileUpload, getFile, deleteFile, completeFileUpload,
// getFileDownload, and the staff side adminCreateFileUpload, adminGetFile, adminCompleteFileUpload.
// The scan pipeline that turns `scanning` into `ready`/`rejected` is the worker's job (scan/, 4.1.4).
import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { components, Locale } from '@mytask/types';
import type { File as FileRow } from '../../generated/prisma/client';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { translate } from '../../platform/errors/messages';
import { RedisService } from '../../platform/redis/redis.module';
import { SettingsService } from '../../platform/settings/settings.service';
import { AuditService } from '../../platform/audit/audit.service';
import { ObjectStorage } from '../../platform/storage/storage';
import type { StaffAuthState } from '../auth/auth.guard';
import type { RequestContext } from '../auth/request-context';
import {
  MB,
  MIME_BY_EXTENSION,
  PURPOSE_POLICIES,
  extensionOf,
  type PurposePolicy,
} from './purposes';

type S = components['schemas'];

/** Presigned POST lifetime ("short expiry", ADR-009 §3.2). */
export const UPLOAD_EXPIRES_SECONDS = 15 * 60;
/** Contract `x-rate-limit` of createFileUpload: 60 requests / 10 min per user. */
export const UPLOADS_PER_WINDOW = 60;
export const UPLOAD_WINDOW_SECONDS = 10 * 60;
/** Presigned GET lifetime: about 5 minutes; KYC 2 minutes (ADR-009 §2, §4). */
export const DOWNLOAD_EXPIRES_SECONDS = 5 * 60;
export const KYC_DOWNLOAD_EXPIRES_SECONDS = 2 * 60;

/** Who uploads a file: a user (`owner_user_id`) or a staff member (`owner_staff_id`). */
type Uploader = { userId: string } | { staffId: string };

/** Answers whether a file is referenced by a resource (avatar, portfolio, KYC, …). */
export type FileAttachmentCheck = (file: FileRow) => Promise<boolean>;

/**
 * Slices that attach files register a check here (e.g. profiles: `user_profiles.avatar_file_id`), so
 * `deleteFile` refuses attached files with 409 without this module knowing every table.
 */
@Injectable()
export class FileAttachments {
  private readonly checks: FileAttachmentCheck[] = [];

  register(check: FileAttachmentCheck): void {
    this.checks.push(check);
  }

  async isAttached(file: FileRow): Promise<boolean> {
    for (const check of this.checks) if (await check(file)) return true;
    return false;
  }
}

/**
 * Answers whether a user other than the owner may download a file (getFileDownload): escrow parties for
 * deliveries and requirement files (spec 06), conversation participants for chat attachments (spec 08), …
 * Slices register their rule here; without one only the owner may download.
 */
export type FileDownloadCheck = (file: FileRow, userId: string) => Promise<boolean>;

@Injectable()
export class FileDownloadAccess {
  private readonly checks: FileDownloadCheck[] = [];

  register(check: FileDownloadCheck): void {
    this.checks.push(check);
  }

  async mayDownload(file: FileRow, userId: string): Promise<boolean> {
    for (const check of this.checks) if (await check(file, userId)) return true;
    return false;
  }
}

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_file_not_found');
const restricted = () => new ApiException(403, 'ACCOUNT_RESTRICTED', 't_account_restricted_notice');

/** File names are shown and sent back in Content-Disposition: no paths, no control characters. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return base.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'file';
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger('Files');

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly redis: RedisService,
    private readonly storage: ObjectStorage,
    private readonly attachments: FileAttachments,
    private readonly downloadAccess: FileDownloadAccess,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    body: S['FileUploadRequest'],
    locale: Locale,
  ): Promise<S['FileUploadTicket']> {
    await this.throttle(userId);
    // Every purpose and permission check runs before a presigned POST exists (ADR-009 §3, P2-B5 item 12).
    if (body.purpose !== 'appeal_file' && (await this.isRestricted(userId))) throw restricted();
    const policy = PURPOSE_POLICIES[body.purpose];
    if (policy?.uploader.kind !== 'user') throw new ApiException(403, 'FORBIDDEN', 't_forbidden');
    return this.slot({ userId }, policy, body, locale);
  }

  /**
   * adminCreateFileUpload: staff purposes only (else 422 FILE_PURPOSE_MISMATCH); exactly one permission is
   * checked, the one of the purpose (contract `x-permission.permissionBy`, spec 16 AC-9).
   */
  async adminCreate(
    staff: StaffAuthState,
    body: S['FileUploadRequest'],
    ctx: RequestContext,
  ): Promise<S['FileUploadTicket']> {
    const policy = PURPOSE_POLICIES[body.purpose];
    if (policy?.uploader.kind !== 'staff') {
      throw new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_forbidden');
    }
    const { permission } = policy.uploader;
    if (!staff.isSuperAdmin && !staff.permissions.has(permission)) {
      throw new ApiException(403, 'FORBIDDEN', 't_forbidden', { permission });
    }
    const ticket = await this.slot({ staffId: staff.staffId }, policy, body, ctx.locale);
    await this.audit.write({
      actorStaffId: staff.staffId,
      permissionCode: permission,
      action: 'file.upload',
      targetType: 'file',
      targetId: ticket.file.id,
      after: { purpose: body.purpose, fileName: ticket.file.fileName, sizeBytes: body.sizeBytes },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return ticket;
  }

  /** Type/size checks, presigned POST, `pending` row: the same for users and staff. */
  private async slot(
    uploader: Uploader,
    policy: PurposePolicy,
    body: S['FileUploadRequest'],
    locale: Locale,
  ): Promise<S['FileUploadTicket']> {
    const limits = await policy.limits(this.settings);
    const fileName = cleanFileName(body.fileName);
    const ext = extensionOf(fileName);
    const contentType = body.contentType.split(';')[0]!.trim().toLowerCase();
    if (!limits.extensions.includes(ext) || !MIME_BY_EXTENSION[ext]?.includes(contentType)) {
      throw new ApiException(
        422,
        'FILE_TYPE_NOT_ALLOWED',
        't_selected_file_extension_is_not_allowed',
      );
    }
    const maxBytes = limits.maxMb * MB;
    if (body.sizeBytes > maxBytes) {
      throw new ApiException(422, 'FILE_TOO_LARGE', 't_selected_file_size_big', {
        limit: limits.maxMb,
        ...(limits.sizeSettingId ? { settingId: limits.sizeSettingId } : {}),
      });
    }

    // Opaque key: nothing user-controlled ends up in storage paths.
    const objectKey = `quarantine/${randomUUID()}`;
    // Signed before the row exists, so an unavailable storage leaves no orphan `pending` row.
    const post = await this.storage.presignedPost({
      bucket: policy.quarantineBucket,
      key: objectKey,
      contentType,
      // The object can never be larger than the size that passed the purpose check.
      maxBytes: body.sizeBytes,
      expiresSeconds: UPLOAD_EXPIRES_SECONDS,
    });
    const row = await this.prisma.file.create({
      data: {
        purpose: body.purpose,
        ...('userId' in uploader
          ? { ownerUserId: uploader.userId }
          : { ownerStaffId: uploader.staffId }),
        bucket: policy.quarantineBucket,
        objectKey,
        originalName: fileName,
        declaredType: contentType,
        sizeBytes: BigInt(body.sizeBytes),
      },
    });
    return {
      file: this.toFile(row, locale),
      upload: {
        url: post.url,
        method: 'POST',
        fields: post.fields,
        expiresAt: post.expiresAt.toISOString(),
      },
    };
  }

  async get(userId: string, fileId: string, locale: Locale): Promise<S['File']> {
    return this.toFile(await this.own(userId, fileId), locale);
  }

  async complete(userId: string, fileId: string, locale: Locale): Promise<S['File']> {
    return this.toFile(await this.queueScan(await this.own(userId, fileId)), locale);
  }

  async adminGet(staffId: string, fileId: string, locale: Locale): Promise<S['File']> {
    return this.toFile(await this.ownStaff(staffId, fileId), locale);
  }

  async adminComplete(staffId: string, fileId: string, ctx: RequestContext): Promise<S['File']> {
    const before = await this.ownStaff(staffId, fileId);
    const file = await this.queueScan(before);
    if (before.status === 'pending') {
      await this.audit.write({
        actorStaffId: staffId,
        action: 'file.upload.complete',
        targetType: 'file',
        targetId: file.id,
        after: { purpose: file.purpose, status: file.status },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return this.toFile(file, ctx.locale);
  }

  /**
   * getFileDownload (ADR-009 §4): the owner, or a user a slice's rule allows (FileDownloadAccess); everyone
   * else 404, never 403. Staff-owned files have no user owner, so only such a rule could open them.
   * A short-lived presigned GET with `Content-Disposition: attachment` and the original name.
   */
  async download(userId: string, fileId: string): Promise<S['SignedUrl']> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status === 'deleted') throw notFound();
    const allowed =
      file.ownerUserId === userId || (await this.downloadAccess.mayDownload(file, userId));
    if (!allowed) throw notFound();
    if (file.status !== 'ready') throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
    return this.signDownload(file);
  }

  /**
   * Presigned GET of a ready file after the caller's own policy check: getFileDownload above, and the staff
   * download operations of each group (e.g. adminGetRestrictionAppealFileDownload), which audit the access.
   */
  async signDownload(file: FileRow): Promise<S['SignedUrl']> {
    const expiresSeconds =
      file.bucket === 'kyc' ? KYC_DOWNLOAD_EXPIRES_SECONDS : DOWNLOAD_EXPIRES_SECONDS;
    const url = await this.storage.presignedGet({
      bucket: file.bucket,
      key: file.objectKey,
      expiresSeconds,
      downloadName: downloadName(file),
    });
    return { url, expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString() };
  }

  /** `pending` → `scanning` once the object exists; any other state is returned as it is (idempotent). */
  private async queueScan(file: FileRow): Promise<FileRow> {
    if (file.status !== 'pending') return file;
    const head = await this.storage.head(file.bucket, file.objectKey);
    if (!head) throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_found');
    // Compare-and-set: two parallel calls queue the scan once. The worker's files-scan sweeper picks up
    // `scanning` files within seconds.
    await this.prisma.file.updateMany({
      where: { id: file.id, status: 'pending' },
      data: { status: 'scanning' },
    });
    return this.prisma.file.findUniqueOrThrow({ where: { id: file.id } });
  }

  async remove(userId: string, fileId: string): Promise<void> {
    let file = await this.own(userId, fileId);
    if (await this.attachments.isAttached(file)) {
      // "This item is still in use and cannot be deleted."
      throw new ApiException(409, 'STATE_CONFLICT', 't_category_in_use', {
        currentState: 'attached',
      });
    }
    // Storage first: a KYC photo the user removed must really be gone; S3 deletes are idempotent on retry.
    // The row is marked deleted only if it is still in the state whose objects were removed: when the
    // worker finished the scan meanwhile (quarantine → final objects), the new objects are removed too.
    for (;;) {
      await this.storage.delete(file.bucket, file.objectKey);
      for (const key of variantKeys(file)) await this.storage.delete('public_media', key);
      const done = await this.prisma.file.updateMany({
        where: { id: file.id, status: file.status, objectKey: file.objectKey },
        data: { status: 'deleted', deletedAt: new Date() },
      });
      if (done.count) break;
      const now = await this.prisma.file.findUnique({ where: { id: file.id } });
      if (!now || now.status === 'deleted') break;
      file = now;
    }
    this.logger.log({ fileId: file.id, purpose: file.purpose }, 'file deleted by owner');
  }

  /** Own, not deleted file; others get 404 (never 403, files cannot be probed). Restricted: appeal files only. */
  private async own(userId: string, fileId: string): Promise<FileRow> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.ownerUserId !== userId || file.status === 'deleted') throw notFound();
    if (file.purpose !== 'appeal_file' && (await this.isRestricted(userId))) throw restricted();
    return file;
  }

  /** File uploaded by this staff member, not deleted; others get 404 (contract adminGetFile ownership). */
  private async ownStaff(staffId: string, fileId: string): Promise<FileRow> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.ownerStaffId !== staffId || file.status === 'deleted') throw notFound();
    return file;
  }

  private async isRestricted(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isRestricted: true },
    });
    return user?.isRestricted ?? false;
  }

  private async throttle(userId: string): Promise<void> {
    const window = Math.floor(Date.now() / 1000 / UPLOAD_WINDOW_SECONDS);
    const key = `files:upload:${userId}:${window}`;
    const n = await this.redis.client.incr(key);
    if (n === 1) await this.redis.client.expire(key, UPLOAD_WINDOW_SECONDS + 10);
    if (n > UPLOADS_PER_WINDOW) {
      const retryAfterSeconds =
        UPLOAD_WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % UPLOAD_WINDOW_SECONDS);
      throw new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', { retryAfterSeconds });
    }
  }

  toFile(row: FileRow, locale: Locale): S['File'] {
    return {
      id: row.id,
      purpose: row.purpose as S['FilePurpose'],
      status: row.status,
      fileName: row.originalName,
      contentType: row.detectedType ?? row.declaredType,
      sizeBytes: Number(row.sizeBytes),
      // Stored as an i18n key by the worker (scan/file-scan.service.ts REJECT_REASONS).
      rejectReason:
        row.status === 'rejected' && row.rejectReason ? translate(row.rejectReason, locale) : null,
      image: this.image(row),
      createdAt: row.createdAt.toISOString(),
      readyAt: row.readyAt?.toISOString() ?? null,
    };
  }

  /** CDN variants of a ready public image (ADR-009 §2); null otherwise. */
  private image(row: FileRow): S['ImageVariants'] | null {
    const v = row.variants as { thumb?: string; medium?: string; large?: string } | null;
    const base = this.env.PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, '');
    if (row.status !== 'ready' || row.bucket !== 'public_media' || !base) return null;
    if (!v?.thumb || !v.medium || !v.large) return null;
    return {
      fileId: row.id,
      thumb: `${base}/${v.thumb}`,
      medium: `${base}/${v.medium}`,
      large: `${base}/${v.large}`,
      width: row.width,
      height: row.height,
    };
  }
}

/** Public images are stored as WebP variants: the download name says so, the rest keeps the original name. */
function downloadName(file: FileRow): string {
  if (file.bucket !== 'public_media') return file.originalName;
  const dot = file.originalName.lastIndexOf('.');
  return `${dot > 0 ? file.originalName.slice(0, dot) : file.originalName}.webp`;
}

function variantKeys(file: FileRow): string[] {
  const v = file.variants as Record<string, unknown> | null;
  if (!v) return [];
  return Object.values(v).filter((k): k is string => typeof k === 'string' && k !== file.objectKey);
}
