// HTTP pipeline shared by main.ts and the tests, so tests exercise exactly what production runs.
import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import type { Env } from './platform/config/env';
import { csrfMiddleware } from './platform/csrf/csrf.middleware';
import { ErrorFilter } from './platform/errors/error.filter';
import { contractValidator } from './platform/openapi/contract';

export const API_PREFIX = 'api/v1';

export function configureApp(app: NestExpressApplication, env: Env): void {
  app.useLogger(app.get(Logger));
  // ADR-013 §16: Express never derives the client IP from forwarding headers. The ClientIpResolver
  // (slice 01) reads the socket peer and trusts X-MyTask-Client-IP only from TRUSTED_PROXY_IPS.
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  // ADR-013 §6: same-origin in production (empty allow-list); localhost only in development.
  if (env.NODE_ENV === 'development') {
    app.enableCors({ origin: /^http:\/\/localhost(:\d+)?$/, credentials: true });
  }
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ErrorFilter());

  // Cookies (web sessions), then the CSRF rule (ADR-002 §2), then contract validation; errors from these
  // middlewares go through the same ErrorFilter as the routes.
  const filter = new ErrorFilter();
  // Request id first, so even requests refused by CSRF or the validator carry X-Request-Id (CONVENTIONS).
  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    req.id = randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });
  app.use(cookieParser());
  app.use(csrfMiddleware(env));
  for (const handler of contractValidator(env)) {
    app.use(handler);
  }
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    filter.catch(err, {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res, getNext: () => next }),
    } as never);
  });
}
