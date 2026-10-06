// ID verification (spec 02 AC-36…AC-40, R-P8, EC-8; spec 16 AC-19, AC-27; ROADMAP 4.1.13): the user's submit and
// Verification centre state, and the staff queue (approve, decline with a reason, audited file views).
// One pending or verified verification per user (partial unique index `kyc_verifications_active_uk`); after a
// decline the user submits again without limit. Legacy deleted the declined row on "send files again"
// (`VerificationComponent.php:376-393`); here a new row is created and the declined one stays for staff.
// Files are the caller's own `ready` `kyc_document` uploads (private bucket `kyc`, ADR-009 §2).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import {
  Prisma,
  type File as FileRow,
  type KycDocumentType,
  type KycStatus,
  type KycVerification,
} from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { afterCursor, decodeCursor, page } from '../../platform/pagination';
import { SettingsService } from '../../platform/settings/settings.service';
import type { RequestContext } from '../auth/request-context';
import { FileAttachments, FilesService } from '../files/files.service';
import { KycProviders } from './kyc-provider';
import { UserSummaries } from './user-summaries';

type S = components['schemas'];
type Translate = RequestContext['t'];

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
const invalid = (t: Translate, field: string, code: string, key: string) =>
  new ApiException(400, 'VALIDATION_FAILED', key, {
    fields: [{ field, code, message: t(key), messageKey: key }],
  });

/** Front, back (not for passports) and selfie. */
const fileIdsOf = (v: KycVerification) => [
  v.frontFileId,
  ...(v.backFileId ? [v.backFileId] : []),
  v.selfieFileId,
];

