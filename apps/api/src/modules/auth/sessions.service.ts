// Sessions and refresh tokens (ADR-002 §1, data-model §3.A).
// - Refresh token: 256-bit random, only its SHA-256 stored, rotated on every refresh.
// - Presenting an already used refresh token revokes the whole family (theft detection).
// - Every revoked session id goes to a Redis deny-list for the access-token lifetime, so it stops at once.
import { Injectable } from '@nestjs/common';
import type { ClientKind, Prisma, SessionRevokeReason } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { randomToken, sha256, type Bytes } from '../../platform/crypto';
import { RedisService } from '../../platform/redis/redis.module';
import { ACCESS_TOKEN_SECONDS, USER_REFRESH_DAYS } from './auth.constants';
import { TokensService } from './tokens.service';
import { describeDevice } from './user-agent';

type Tx = Prisma.TransactionClient | PrismaService;

export interface IssuedTokens {
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export type RefreshOutcome =
  { kind: 'ok'; userId: string; tokens: IssuedTokens } | { kind: 'invalid' } | { kind: 'banned' };

const refreshExpiry = () => new Date(Date.now() + USER_REFRESH_DAYS * 86_400_000);

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokens: TokensService,
  ) {}

  async create(input: {
    userId: string;
    client: ClientKind;
    deviceIdHash: Bytes;
    ip: string;
    userAgent: string | undefined;
  }): Promise<IssuedTokens> {
    const refreshToken = randomToken();
    const expiresAt = refreshExpiry();
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          principalType: 'user',
          userId: input.userId,
          familyId: '00000000-0000-0000-0000-000000000000',
          client: input.client,
          deviceIdHash: input.deviceIdHash,
          userAgent: input.userAgent?.slice(0, 500),
          deviceLabel: describeDevice(input.userAgent, input.client),
          ip: input.ip,
          expiresAt,
        },
      });
      // A session is its own family: rotations stay inside it; reuse revokes it (ADR-002 §1).
      await tx.session.update({ where: { id: created.id }, data: { familyId: created.id } });
      await tx.refreshToken.create({
        data: { sessionId: created.id, tokenHash: sha256(refreshToken) },
      });
      return created;
    });
    const access = await this.tokens.signAccess({
      sub: input.userId,
      aud: 'user',
      sid: session.id,
    });
    return {
      sessionId: session.id,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async refresh(rawToken: string, ip: string): Promise<RefreshOutcome> {
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { session: { include: { user: true } } },
    });
    if (!found) return { kind: 'invalid' };
    const { session } = found;

    if (found.usedAt) {
      // Theft detection: an old refresh token came back. End the whole family.
      await this.revokeWhere({ familyId: session.familyId, revokedAt: null }, 'reuse_detected');
      return { kind: 'invalid' };
    }
    if (session.revokedAt)
      return session.revokeReason === 'ban' ? { kind: 'banned' } : { kind: 'invalid' };
    if (session.expiresAt <= new Date() || !session.user || session.user.deletedAt)
      return { kind: 'invalid' };
    if (session.user.status === 'banned') {
      await this.revokeWhere({ id: session.id }, 'ban');
      return { kind: 'banned' };
    }

    const refreshToken = randomToken();
    const expiresAt = refreshExpiry();
    const rotated = await this.prisma.$transaction(async (tx) => {
      // Compare-and-set: only one concurrent refresh with the same token wins.
      const marked = await tx.refreshToken.updateMany({
        where: { id: found.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (marked.count !== 1) return false;
      const next = await tx.refreshToken.create({
        data: { sessionId: session.id, tokenHash: sha256(refreshToken) },
      });
      await tx.refreshToken.update({ where: { id: found.id }, data: { replacedById: next.id } });
      await tx.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(), expiresAt, ip },
      });
      return true;
    });
    if (!rotated) {
      await this.revokeWhere({ familyId: session.familyId, revokedAt: null }, 'reuse_detected');
      return { kind: 'invalid' };
    }
    const access = await this.tokens.signAccess({
      sub: session.user.id,
      aud: 'user',
      sid: session.id,
    });
    return {
      kind: 'ok',
      userId: session.user.id,
      tokens: {
        sessionId: session.id,
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    };
  }

  /** Revoke matching live sessions and deny-list them at once. Returns the number revoked. */
  async revokeWhere(
    where: Prisma.SessionWhereInput,
    reason: SessionRevokeReason,
    tx: Tx = this.prisma,
  ): Promise<number> {
    const live = await tx.session.findMany({
      where: { ...where, revokedAt: null },
      select: { id: true },
    });
    if (live.length === 0) return 0;
    await tx.session.updateMany({
      where: { id: { in: live.map((s) => s.id) }, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
    await this.denyList(
      live.map((s) => s.id),
      reason,
    );
    return live.length;
  }

  private async denyList(ids: string[], reason: SessionRevokeReason): Promise<void> {
    const multi = this.redis.client.multi();
    for (const id of ids) multi.set(`auth:deny:${id}`, reason, 'EX', ACCESS_TOKEN_SECONDS + 60);
    await multi.exec();
  }

  /** Reason when this session was revoked recently (deny-list), else null. Throws if Redis is down. */
  async deniedReason(sessionId: string): Promise<string | null> {
    return this.redis.client.get(`auth:deny:${sessionId}`);
  }

  async touch(sessionId: string, ip: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, lastUsedAt: { lt: new Date(Date.now() - 60_000) } },
      data: { lastUsedAt: new Date(), ip },
    });
  }
}
