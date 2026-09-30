// @mytask/api-client — the only way web, admin and mobile talk to the API (architecture §1, ADR-014 §2).
// Cross-cutting headers only: base URL, Accept-Language, Authorization, X-MyTask-Client, fixed extra headers
// (e.g. the SSR service credential of ADR-013 §17), and an Idempotency-Key guard on money operations.
// Token refresh is added in slice 01 (auth) together with the auth endpoints.
import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { paths } from '@mytask/types';
import { moneyOperations } from './generated/operations';

export type Locale = 'ka' | 'en';
/** Values of the contract's `X-MyTask-Client` header. */
export type ClientKind = 'web' | 'admin' | 'ios' | 'android';

export interface ApiClientOptions {
  /** e.g. `/api/v1` in browsers (same origin), `http://api:3000/api/v1` for SSR, `https://mytask.ge/api/v1` on mobile. */
  baseUrl: string;
  /** Sent as `X-MyTask-Client` (CSRF defence for cookie calls, ADR-002 §2). */
  client?: ClientKind;
  /** Active UI language, sent as `Accept-Language` (default `ka`, ADR-006 §2). */
  locale?: Locale | (() => Locale);
  /** Bearer token for mobile and SSR. Browsers rely on host-only cookies instead (ADR-002). */
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Browsers: `same-origin` so the API's host-only cookies are sent. */
  credentials?: RequestCredentials;
  /** Fixed extra headers (SSR only: `X-MyTask-Service-Auth`, `X-MyTask-Visitor-IP`, `X-MyTask-Visitor-UA`). */
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export type ApiClient = Client<paths>;

export class MissingIdempotencyKeyError extends Error {
  constructor(public readonly operation: string) {
    super(
      `${operation} is a money operation and needs an Idempotency-Key (use createIdempotencyKey()).`,
    );
    this.name = 'MissingIdempotencyKeyError';
  }
}

/**
 * One key per user intent (e.g. one per press of "Pay"); reuse the same key when retrying that intent.
 * CONVENTIONS §9, ADR-003 §6.
 */
export function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

const moneyMatchers = Object.entries(moneyOperations).map(([key, id]) => {
  const [method, template] = key.split(' ') as [string, string];
  return { method, id, re: new RegExp('^' + template.replace(/\{[^/]+\}/g, '[^/]+') + '/?$') };
});

function findMoneyOperation(
  method: string,
  pathname: string,
  basePath: string,
): string | undefined {
  const rel = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  return moneyMatchers.find((m) => m.method === method && m.re.test(rel))?.id;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const basePath = new URL(options.baseUrl, 'http://placeholder').pathname.replace(/\/$/, '');
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.credentials ? { credentials: options.credentials } : {}),
  });

  const headers: Middleware = {
    async onRequest({ request }) {
      const locale = typeof options.locale === 'function' ? options.locale() : options.locale;
      request.headers.set('Accept-Language', locale ?? 'ka');
      if (options.client) request.headers.set('X-MyTask-Client', options.client);
      for (const [name, value] of Object.entries(options.headers ?? {})) {
        request.headers.set(name, value);
      }
      const token = await options.getAccessToken?.();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);

      const op = findMoneyOperation(request.method, new URL(request.url).pathname, basePath);
      if (op && !request.headers.get('Idempotency-Key')) throw new MissingIdempotencyKeyError(op);
      return request;
    },
  };
  client.use(headers);
  return client;
}
