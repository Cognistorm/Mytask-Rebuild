// Restrictions and appeals (spec 01 AC-19, AC-46…AC-50, R-A8; spec 16 AC-19, AC-29, AC-32).
// `users.is_restricted` is a cached flag, recomputed in the same transaction as every change (data-model §3.A).
// Appeal files (ROADMAP 4.1.6a): ready `appeal_file` uploads of the user, 1 to S-091 when required (Q-154 types
// and size are checked at upload, S-092/S-093); private, staff download them audited (R-A8).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type {
  File as FileRow,
  Prisma,
  RestrictionAppeal,
  RestrictionAppealFile,
  RestrictionStatus,
  User,
  UserRestriction,
} from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import type { RequestContext } from '../auth/request-context';
import { FileAttachments, FilesService } from '../files/files.service';

type S = components['schemas'];
type Tx = Prisma.TransactionClient;
type Appeal = RestrictionAppeal & { files: RestrictionAppealFile[] };
type Row = UserRestriction & { appeal: Appeal | null };
type Files = Map<string, FileRow>;
const ACTIVE: RestrictionStatus[] = ['pending', 'submitted', 'rejected'];
/** Restriction with its appeal and the appeal's files in the user's order. */
const WITH_APPEAL = {
  appeal: { include: { files: { orderBy: { position: 'asc' } } } },
} as const satisfies Prisma.UserRestrictionInclude;

const attachments = (a: Appeal, files: Files): S['Attachment'][] =>
  a.files.flatMap((af) => {
    const f = files.get(af.fileId);
    return f
      ? [
          {
            fileId: f.id,
            fileName: f.originalName,
            contentType: f.detectedType ?? f.declaredType,
            sizeBytes: Number(f.sizeBytes),
          },
        ]
      : [];
  });

const appealView = (a: Appeal | null, files: Files): S['RestrictionAppeal'] | null =>
  a && {
    id: a.id,
    restrictionId: a.restrictionId,
    message: a.message,
    files: attachments(a, files),
    createdAt: a.createdAt.toISOString(),
  };

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

const userSummary = (u: User): S['UserSummary'] => ({
  id: u.id,
  username: u.username,
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: false,
  countryCode: null,
  isDeleted: u.deletedAt !== null,
});

