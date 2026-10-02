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
import type { components } from '@mytask/types';
import { COOKIE_ACCESS, COOKIE_STAFF_ACCESS } from './auth.constants';
import { SessionsService } from './sessions.service';
import { TokensService } from './tokens.service';

export const IS_PUBLIC = 'mytask:public';
export const ALLOW_RESTRICTED = 'mytask:allow-restricted';
/** Anyone may call (contract `x-permission.audience: public`). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Restricted users may call (contract audience `restricted-user`, ADR-002 §4). */
export const AllowRestricted = () => SetMetadata(ALLOW_RESTRICTED, true);
export const OPTIONAL_USER = 'mytask:optional-user';
/**
 * Guests may call; a valid user session is attached when present (contract audience `optional-user`, e.g. the
 * public profile). A missing, expired, revoked or banned session is treated as a guest, never as 401/403;
 * restricted users are signed in (public data). Redis down still answers 503 (fail closed).
 */
export const OptionalUser = () => SetMetadata(OPTIONAL_USER, true);

export type PermissionCode = components['schemas']['PermissionCode'];
export const STAFF_ROUTE = 'mytask:staff';
/**
 * Staff-only route (audience `staff`, ADR-010): user tokens are never accepted here. With a permission,
 * the caller's roles must grant it (deny by default); without one, any active staff member (`@self`).
 */
export const StaffRoute = (permission?: PermissionCode) =>
  SetMetadata(STAFF_ROUTE, { permission: permission ?? null });

export interface StaffAuthState {
  staffId: string;
  sessionId: string;
  permissions: Set<PermissionCode>;
  isSuperAdmin: boolean;
}

export const CurrentStaff = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): StaffAuthState => {
    const staff = ctx.switchToHttp().getRequest<AuthedRequest>().staff;
    if (!staff) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    return staff;
  },
);

export interface AuthState {
  userId: string;
  sessionId: string;
}
type AuthedRequest = Request & {
  auth?: AuthState;
  staff?: StaffAuthState;
  cookies?: Record<string, string>;
};

export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthState => {
  const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
  if (!auth) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
  return auth;
});

/** The viewer on an @OptionalUser route: the session when signed in, else null (guest). */
export const OptionalAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthState | null =>
    ctx.switchToHttp().getRequest<AuthedRequest>().auth ?? null,
);

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
    const staffRoute = this.reflector.getAllAndOverride<{ permission: PermissionCode | null }>(
      STAFF_ROUTE,
      targets,
    );
    if (staffRoute) return this.staff(req, staffRoute.permission);
    if (this.reflector.getAllAndOverride<boolean>(OPTIONAL_USER, targets)) {
      try {
        await this.user(req, true);
      } catch (e) {
        if (e instanceof ApiException && e.status === 503) throw e;
      }
      return true;
    }
    await this.user(req, !!this.reflector.getAllAndOverride<boolean>(ALLOW_RESTRICTED, targets));
    return true;
  }

  /** Verifies the user session and sets `req.auth`; throws 401/403/503 as described at the top. */
  private async user(req: AuthedRequest, allowRestricted: boolean): Promise<void> {
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
    if (user.isRestricted && !allowRestricted) {
      throw new ApiException(403, 'ACCOUNT_RESTRICTED', 't_account_restricted_notice');
    }

    req.auth = { userId: claims.sub, sessionId: claims.sid };
    void this.sessions.touch(claims.sid, this.ipResolver.resolve(req).ip).catch(() => undefined);
  }

  private async staff(req: AuthedRequest, permission: PermissionCode | null): Promise<boolean> {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice(7).trim()
      : req.cookies?.[COOKIE_STAFF_ACCESS];
    const claims = token ? await this.tokens.verifyAccess(token, 'staff') : null;
    if (!claims) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    let denied: string | null;
    try {
      denied = await this.sessions.deniedReason(claims.sid);
    } catch {
      throw new ApiException(503, 'SERVICE_UNAVAILABLE', 't_toast_something_went_wrong');
    }
    if (denied) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    const staff = await this.prisma.staff.findUnique({
      where: { id: claims.sub },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });
    if (!staff || staff.status !== 'active')
      throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    const isSuperAdmin = staff.roles.some((r) => r.role.isSystem);
    const permissions = new Set<PermissionCode>(
      staff.roles.flatMap((r) => r.role.permissions.map((p) => p.permissionCode as PermissionCode)),
    );
    if (permission && !isSuperAdmin && !permissions.has(permission)) {
      throw new ApiException(403, 'FORBIDDEN', 't_forbidden', { permission });
    }
    req.staff = { staffId: staff.id, sessionId: claims.sid, permissions, isSuperAdmin };
    void this.sessions.touch(claims.sid, this.ipResolver.resolve(req).ip).catch(() => undefined);
    return true;
  }
}
