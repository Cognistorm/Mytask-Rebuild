// Structured JSON logs (pino) with a request id returned in `X-Request-Id` (architecture §7.11).
// Secrets, tokens and cookies are redacted. The id is always generated here, never taken from the caller.
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { ClientIpResolver } from '../client-ip/client-ip.resolver';
import { loadEnv } from '../config/env';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-mytask-service-auth"]',
  'req.headers["idempotency-key"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
];

/**
 * `ipSource` on every request line: how the API obtained the client IP (`peer`, `edge`, `ssr-visitor`). The
 * CI stack check uses it to prove that Caddy's visitor IP reaches the API through server rendering (review 07
 * I-41). The IP itself is not added (pino already logs the peer address).
 */
export function ipSourceProps(resolver: ClientIpResolver) {
  return (req: IncomingMessage) => ({
    ipSource: resolver.resolve(req as Parameters<ClientIpResolver['resolve']>[0], true).source,
  });
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = loadEnv();
        const clientIp = new ClientIpResolver(env);
        return {
          pinoHttp: {
            level: env.LOG_LEVEL,
            redact: { paths: REDACT_PATHS, censor: '[redacted]' },
            genReqId: (req, res) => {
              // Set by the first middleware in app.setup.ts; generated here only as a fallback.
              const existing = (req as { id?: unknown }).id;
              if (typeof existing === 'string') return existing;
              const id = randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            // Health probes would flood the logs.
            autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
            customProps: ipSourceProps(clientIp),
            ...(env.NODE_ENV === 'test' ? { enabled: false } : {}),
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
