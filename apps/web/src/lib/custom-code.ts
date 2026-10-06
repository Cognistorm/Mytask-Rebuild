// S-110 custom code + S-127 hosts for public pages (getWebCustomCode, spec 16 AC-73…AC-75), read by the
// Next.js server only: the proxy (public-page CSP) and the public root layout (head/footer slots). Cached for
// 60 seconds per process ("changes visible within 60 seconds"). Any failure means "no custom code": the
// page then renders without it and keeps the strict CSP. Not `server-only`: the proxy imports it too.
import { createApiClient } from '@mytask/api-client';
import type { components } from '@mytask/types';

export type WebCustomCode = components['schemas']['PublicConfigWebCustomCode'];

const TTL_MS = 60_000;
let cached: { value: WebCustomCode | null; until: number } | undefined;
let inFlight: Promise<WebCustomCode | null> | undefined;

async function load(): Promise<WebCustomCode | null> {
  try {
    const api = createApiClient({
      baseUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:3000/api/v1',
      client: 'web',
    });
    const { data } = await api.GET('/config/web-custom-code', {
      signal: AbortSignal.timeout(1500),
    });
    return data?.enabled ? data : null;
  } catch {
    return null;
  }
}

export async function getWebCustomCode(): Promise<WebCustomCode | null> {
  if (cached && cached.until > Date.now()) return cached.value;
  inFlight ??= load().then((value) => {
    cached = { value, until: Date.now() + TTL_MS };
    inFlight = undefined;
    return value;
  });
  return inFlight;
}

/** Inline and external scripts of the custom code run with the page nonce (ADR-013 §7). */
export function withNonce(html: string, nonce: string): string {
  return html.replace(/<script\b/gi, `<script nonce="${nonce}"`);
}
