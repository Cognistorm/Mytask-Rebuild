// Server-side data of the public site shell (ROADMAP 4.2.9a): the category tree for the header (listCategories,
// cached ≤ 60 s by the API), the public config, the visitor (getMe when a session cookie came along) and the
// footer pages (listPages, slice 16: until the API serves it the footer shows no page columns). Every call
// degrades: a failed call renders the shell without that part, never an error page.
import 'server-only';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { serverApi, viewerApi } from './api';

export type CategoryNode = components['schemas']['CategoryNode'];
export type PublicConfig = components['schemas']['PublicConfig'];
export type PageLink = components['schemas']['PageLink'];
type Me = components['schemas']['Me'];

/** What the header needs about a signed-in visitor (nothing else is sent to the browser). */
export interface Viewer {
  username: string;
  avatar: Me['avatar'];
  lastDashboard: Me['lastDashboard'];
}

const TIMEOUT_MS = 2000;
const signal = () => AbortSignal.timeout(TIMEOUT_MS);

export async function getCategoryTree(locale: Locale): Promise<CategoryNode[]> {
  try {
    const { data } = await serverApi(locale).GET('/categories', { signal: signal() });
    return data?.categories ?? [];
  } catch {
    return [];
  }
}

const configCache = new Map<Locale, { value: PublicConfig | null; until: number }>();

/** Cached 60 s per process and language, like the appearance settings (lib/theme.ts). */
export async function getServerPublicConfig(locale: Locale): Promise<PublicConfig | null> {
  const hit = configCache.get(locale);
  if (hit && hit.until > Date.now()) return hit.value;
  let value: PublicConfig | null;
  try {
    value = (await serverApi(locale).GET('/config/public', { signal: signal() })).data ?? null;
  } catch {
    value = null;
  }
  // A failure is retried on the next request instead of being kept for a minute.
  if (value) configCache.set(locale, { value, until: Date.now() + 60_000 });
  return value;
}

/**
 * The signed-in visitor, or null for a guest; one getMe per request (the header and the layout share it).
 * `mayHaveSession`: no access cookie but this browser signed in before, so the header asks the API once from the
 * browser (which can refresh the session).
 */
export const getViewer = cache(async function getViewer(
  locale: Locale,
): Promise<{ viewer: Viewer | null; mayHaveSession: boolean }> {
  try {
    const { api, hasSession, mayHaveSession } = await viewerApi(locale);
    if (!hasSession) return { viewer: null, mayHaveSession };
    const { data } = await api.GET('/me', { signal: signal() });
    if (!data) return { viewer: null, mayHaveSession: true };
    return {
      viewer: { username: data.username, avatar: data.avatar, lastDashboard: data.lastDashboard },
      mayHaveSession: false,
    };
  } catch {
    return { viewer: null, mayHaveSession: false };
  }
});

export async function getFooterPages(locale: Locale): Promise<PageLink[]> {
  try {
    const { data } = await serverApi(locale).GET('/pages', { signal: signal() });
    return (data?.pages ?? []).filter((p) => p.footerColumn !== null);
  } catch {
    return [];
  }
}
