'use client';
// Browser-side helpers: the API client on the same origin (cookies, ADR-002 §2), i18n and locale-aware links.
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { createInstance, type TFunction } from 'i18next';
import { createApiClient, type ApiClient } from '@mytask/api-client';
import { i18nextOptions, isLocale, type Locale } from '@mytask/i18n';

export function useLocale(): Locale {
  const params = useParams<{ locale?: string }>();
  return isLocale(params?.locale) ? params.locale : 'ka';
}

export function useT(locale: Locale): TFunction {
  return useMemo(() => {
    const i18n = createInstance();
    void i18n.init({ ...i18nextOptions, lng: locale, initAsync: false });
    return i18n.t;
  }, [locale]);
}

export function useApi(locale: Locale): ApiClient {
  return useMemo(
    () =>
      createApiClient({
        baseUrl: '/api/v1',
        client: 'web',
        locale,
        credentials: 'same-origin',
        refresh: {},
      }),
    [locale],
  );
}

export { href } from './href';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: {
    fields?: { field: string; message: string }[];
    retryAfterSeconds?: number;
    verificationMethod?: string;
  };
}

/** Field errors by field name + one general message (already localized by the API). */
export function splitErrors(err: ApiErrorBody | undefined) {
  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;
  return { fields, general };
}

/**
 * Only same-site paths may be a post-login target (SEC-33): "/account" is fine; "https://evil.example",
 * "//evil.example", "/\evil.example" and anything with control characters fall back.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  if (
    next.includes('\\') ||
    [...next].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  ) {
    return fallback;
  }
  return next;
}