@Injectable()
export class RestrictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
    attachmentChecks: FileAttachments,
  ) {
    // An appeal file stays as long as its appeal: deleteFile answers 409 for it.
    attachmentChecks.register(
      async (file) =>
        file.purpose === 'appeal_file' &&
        (await this.prisma.restrictionAppealFile.count({ where: { fileId: file.id } })) > 0,
    );
  }

  /** The files rows behind the appeals' attachments. */
  private async fileMap(appeals: (Appeal | null)[]): Promise<Files> {
    const ids = appeals.flatMap((a) => a?.files.map((f) => f.fileId) ?? []);
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.file.findMany({ where: { id: { in: ids } } });
    return new Map(rows.map((f) => [f.id, f]));
  }

  /** The cached flag = an open restriction exists (pending, submitted or rejected, not deleted). */
  private async recompute(tx: Tx, userId: string): Promise<void> {
    const open = await tx.userRestriction.count({
      where: { userId, deletedAt: null, status: { in: ACTIVE } },
    });
    await tx.user.update({ where: { id: userId }, data: { isRestricted: open > 0 } });
  }

  // ------------------------------------------------------------------ user side

  async listMine(userId: string): Promise<S['RestrictionPage']> {
    const rows = await this.prisma.userRestriction.findMany({
      where: { userId, deletedAt: null },
      include: WITH_APPEAL,
      orderBy: { createdAt: 'desc' },
    });
    const files = await this.fileMap(rows.map((r) => r.appeal));
    return { data: rows.map((r) => this.userView(r, files)), nextCursor: null };
  }

  async appeal(userId: string, input: S['RestrictionAppealCreateRequest'], ctx: RequestContext) {
    const admins = await this.settings.get('S-100');
    const restriction = await this.prisma.userRestriction.findFirst({
      where: { id: input.restrictionId, userId, deletedAt: null },
    });
    if (!restriction) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    // One appeal per restriction; a rejected one cannot be appealed again (AC-49).
    if (restriction.status !== 'pending') {
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong', {
        currentState: restriction.status,
      });
    }
    const fileIds = [...new Set(input.fileIds ?? [])];
    const invalid = (code: string, messageKey: string, params?: Record<string, number>) =>
      new ApiException(400, 'VALIDATION_FAILED', messageKey, {
        fields: [{ field: 'fileIds', code, message: ctx.t(messageKey, params), messageKey }],
      });
    if (restriction.filesRequired && fileIds.length === 0) {
      throw invalid('required', 't_validator_required');
    }
    // Legacy saved files sent without the flag too; the S-091 count applies either way.
    const maxFiles = await this.settings.get('S-091');
    if (fileIds.length > maxFiles) {
      throw invalid('max_items', 't_validator_max_array', { max: maxFiles });
    }
    const files = await this.prisma.file.findMany({ where: { id: { in: fileIds } } });
    for (const id of fileIds) {
      const f = files.find((x) => x.id === id);
      // Own `appeal_file` uploads only; types (S-093) and size (S-092) were checked at upload and by the scan.
      if (!f || f.ownerUserId !== userId || f.purpose !== 'appeal_file' || f.status === 'deleted') {
        throw new ApiException(422, 'FILE_PURPOSE_MISMATCH', 't_file_not_found');
      }
      if (f.status !== 'ready') {
        throw new ApiException(422, 'FILE_NOT_READY', 't_file_not_ready');
      }
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const updated = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.userRestriction.updateMany({
        where: { id: restriction.id, status: 'pending' },
        data: { status: 'submitted' },
      });
      if (moved.count !== 1)
        throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
      await tx.restrictionAppeal.create({
        data: {
          restrictionId: restriction.id,
          message: input.message.trim(),
          files: { create: fileIds.map((fileId, position) => ({ fileId, position })) },
        },
      });
      await this.outbox.add(
        'EV-08',
        { type: 'restriction', id: restriction.id },
        {
          to: [...admins],
          locale: 'ka',
          params: { userId, username: user.username, message: input.message.trim() },
        },
        tx,
      );
      return tx.userRestriction.findUniqueOrThrow({
        where: { id: restriction.id },
        include: WITH_APPEAL,
      });
    });
    return this.userView(updated, await this.fileMap([updated.appeal]));
  }

  // ------------------------------------------------------------------ staff side

  async list(filter: {
    userId?: string;
    status?: RestrictionStatus[];
  }): Promise<S['AdminRestrictionPage']> {
    const rows = await this.prisma.userRestriction.findMany({
      where: {
        deletedAt: null,
        ...(filter.userId ? { userId: filter.userId } : {}),
        ...(filter.status?.length ? { status: { in: filter.status } } : {}),
      },
      include: WITH_APPEAL,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { data: await this.adminViews(rows), nextCursor: null };
  }

  async create(input: S['AdminRestrictionCreateRequest'], staffId: string, ctx: RequestContext) {
    const user = await this.prisma.user.findFirst({ where: { id: input.userId, deletedAt: null } });
    if (!user) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    const created = await this.prisma.$transaction(async (tx) => {
      const r = await tx.userRestriction.create({
        data: {
          userId: user.id,
          message: input.message.trim(),
          filesRequired: input.filesRequired,
          createdByStaffId: staffId,
        },
        include: WITH_APPEAL,
      });
      await this.recompute(tx, user.id);
      await this.outbox.add(
        'EV-07',
        { type: 'restriction', id: r.id },
        { userId: user.id, params: { message: r.message } },
        tx,
      );
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'users.restrict',
          action: 'restriction.create',
          targetType: 'user',
          targetId: user.id,
          after: { restrictionId: r.id, filesRequired: r.filesRequired },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
      return r;
    });
    return (await this.adminViews([created]))[0]!;
  }

  async remove(restrictionId: string, staffId: string, ctx: RequestContext): Promise<void> {
    const r = await this.prisma.userRestriction.findFirst({
      where: { id: restrictionId, deletedAt: null },
    });
    if (!r) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    await this.prisma.$transaction(async (tx) => {
      await tx.userRestriction.update({ where: { id: r.id }, data: { deletedAt: new Date() } });
      await this.recompute(tx, r.userId);
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'users.restrict',
          action: 'restriction.delete',
          targetType: 'user',
          targetId: r.userId,
          before: { restrictionId: r.id, status: r.status },
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
  }

  async listAppeals(filter: {
    userId?: string;
    status?: RestrictionStatus[];
  }): Promise<S['AdminRestrictionAppealPage']> {
    const appeals = await this.prisma.restrictionAppeal.findMany({
      where: {
        restriction: {
          deletedAt: null,
          status: { in: filter.status?.length ? filter.status : ['submitted'] },
          ...(filter.userId ? { userId: filter.userId } : {}),
        },
      },
      include: { restriction: { include: WITH_APPEAL } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const views = await this.adminViews(appeals.map((a) => a.restriction));
    const files = await this.fileMap(appeals.map((a) => a.restriction.appeal));
    const data = await Promise.all(
      appeals.map(async (a, i) => ({
        id: a.id,
        restriction: views[i]!,
        owner: await this.ownerSummary(a.restriction.userId),
        message: a.message,
        files: attachments(a.restriction.appeal!, files),
        createdAt: a.createdAt.toISOString(),
      })),
    );
    return { data, nextCursor: null, totalCount: data.length };
  }

  /** AC-48 approve / AC-49 reject. First decision wins (spec 16 AC-19). */
  async decide(
    appealId: string,
    decision: 'approved' | 'rejected',
    reason: string | null,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminRestrictionAppeal']> {
    const appeal = await this.prisma.restrictionAppeal.findUnique({
      where: { id: appealId },
      include: { restriction: true },
    });
    if (!appeal || appeal.restriction.deletedAt)
      throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    const userId = appeal.restriction.userId;
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.userRestriction.updateMany({
        where: { id: appeal.restrictionId, status: 'submitted', deletedAt: null },
        data: {
          status: decision,
          resolvedByStaffId: staffId,
          resolvedAt: new Date(),
          // The rejection reason is shown to the user; an approval note stays in the audit log only.
          decisionReason: decision === 'rejected' ? reason : null,
        },
      });
      if (moved.count !== 1)
        throw new ApiException(409, 'STATE_CONFLICT', 't_item_already_decided');
      await this.recompute(tx, userId);
      await this.outbox.add(
        decision === 'approved' ? 'EV-09' : 'EV-10',
        { type: 'restriction', id: appeal.restrictionId },
        { userId, params: {} },
        tx,
      );
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'users.restrict',
          action:
            decision === 'approved' ? 'restriction_appeal.approve' : 'restriction_appeal.reject',
          targetType: 'user',
          targetId: userId,
          after: { restrictionId: appeal.restrictionId, status: decision },
          reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
    const r = await this.prisma.userRestriction.findUniqueOrThrow({
      where: { id: appeal.restrictionId },
      include: WITH_APPEAL,
    });
    return {
      id: appeal.id,
      restriction: (await this.adminViews([r]))[0]!,
      owner: await this.ownerSummary(userId),
      message: appeal.message,
      files: attachments(r.appeal!, await this.fileMap([r.appeal])),
      createdAt: appeal.createdAt.toISOString(),
    };
  }

  /**
   * adminGetRestrictionAppealFileDownload (spec 16 AC-29, R-A8): only a file of this appeal (else 404), signed
   * like getFileDownload; every access is audited (spec 16 AC-14).
   */
  async fileDownload(
    appealId: string,
    fileId: string,
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['SignedUrl']> {
    const link = await this.prisma.restrictionAppealFile.findUnique({
      where: { appealId_fileId: { appealId, fileId } },
      include: { appeal: { include: { restriction: true } } },
    });
    if (!link || link.appeal.restriction.deletedAt) throw notFound();
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'ready') throw notFound();
    const signed = await this.files.signDownload(file);
    await this.audit.write({
      actorStaffId: staffId,
      permissionCode: 'users.restrict',
      action: 'restriction_appeal.file_view',
      targetType: 'user',
      targetId: link.appeal.restriction.userId,
      after: { appealId, fileId },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return signed;
  }

  // ------------------------------------------------------------------ mapping

  private userView(r: Row, files: Files): S['Restriction'] {
    return {
      id: r.id,
      message: r.message,
      filesRequired: r.filesRequired,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      appeal: appealView(r.appeal, files),
      canAppeal: r.status === 'pending' && r.deletedAt === null,
    };
  }

  private async adminViews(rows: Row[]): Promise<S['AdminRestriction'][]> {
    const files = await this.fileMap(rows.map((r) => r.appeal));
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
    });
    const staffIds = [
      ...new Set(rows.flatMap((r) => [r.createdByStaffId, r.resolvedByStaffId]).filter(Boolean)),
    ] as string[];
    const staff = staffIds.length
      ? await this.prisma.staff.findMany({ where: { id: { in: staffIds } } })
      : [];
    const staffSummary = (id: string | null) => {
      const s = id ? staff.find((x) => x.id === id) : undefined;
      return s ? { id: s.id, username: s.username, fullName: s.fullName } : null;
    };
    return rows.map((r) => ({
      id: r.id,
      user: userSummary(users.find((u) => u.id === r.userId)!),
      message: r.message,
      filesRequired: r.filesRequired,
      status: r.status,
      createdBy: staffSummary(r.createdByStaffId),
      createdAt: r.createdAt.toISOString(),
      resolvedBy: staffSummary(r.resolvedByStaffId),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      appeal: appealView(r.appeal, files),
      decisionReason: r.decisionReason,
    }));
  }

  private async ownerSummary(userId: string): Promise<S['ModerationOwnerSummary']> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const earlier = await this.prisma.userRestriction.count({
      where: { userId, status: 'rejected' },
    });
    return {
      user: userSummary(u),
      status: u.status,
      isRestricted: u.isRestricted,
      isDeleted: u.deletedAt !== null,
      plan: 'standard',
      kycStatus: 'none',
      reportCount: 0,
      earlierRejectionCount: earlier,
    };
  }
}
