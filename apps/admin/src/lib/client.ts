'use client';
// Admin browser helpers: API on the admin origin (staff cookies, ADR-010), i18n. Staff language is Georgian
// until the staff profile page (slice 16) lets staff choose.
import { useMemo } from 'react';
import { createApiClient, type ApiClient } from '@mytask/api-client';
import { createT } from './i18n';

export const t = createT('ka');

export function useAdminApi(): ApiClient {
  return useMemo(
    () =>
      createApiClient({
        baseUrl: '/api/v1',
        client: 'admin',
        locale: 'ka',
        credentials: 'same-origin',
        refresh: { path: '/admin/auth/refresh' },
      }),
    [],
  );
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { fields?: { field: string; message: string }[]; stepUpFor?: string };
}

export function splitErrors(err: ApiErrorBody | undefined) {
  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;
  return { fields, general };
}
