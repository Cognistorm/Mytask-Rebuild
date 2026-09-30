// CSRF rule (ADR-002 §2, SEC-14), one global middleware, not per operation. Every unsafe request that is not
// authenticated by `Authorization: Bearer` must:
//   (a) carry X-MyTask-Client, and
//   (b) if it carries one of our cookies, or X-MyTask-Client is web/admin, or an Origin header is present:
//       carry an Origin EXACTLY equal to the host's origin (APP_URL; ADMIN_URL for /api/v1/admin/*).
// Otherwise 403 CSRF_CHECK_FAILED. JSON-only bodies are enforced by the contract validator (415 -> 400).
// Exempt: provider webhooks (their own signatures, no cookies read).
import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env';
import { ApiException } from '../errors/api-exception';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const OUR_COOKIE = /^(__Host-mt_|__Secure-mt_)/;
const EXEMPT = [/^\/api\/v1\/webhooks\//];

export function csrfMiddleware(env: Env) {
  const appOrigin = new URL(env.APP_URL).origin;
  const adminOrigin = new URL(env.ADMIN_URL).origin;

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!UNSAFE.has(req.method)) return next();
    const path = req.path;
    if (EXEMPT.some((re) => re.test(path))) return next();
    if (req.headers.authorization?.startsWith('Bearer ')) return next();

    const fail = () =>
      next(new ApiException(403, 'CSRF_CHECK_FAILED', 't_toast_something_went_wrong'));
    const client = String(req.headers['x-mytask-client'] ?? '').toLowerCase();
    if (!client) return fail();

    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    const hasOurCookie = Object.keys(cookies).some((name) => OUR_COOKIE.test(name));
    const origin = req.headers.origin;
    if (hasOurCookie || client === 'web' || client === 'admin' || origin) {
      const expected = path.startsWith('/api/v1/admin/') ? adminOrigin : appOrigin;
      if (origin !== expected) return fail();
    }
    return next();
  };
}
