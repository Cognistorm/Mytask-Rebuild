// Web session cookies (ADR-002 §2): HttpOnly, Secure, SameSite=Lax, host-only (never a Domain attribute).
// Browsers accept Secure/prefixed cookies on http://localhost, so the names are the same locally.
import type { Response } from 'express';
import {
  ACCESS_TOKEN_SECONDS,
  COOKIE_ACCESS,
  COOKIE_DEVICE,
  COOKIE_REFRESH,
  DEVICE_COOKIE_DAYS,
  REFRESH_COOKIE_PATH,
} from './auth.constants';
import type { IssuedTokens } from './sessions.service';

const base = { httpOnly: true, secure: true, sameSite: 'lax' as const };

export function setSessionCookies(
  res: Response,
  tokens: IssuedTokens,
  deviceId: string | undefined,
  rememberMe: boolean,
): void {
  res.cookie(COOKIE_ACCESS, tokens.accessToken, {
    ...base,
    path: '/',
    maxAge: ACCESS_TOKEN_SECONDS * 1000,
  });
  res.cookie(COOKIE_REFRESH, tokens.refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    // "Remember me" off = the refresh cookie ends with the browser session (AC-10).
    ...(rememberMe ? { expires: tokens.refreshTokenExpiresAt } : {}),
  });
  if (deviceId) setDeviceCookie(res, deviceId);
}

export function setDeviceCookie(res: Response, deviceId: string): void {
  res.cookie(COOKIE_DEVICE, deviceId, {
    ...base,
    path: '/',
    maxAge: DEVICE_COOKIE_DAYS * 86_400_000,
  });
}

/** Logout: session cookies go; the device cookie stays (it is what makes a device "trusted"). */
export function clearSessionCookies(res: Response): void {
  res.clearCookie(COOKIE_ACCESS, { ...base, path: '/' });
  res.clearCookie(COOKIE_REFRESH, { ...base, path: REFRESH_COOKIE_PATH });
}
