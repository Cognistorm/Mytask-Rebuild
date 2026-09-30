// Referrals at sign-up (spec 01 AC-6, BR-115; ADR-002 §4 "one referral service").
// Slice 01 stores the pending referral. `creditSignup` is THE single activation hook that every activation
// path calls inside its transaction; the points posting itself (journal ref `referral:{id}:signup`,
// data-model PM-09-01, S-046) is implemented by slice 09. Until then it marks nothing, so slice 09 can credit
// every still-pending referral of an already active user exactly once (idempotent ref).
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger('ReferralService');

  async findReferrer(tx: Prisma.TransactionClient, code: string): Promise<string | null> {
    const referrer = await tx.user.findFirst({
      where: { referralCode: code, deletedAt: null },
      select: { id: true },
    });
    return referrer?.id ?? null;
  }

  async storePending(
    tx: Prisma.TransactionClient,
    referrerUserId: string,
    referredUserId: string,
    code: string,
  ): Promise<void> {
    await tx.referral.create({ data: { referrerUserId, referredUserId, codeUsed: code } });
  }

  /** Called when an account becomes active (register with S-052 OFF, verifyEmail, social, staff). */
  async creditSignup(_tx: Prisma.TransactionClient, referredUserId: string): Promise<void> {
    this.logger.debug(`referral credit for ${referredUserId} deferred to slice 09 (points ledger)`);
  }
}
