// Per-request facts every auth operation needs: client IP (ClientIpResolver), client kind, locale, device.
import type { Request } from 'express';
import type { Locale } from '@mytask/types';
import type { ClientKind } from '../../generated/prisma/client';
import { resolveLocale, translate } from '../../platform/errors/messages';
import { COOKIE_DEVICE } from './auth.constants';

export interface RequestContext {
  ip: string;
  userAgent: string | undefined;
  /** From X-MyTask-Client; `web` when absent (safe: cookie-less, and CSRF rules already applied). */
  client: ClientKind;
  locale: Locale;
  /** Raw device identifier: web cookie, or mobile `deviceToken` from the body. */
  deviceId: string | undefined;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function clientKind(req: Request): ClientKind {
  const v = String(req.headers['x-mytask-client'] ?? '').toLowerCase();
  return v === 'ios' || v === 'android' || v === 'admin' ? v : 'web';
}

export function isCookieClient(client: ClientKind): boolean {
  return client === 'web' || client === 'admin';
}

export function buildContext(
  req: Request,
  ip: string,
  userAgent: string | undefined,
  bodyDeviceToken?: string | null,
): RequestContext {
  const client = clientKind(req);
  const locale = resolveLocale(req.headers['accept-language']);
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  const deviceId = isCookieClient(client) ? cookies[COOKIE_DEVICE] : (bodyDeviceToken ?? undefined);
  return {
    ip,
    userAgent,
    client,
    locale,
    deviceId: deviceId && deviceId.length >= 16 && deviceId.length <= 200 ? deviceId : undefined,
    t: (key, params) => translate(key, locale, params),
  };
}
