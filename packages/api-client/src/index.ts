// @mytask/api-client — the only way web, admin and mobile talk to the API (architecture §1, ADR-014 §2).
// Cross-cutting headers only: base URL, Accept-Language, Authorization, X-MyTask-Client, fixed extra headers
// (e.g. the SSR service credential of ADR-013 §17), and an Idempotency-Key guard on money operations.
// Token refresh: on a 401 the client calls refreshSession once (single flight) and retries READ requests.
import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { components, paths } from '@mytask/types';
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
  /** Mobile store version, sent as `X-MyTask-App-Version` (ADR-018). */
  appVersion?: string;
  /** Called on `426 APP_VERSION_UNSUPPORTED` (the app shows its update screen). */
  onUpdateRequired?: (minVersion: string | undefined) => void;
  /**
   * Automatic refresh (ADR-002 §1). Web: `{}` (the refresh cookie is sent by the browser). Mobile: give
   * `getRefreshToken` and store the new tokens in `onSession` (SecureStore). `onSignedOut` runs when refresh fails.
   */
  refresh?: {
    /** Refresh operation path: `/admin/auth/refresh` for the admin app (default `/auth/refresh`). */
    path?: string;
    getRefreshToken?: () => string | null | undefined | Promise<string | null | undefined>;
    onSession?: (session: components['schemas']['AuthSession']) => void | Promise<void>;
    onSignedOut?: () => void;
  };
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
      if (options.appVersion) request.headers.set('X-MyTask-App-Version', options.appVersion);
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

  if (options.onUpdateRequired) {
    const notify = options.onUpdateRequired;
    client.use({
      onResponse({ response }) {
        if (response.status === 426) notify(response.headers.get('X-Min-App-Version') ?? undefined);
        return response;
      },
    });
  }

  if (options.refresh) {
    const refreshCfg = options.refresh;
    const doFetch = options.fetch ?? globalThis.fetch;
    let inFlight: Promise<boolean> | null = null;
    const refreshOnce = () =>
      (inFlight ??= (async () => {
        try {
          const locale = typeof options.locale === 'function' ? options.locale() : options.locale;
          const refreshToken = await refreshCfg.getRefreshToken?.();
          const refreshPath = refreshCfg.path ?? '/auth/refresh';
          const res = await doFetch(`${options.baseUrl.replace(/\/$/, '')}${refreshPath}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': locale ?? 'ka',
              ...(options.client ? { 'X-MyTask-Client': options.client } : {}),
            },
            credentials: options.credentials ?? 'same-origin',
            body: JSON.stringify(refreshToken ? { refreshToken } : {}),
          });
          if (!res.ok) {
            refreshCfg.onSignedOut?.();
            return false;
          }
          await refreshCfg.onSession?.((await res.json()) as components['schemas']['AuthSession']);
          return true;
        } catch {
          return false;
        } finally {
          setTimeout(() => (inFlight = null), 0);
        }
      })());

    client.use({
      async onResponse({ request, response }) {
        const path = new URL(request.url).pathname;
        const isAuthCall =
          path.startsWith(`${basePath}/auth/`) || path.startsWith(`${basePath}/admin/auth/`);
        if (response.status !== 401 || isAuthCall) return response;
        // Only reads are retried automatically; a write is never replayed behind the user's back.
        if (request.method !== 'GET' && request.method !== 'HEAD') return response;
        if (!(await refreshOnce())) return response;
        const retry = new Request(request);
        const token = await options.getAccessToken?.();
        if (token) retry.headers.set('Authorization', `Bearer ${token}`);
        return doFetch(retry);
      },
    });
  }
  return client;
}
