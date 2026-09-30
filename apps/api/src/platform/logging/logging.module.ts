// Structured JSON logs (pino) with a request id returned in `X-Request-Id` (architecture §7.11).
// Secrets, tokens and cookies are redacted. The id is always generated here, never taken from the caller.
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = loadEnv();
        return {
          pinoHttp: {
            level: env.LOG_LEVEL,
            redact: { paths: REDACT_PATHS, censor: '[redacted]' },
            genReqId: (_req, res) => {
              const id = randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            // Health probes would flood the logs.
            autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
            ...(env.NODE_ENV === 'test' ? { enabled: false } : {}),
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
