// Global guard: every route needs a valid user access token unless marked @Public (deny by default).
// - Bearer header (mobile, SSR) or the host-only cookie (web), audience `user` (ADR-002 §1–§2).
// - Revoked sessions stop at once via the Redis deny-list; Redis down => 503, never "let through" (fail closed).
// - Banned => 403 ACCOUNT_SUSPENDED; restricted => 403 ACCOUNT_RESTRICTED unless @AllowRestricted (AC-19, AC-45).
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { COOKIE_ACCESS } from './auth.constants';
import { SessionsService } from './sessions.service';
import { TokensService } from './tokens.service';

export const IS_PUBLIC = 'mytask:public';
export const ALLOW_RESTRICTED = 'mytask:allow-restricted';
/** Anyone may call (contract `x-permission.audience: public`). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Restricted users may call (contract audience `restricted-user`, ADR-002 §4). */
export const AllowRestricted = () => SetMetadata(ALLOW_RESTRICTED, true);

export interface AuthState {
  userId: string;
  sessionId: string;
}
type AuthedRequest = Request & { auth?: AuthState; cookies?: Record<string, string> };

export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthState => {
  const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
  if (!auth) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
  return auth;
});

export function accessTokenFrom(req: AuthedRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  return req.cookies?.[COOKIE_ACCESS];
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly sessions: SessionsService,
    private readonly prisma: PrismaService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = accessTokenFrom(req);
    const claims = token ? await this.tokens.verifyAccess(token, 'user') : null;
    if (!claims) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');

    let denied: string | null;
    try {
      denied = await this.sessions.deniedReason(claims.sid);
    } catch {
      throw new ApiException(503, 'SERVICE_UNAVAILABLE', 't_toast_something_went_wrong');
    }
    if (denied === 'ban') throw new ApiException(403, 'ACCOUNT_SUSPENDED', 't_account_suspended');
    if (denied) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { status: true, isRestricted: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    if (user.status === 'banned')
      throw new ApiException(403, 'ACCOUNT_SUSPENDED', 't_account_suspended');
    if (
      user.isRestricted &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_RESTRICTED, targets)
    ) {
      throw new ApiException(403, 'ACCOUNT_RESTRICTED', 't_account_restricted_notice');
    }

    req.auth = { userId: claims.sub, sessionId: claims.sid };
    void this.sessions.touch(claims.sid, this.ipResolver.resolve(req).ip).catch(() => undefined);
    return true;
  }
}
