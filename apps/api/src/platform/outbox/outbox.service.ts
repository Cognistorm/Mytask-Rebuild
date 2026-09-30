// Transactional outbox (data-model §1 "Writes that must notify", §3.O): business code writes the event in
// the same transaction; the worker delivers it afterwards. A rolled-back transaction never sends anything.
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../db/prisma.service';

/** Spec 15 events emitted by slice 01 part A. */
export type OutboxEventType =
  | 'EV-01' // VerifyEmail
  | 'EV-02' // Admin/PendingUser
  | 'EV-03' // AccountActivated
  | 'EV-04' // PasswordReset
  | 'EV-05' // PasswordChanged
  | 'EV-06' // TwoFactorCode
  | 'EV-124' // Admin/CriticalSettingChanged
  | 'EV-128' // LoginSlowMode
  | 'EV-129'; // TwoFactorLocked

export interface EmailPayload {
  /** Recipient user (the worker reads email, username and locale at send time), or explicit addresses. */
  userId?: string;
  to?: string[];
  locale?: 'ka' | 'en';
  /** Template parameters (never passwords; codes and link tokens only for their own email). */
  params: Record<string, string | number>;
}

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  add(
    event: OutboxEventType,
    aggregate: { type: string; id: string },
    payload: EmailPayload,
    tx: Tx = this.prisma,
  ) {
    return tx.outboxEvent.create({
      data: {
        eventType: event,
        aggregateType: aggregate.type,
        aggregateId: aggregate.id,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
