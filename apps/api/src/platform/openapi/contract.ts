// Request (always) and response (development + tests) validation against the contract (ADR-014 §3).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as OpenApiValidator from 'express-openapi-validator';
import type { RequestHandler } from 'express';
import type { Env } from '../config/env';

export function contractPath(env: Env): string {
  const candidates = [
    env.OPENAPI_SPEC_PATH,
    resolve(__dirname, '../../../../../docs/04-api/openapi.yaml'), // repo: apps/api/{src,dist}/platform/openapi
    resolve(__dirname, '../../../../docs/04-api/openapi.yaml'),
    resolve(process.cwd(), 'docs/04-api/openapi.yaml'),
    resolve(process.cwd(), '../../docs/04-api/openapi.yaml'),
  ].filter((p): p is string => Boolean(p));
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`openapi.yaml not found (tried: ${candidates.join(', ')})`);
  return found;
}

// Global responses are not listed per operation (openapi.yaml "Global rules", CONVENTIONS §7.2, §14).
// They are recognised by their error CODE, so any other undeclared status still fails the contract.
const GLOBAL_CODES = new Set([
  'APP_VERSION_UNSUPPORTED', // 426, ADR-018
  'RATE_LIMITED', // 429 global defaults
  'MAINTENANCE', // 503, S-121
  'SERVICE_UNAVAILABLE', // 503
  'ACCOUNT_SUSPENDED', // 403 on any call with a session ended by a ban (spec 01 AC-45)
  'ACCOUNT_RESTRICTED', // 403 for restricted users outside their allowed operations (AC-19)
]);

export function contractValidator(env: Env): RequestHandler[] {
  const validateResponses =
    env.OPENAPI_VALIDATE_RESPONSES !== undefined
      ? env.OPENAPI_VALIDATE_RESPONSES === 'true'
      : env.NODE_ENV !== 'production';
  return OpenApiValidator.middleware({
    apiSpec: contractPath(env),
    validateRequests: { allowUnknownQueryParameters: false },
    validateResponses: validateResponses
      ? {
          removeAdditional: false,
          // Global statuses are not listed per operation (CONVENTIONS §7.2): 426 APP_VERSION_UNSUPPORTED
          // (ADR-018) and 503 MAINTENANCE / SERVICE_UNAVAILABLE. Every other mismatch still fails.
          onError: (err, body) => {
            if (GLOBAL_CODES.has((body as { code?: string } | undefined)?.code ?? '')) return;
            throw err;
          },
        }
      : false,
    // Authentication is enforced by the auth guards (slice 01), not by the schema validator.
    validateSecurity: false,
    // Formats are validated by the contract's patterns; unknown formats must not crash the validator.
    validateFormats: true,
    ignoreUndocumented: false,
  }) as unknown as RequestHandler[];
}
