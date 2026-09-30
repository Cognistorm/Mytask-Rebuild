// Banned IPs of the staff login (spec 01 AC-51/AC-52, P-20) and the staff member's own password (spec 16 AC-6).
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { BannedIp } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { PasswordService } from '../auth/password.service';
import type { RequestContext } from '../auth/request-context';
import { SessionsService } from '../auth/sessions.service';
import { ThrottleService } from '../auth/throttle.service';

type S = components['schemas'];

@Injectable()
export class AdminSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly throttle: ThrottleService,
  ) {}

  async listBans(q?: string): Promise<S['IpBanPage']> {
    const rows = await this.prisma.bannedIp.findMany({
      where: { bannedAt: { not: null }, ...(q ? { ip: { contains: q } } : {}) },
      orderBy: { bannedAt: 'desc' },
      take: 200,
    });
    return { data: await this.withStaff(rows), nextCursor: null };
  }

  async createBan(input: S['IpBanCreateRequest'], staffId: string, ctx: RequestContext) {
    const ip = input.ip.trim();
    if (!isIP(ip)) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
        fields: [
          {
            field: 'ip',
            code: 'format',
            message: ctx.t('t_validator_required'),
            messageKey: 't_validator_required',
          },
        ],
      });
    }
    const existing = await this.prisma.bannedIp.findUnique({ where: { ip } });
    if (existing?.bannedAt) throw new ApiException(409, 'DUPLICATE', 't_validator_unique');
    const row = await this.prisma.bannedIp.upsert({
      where: { ip },
      create: {
        ip,
        bannedAt: new Date(),
        source: 'manual',
        note: input.note ?? null,
        createdByStaffId: staffId,
      },
      update: {
        bannedAt: new Date(),
        source: 'manual',
        note: input.note ?? null,
        createdByStaffId: staffId,
      },
    });
    await this.audit.write({
      actorStaffId: staffId,
      permissionCode: 'security.ip_bans',
      action: 'security.ip_ban.create',
      targetType: 'ip',
      targetId: ip,
      reason: input.note ?? null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return (await this.withStaff([row]))[0]!;
  }

  async deleteBan(ip: string, staffId: string, ctx: RequestContext): Promise<void> {
    const existing = await this.prisma.bannedIp.findUnique({ where: { ip } });
    if (!existing?.bannedAt) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    // Removes the ban and resets the failed-attempt counter (AC-52).
    await this.prisma.bannedIp.delete({ where: { ip } });
    await this.audit.write({
      actorStaffId: staffId,
      permissionCode: 'security.ip_bans',
      action: 'security.ip_ban.delete',
      targetType: 'ip',
      targetId: ip,
      before: { failedAttempts: existing.failedAttempts, source: existing.source },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  /** Spec 16 AC-6: other sessions end, the current one stays, trusted devices are forgotten. */
  async changeMyPassword(
    staffId: string,
    sessionId: string,
    input: S['AdminMePasswordChangeRequest'],
    ctx: RequestContext,
  ): Promise<void> {
    if (input.newPassword !== input.newPasswordConfirmation) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_same', {
        fields: [
          {
            field: 'newPasswordConfirmation',
            code: 'same',
            message: ctx.t('t_validator_same'),
            messageKey: 't_validator_same',
          },
        ],
      });
    }
    const principal = `staff:${staffId}`;
    if ((await this.throttle.inSessionLockSeconds(principal)) > 0)
      this.locked(await this.throttle.inSessionLockSeconds(principal));
    const attempt = await this.throttle.reserveInSession(principal);
    if (attempt === null) this.locked(await this.throttle.inSessionLockSeconds(principal));
    const staff = await this.prisma.staff.findUniqueOrThrow({ where: { id: staffId } });
    const check = await this.passwords.verify(
      input.currentPassword,
      staff.passwordHash,
      staff.passwordAlgo,
    );
    if (!check.ok) {
      await this.throttle.inSessionFailed(principal, attempt!);
      throw new ApiException(
        422,
        'STAFF_CURRENT_PASSWORD_WRONG',
        't_ur_current_pass_does_not_match',
      );
    }
    await this.throttle.releaseInSession(principal);
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: staffId },
        data: { passwordHash, passwordAlgo: 'argon2id' },
      });
      await tx.trustedDevice.deleteMany({ where: { principalType: 'staff', staffId } });
      await this.sessions.revokeWhere({ staffId, id: { not: sessionId } }, 'password_change', tx);
      await this.audit.write(
        {
          actorStaffId: staffId,
          action: 'staff.password.change',
          targetType: 'staff',
          targetId: staffId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
  }

  private locked(seconds: number): never {
    throw new ApiException(429, 'RATE_LIMITED', 't_too_many_login_attempts', {
      retryAfterSeconds: Math.max(1, seconds),
      params: { minutes: Math.max(1, Math.ceil(seconds / 60)) },
    });
  }

  private async withStaff(rows: BannedIp[]): Promise<S['IpBan'][]> {
    const ids = [...new Set(rows.map((r) => r.createdByStaffId).filter(Boolean))] as string[];
    const staff = ids.length
      ? await this.prisma.staff.findMany({ where: { id: { in: ids } } })
      : [];
    return rows.map((r) => {
      const by = staff.find((s) => s.id === r.createdByStaffId);
      return {
        ip: r.ip,
        failedAttempts: r.failedAttempts,
        bannedAt: (r.bannedAt ?? r.createdAt).toISOString(),
        source: r.source,
        note: r.note,
        createdBy: by ? { id: by.id, username: by.username, fullName: by.fullName } : null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }
}