/** AC-38: a pending or verified verification blocks a new one. */
const active = (status: KycStatus) => status === 'pending' || status === 'verified';
const alreadyActive = (status: KycStatus) =>
  new ApiException(
    409,
    'STATE_CONFLICT',
    status === 'verified' ? 't_verified_account' : 't_kyc_status_pending',
    { currentState: status },
  );

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly files: FilesService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly summaries: UserSummaries,
    private readonly providers: KycProviders,
    attachmentChecks: FileAttachments,
  ) {
    // A document photo cannot be deleted through deleteFile (409) once it belongs to a verification.
    attachmentChecks.register(
      async (file) => file.purpose === 'kyc_document' && (await this.isUsed(file.id)),
    );
  }

  private async isUsed(fileId: string): Promise<boolean> {
    const n = await this.prisma.kycVerification.count({
      where: { OR: [{ frontFileId: fileId }, { backFileId: fileId }, { selfieFileId: fileId }] },
    });
    return n > 0;
  }

  // ------------------------------------------------------------------ user (AC-36, AC-38, AC-40)

  async create(
    userId: string,
    input: S['KycVerificationCreateRequest'],
    ctx: RequestContext,
  ): Promise<S['KycVerification']> {
    const backFileId = input.backFileId ?? null;
    // Passports have one side; ID cards and driver's licences two (legacy Doc*Validator).
    if ((input.documentType === 'passport') !== (backFileId === null)) {
      throw invalid(ctx.t, 'backFileId', 'document_type', 't_please_select_a_valid_document_type');
    }
    const latest = await this.latest(userId);
    if (latest && active(latest.status)) throw alreadyActive(latest.status);
    await this.checkFiles(userId, [input.frontFileId, backFileId, input.selfieFileId]);

    const provider = this.providers.get(await this.settings.get('S-122'));
    // S-100 is read before the transaction (a settings read inside it would wait for a second connection).
    const admins = await this.settings.get('S-100');
    let created: KycVerification;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.kycVerification.create({
          data: {
            userId,
            documentType: input.documentType,
            frontFileId: input.frontFileId,
            backFileId,
            selfieFileId: input.selfieFileId,
            provider: provider.name,
          },
        });
        // EV-16 `Admin/NewIdVerificationPending` to every S-100 address (legacy: the first admin only).
        if (admins.length) {
          await this.outbox.add(
            'EV-16',
            { type: 'kyc_verification', id: row.id },
            { to: [...admins], locale: 'ka', params: {} },
            tx,
          );
        }
        await provider.submitted(row, tx);
        return row;
      });
    } catch (e) {
      // A parallel submit won the race for the one active verification.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw alreadyActive((await this.latest(userId))?.status ?? 'pending');
      }
      throw e;
    }
    return this.view(created);
  }

  /** Own ready `kyc_document` files, three different ones, not part of an earlier verification. */
  private async checkFiles(userId: string, ids: (string | null)[]): Promise<void> {
    const wanted = ids.filter((id): id is string => id !== null);
    const rows = await this.prisma.file.findMany({ where: { id: { in: wanted } } });
    for (const id of wanted) {
      const f = rows.find((r) => r.id === id);
      if (
        !f ||
        f.ownerUserId !== userId ||
        f.purpose !== 'kyc_document' ||
        f.status === 'deleted' ||
        wanted.indexOf(id) !== wanted.lastIndexOf(id) ||
        (await this.isUsed(id))
      ) {
        throw new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_file_not_found');
      }
      if (f.status !== 'ready') throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
    }
  }

  /** The Verification centre (AC-37, AC-38): the latest verification and whether a new one may be sent. */
  async overview(userId: string): Promise<S['KycOverview']> {
    const latest = await this.latest(userId);
    return {
      status: latest?.status ?? 'none',
      verification: latest ? await this.view(latest) : null,
      canSubmit: !latest || !active(latest.status),
    };
  }

  private latest(userId: string): Promise<KycVerification | null> {
    return this.prisma.kycVerification.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  // ------------------------------------------------------------------ staff (spec 16 AC-19, AC-27, AC-31)

  /** Default: the pending queue, oldest first, with its total; other statuses newest first. No file URLs. */
  async adminList(
    query: {
      status?: KycStatus;
      documentType?: KycDocumentType;
      userId?: string;
      createdFrom?: string;
      createdTo?: string;
      cursor?: string;
      limit?: number;
    },
    t: Translate,
  ): Promise<S['AdminKycVerificationPage']> {
    const status = query.status ?? 'pending';
    const dir = status === 'pending' ? 'asc' : 'desc';
    const limit = query.limit ?? 50;
    const where: Prisma.KycVerificationWhereInput = {
      status,
      ...(query.documentType ? { documentType: query.documentType } : {}),
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
      this.prisma.kycVerification.findMany({
        where: { AND: [where, afterCursor(decodeCursor(query.cursor, t), dir)] },
        orderBy: [{ createdAt: dir }, { id: dir }],
        take: limit + 1,
      }),
      this.prisma.kycVerification.count({ where }),
    ]);
    const { data, nextCursor } = page(rows, limit);
    return { data: await this.adminViews(data), nextCursor, totalCount };
  }

  async adminGet(kycId: string): Promise<S['AdminKycVerification']> {
    const row = await this.prisma.kycVerification.findUnique({ where: { id: kycId } });
    if (!row) throw notFound();
    return (await this.adminViews([row]))[0]!;
  }

  /** AC-37: pending → verified ("ID verified" badge via `UserSummary.isIdVerified`); EV-17 to the user. */
  approve(
    kycId: string,
    note: string | null,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminKycVerification']> {
    return this.decide(kycId, staffId, ctx, {
      status: 'verified',
      action: 'kyc.approve',
      event: 'EV-17',
      reason: note?.trim() || null,
    });
  }

  /** AC-37: pending → declined with the reason shown to the user; EV-18; the user may send again (EC-8). */
  decline(
    kycId: string,
    reasonInput: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminKycVerification']> {
    const reason = reasonInput.trim();
    if (!reason) throw invalid(ctx.t, 'reason', 'required', 't_validator_required');
    return this.decide(kycId, staffId, ctx, {
      status: 'declined',
      action: 'kyc.decline',
      event: 'EV-18',
      reason,
    });
  }

  /** First decision wins: compare-and-set on `pending` (409 `t_item_already_decided` otherwise). */
  private async decide(
    kycId: string,
    staffId: string,
    ctx: RequestContext,
    d: {
      status: 'verified' | 'declined';
      action: 'kyc.approve' | 'kyc.decline';
      event: 'EV-17' | 'EV-18';
      reason: string | null;
    },
  ): Promise<S['AdminKycVerification']> {
    const before = await this.prisma.kycVerification.findUnique({ where: { id: kycId } });
    if (!before) throw notFound();
    const row = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.kycVerification.updateMany({
        where: { id: kycId, status: 'pending' },
        data: {
          status: d.status,
          declineReason: d.status === 'declined' ? d.reason : null,
          reviewedByStaffId: staffId,
          reviewedAt: new Date(),
        },
      });
      if (moved.count !== 1) {
        throw new ApiException(409, 'STATE_CONFLICT', 't_item_already_decided', {
          currentState: (await tx.kycVerification.findUnique({ where: { id: kycId } }))?.status,
        });
      }
      const after = await tx.kycVerification.findUniqueOrThrow({ where: { id: kycId } });
      // The payload carries the reason for the in-app/push channels of slice 14; the email keeps the
      // legacy text (`VerificationDeclined.php`), the reason shows in the Verification centre.
      await this.outbox.add(
        d.event,
        { type: 'kyc_verification', id: kycId },
        {
          userId: after.userId,
          params: d.event === 'EV-18' ? { reason: d.reason! } : {},
        },
        tx,
      );
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'kyc.review',
          action: d.action,
          targetType: 'kyc_verification',
          targetId: kycId,
          before: { status: before.status },
          after: { userId: after.userId, status: after.status },
          reason: d.reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
      return after;
    });
    return (await this.adminViews([row]))[0]!;
  }

  /**
   * adminGetKycFileDownload (AC-39, spec 16 AC-27): only a file of this verification (else 404), a presigned GET
   * of 2 minutes from the `kyc` bucket; every view is audited (spec 16 AC-14).
   */
  async fileDownload(
    kycId: string,
    fileId: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['SignedUrl']> {
    const row = await this.prisma.kycVerification.findUnique({ where: { id: kycId } });
    if (!row || !fileIdsOf(row).includes(fileId)) throw notFound();
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'ready') throw notFound();
    const signed = await this.files.signDownload(file);
    await this.audit.write({
      actorStaffId: staffId,
      permissionCode: 'kyc.review',
      action: 'kyc.file_view',
      targetType: 'kyc_verification',
      targetId: kycId,
      after: { userId: row.userId, fileId },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return signed;
  }

  // ------------------------------------------------------------------ mapping

  private async fileMap(rows: KycVerification[]): Promise<Map<string, FileRow>> {
    const ids = [...new Set(rows.flatMap(fileIdsOf))];
    if (ids.length === 0) return new Map();
    const files = await this.prisma.file.findMany({ where: { id: { in: ids } } });
    return new Map(files.map((f) => [f.id, f]));
  }

  private toView(v: KycVerification, files: Map<string, FileRow>): S['KycVerification'] {
    const attachment = (id: string): S['Attachment'] => {
      const f = files.get(id);
      if (!f) throw new Error(`kyc verification ${v.id}: file ${id} not found`);
      return {
        fileId: f.id,
        fileName: f.originalName,
        contentType: f.detectedType ?? f.declaredType,
        sizeBytes: Number(f.sizeBytes),
      };
    };
    return {
      id: v.id,
      documentType: v.documentType,
      status: v.status,
      provider: v.provider,
      frontFile: attachment(v.frontFileId),
      backFile: v.backFileId ? attachment(v.backFileId) : null,
      selfieFile: attachment(v.selfieFileId),
      declineReason: v.declineReason,
      createdAt: v.createdAt.toISOString(),
      reviewedAt: v.reviewedAt?.toISOString() ?? null,
    };
  }

  private async view(v: KycVerification): Promise<S['KycVerification']> {
    return this.toView(v, await this.fileMap([v]));
  }

  private async adminViews(rows: KycVerification[]): Promise<S['AdminKycVerification'][]> {
    const staffIds = [...new Set(rows.flatMap((r) => r.reviewedByStaffId ?? []))];
    const [files, staff] = await Promise.all([
      this.fileMap(rows),
      staffIds.length
        ? this.prisma.staff.findMany({ where: { id: { in: staffIds } } })
        : Promise.resolve([]),
    ]);
    const owners = new Map<string, S['ModerationOwnerSummary']>();
    for (const userId of new Set(rows.map((r) => r.userId))) {
      const declines = await this.prisma.kycVerification.count({
        where: { userId, status: 'declined' },
      });
      owners.set(userId, await this.summaries.owner(userId, declines));
    }
    return rows.map((r) => {
      const s = staff.find((x) => x.id === r.reviewedByStaffId);
      return {
        verification: this.toView(r, files),
        owner: owners.get(r.userId)!,
        reviewedBy: s ? { id: s.id, username: s.username, fullName: s.fullName } : null,
      };
    });
  }
}
