// Append-only audit log (data-model §3.P, spec 16 AC-13). Secrets must be redacted by the caller.
import { Global, Injectable, Module } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../db/prisma.service';

type Tx = Prisma.TransactionClient | PrismaService;

export interface AuditEntry {
  actorStaffId?: string;
  actorUserId?: string;
  permissionCode?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(e: AuditEntry, tx: Tx = this.prisma) {
    return tx.auditLog.create({
      data: {
        actorType: e.actorStaffId ? 'staff' : e.actorUserId ? 'user' : 'system',
        actorStaffId: e.actorStaffId,
        actorUserId: e.actorUserId,
        permissionCode: e.permissionCode,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        before: (e.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (e.after ?? undefined) as Prisma.InputJsonValue | undefined,
        reason: e.reason ?? undefined,
        ip: e.ip,
        userAgent: e.userAgent?.slice(0, 500),
        requestId: e.requestId,
      },
    });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
