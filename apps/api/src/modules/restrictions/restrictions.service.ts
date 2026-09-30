// Restrictions and appeals (spec 01 AC-19, AC-46…AC-50, R-A8; spec 16 AC-19, AC-29, AC-32).
// `users.is_restricted` is a cached flag, recomputed in the same transaction as every change (data-model §3.A).
// Appeal FILES wait for the files foundation (F0, slice 02) and the Owner's answer on S-093 (Q-154).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type {
  Prisma,
  RestrictionAppeal,
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

type S = components['schemas'];
type Tx = Prisma.TransactionClient;
type Row = UserRestriction & { appeal: RestrictionAppeal | null };
const ACTIVE: RestrictionStatus[] = ['pending', 'submitted', 'rejected'];

const appealView = (a: RestrictionAppeal | null): S['RestrictionAppeal'] | null =>
  a && {
    id: a.id,
    restrictionId: a.restrictionId,
    message: a.message,
    files: [],
    createdAt: a.createdAt.toISOString(),
  };

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
  ) {}

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
      include: { appeal: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map((r) => this.userView(r)), nextCursor: null };
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
    const fileIds = input.fileIds ?? [];
    if (restriction.filesRequired && fileIds.length === 0) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_required', {
        fields: [
          {
            field: 'fileIds',
            code: 'required',
            message: ctx.t('t_validator_required'),
            messageKey: 't_validator_required',
          },
        ],
      });
    }
    if (fileIds.length > 0) {
      // No `appeal_file` can exist before the files foundation (F0, slice 02) and the S-093 types (Q-154):
      // any referenced file is unknown, so it is never ready.
      throw new ApiException(422, 'FILE_NOT_READY', 't_toast_something_went_wrong');
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
        data: { restrictionId: restriction.id, message: input.message.trim() },
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
        include: { appeal: true },
      });
    });
    return this.userView(updated);
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
      include: { appeal: true },
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
        include: { appeal: true },
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
      include: { restriction: { include: { appeal: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const views = await this.adminViews(appeals.map((a) => a.restriction));
    const data = await Promise.all(
      appeals.map(async (a, i) => ({
        id: a.id,
        restriction: views[i]!,
        owner: await this.ownerSummary(a.restriction.userId),
        message: a.message,
        files: [],
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
      include: { appeal: true },
    });
    return {
      id: appeal.id,
      restriction: (await this.adminViews([r]))[0]!,
      owner: await this.ownerSummary(userId),
      message: appeal.message,
      files: [],
      createdAt: appeal.createdAt.toISOString(),
    };
  }

  // ------------------------------------------------------------------ mapping

  private userView(r: Row): S['Restriction'] {
    return {
      id: r.id,
      message: r.message,
      filesRequired: r.filesRequired,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      appeal: appealView(r.appeal),
      canAppeal: r.status === 'pending' && r.deletedAt === null,
    };
  }

  private async adminViews(rows: Row[]): Promise<S['AdminRestriction'][]> {
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
      appeal: appealView(r.appeal),
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
