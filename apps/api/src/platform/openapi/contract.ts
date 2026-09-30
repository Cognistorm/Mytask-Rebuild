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

export function contractValidator(env: Env): RequestHandler[] {
  const validateResponses =
    env.OPENAPI_VALIDATE_RESPONSES !== undefined
      ? env.OPENAPI_VALIDATE_RESPONSES === 'true'
      : env.NODE_ENV !== 'production';
  return OpenApiValidator.middleware({
    apiSpec: contractPath(env),
    validateRequests: { allowUnknownQueryParameters: false },
    validateResponses: validateResponses ? { removeAdditional: false } : false,
    // Authentication is enforced by the auth guards (slice 01), not by the schema validator.
    validateSecurity: false,
    // Formats are validated by the contract's patterns; unknown formats must not crash the validator.
    validateFormats: true,
    ignoreUndocumented: false,
  }) as unknown as RequestHandler[];
}
