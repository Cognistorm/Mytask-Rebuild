// Files F0 part 1 (ADR-009 §3, ROADMAP 4.1.3): createFileUpload, getFile, deleteFile, completeFileUpload.
// The scan pipeline that turns `scanning` into `ready`/`rejected` is the worker's job (scan/, 4.1.4);
// downloads and staff uploads come in 4.1.5.
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
import { ObjectStorage } from '../../platform/storage/storage';
import { MB, MIME_BY_EXTENSION, PURPOSE_POLICIES, extensionOf } from './purposes';

type S = components['schemas'];

/** Presigned POST lifetime ("short expiry", ADR-009 §3.2). */
export const UPLOAD_EXPIRES_SECONDS = 15 * 60;
/** Contract `x-rate-limit` of createFileUpload: 60 requests / 10 min per user. */
export const UPLOADS_PER_WINDOW = 60;
export const UPLOAD_WINDOW_SECONDS = 10 * 60;

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
    if (!policy) throw new ApiException(403, 'FORBIDDEN', 't_forbidden');

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
        ownerUserId: userId,
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
    const file = await this.own(userId, fileId);
    if (file.status !== 'pending') return this.toFile(file, locale); // idempotent
    const head = await this.storage.head(file.bucket, file.objectKey);
    if (!head) throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_found');
    // Compare-and-set: two parallel calls queue the scan once. The worker's files-scan sweeper picks up
    // `scanning` files within seconds.
    await this.prisma.file.updateMany({
      where: { id: file.id, status: 'pending' },
      data: { status: 'scanning' },
    });
    return this.toFile(
      await this.prisma.file.findUniqueOrThrow({ where: { id: file.id } }),
      locale,
    );
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

function variantKeys(file: FileRow): string[] {
  const v = file.variants as Record<string, unknown> | null;
  if (!v) return [];
  return Object.values(v).filter((k): k is string => typeof k === 'string' && k !== file.objectKey);
}
