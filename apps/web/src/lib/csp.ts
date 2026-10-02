// Content-Security-Policy of the website (ADR-013 §5, §7; ADR-019 §2). Our own scripts run with a fresh
// nonce per request (Next.js applies it to its scripts when the proxy passes the policy on the request).
// Private pages get exactly this strict policy. Public pages add the S-127 hosts (custom code, AC-74) to
// script/connect/img/frame sources; the path-scoped vendor table (ADR-019 §4) arrives with slice 17.
// Every page may POST files straight to object storage (ADR-009 §3.3): its origin is in connect-src.
// Public images (avatars, portfolio, later gigs) come from the media CDN (`PUBLIC_MEDIA_BASE_URL`, ADR-009 §2):
// its origin is in img-src.

export interface CspOptions {
  nonce: string;
  /** S-127 hostnames (`example.com` or `*.example.com`); public pages only. */
  customCodeHosts?: readonly string[];
  /** Origin of the presigned upload URLs (`S3_PUBLIC_ENDPOINT`), see `storageOrigin`. */
  storage?: string | null;
  /** Origin of the public image URLs (`PUBLIC_MEDIA_BASE_URL`), see `mediaOrigin`. */
  media?: string | null;
  /** `next dev` needs eval (React debugging) and the HMR websocket. */
  dev?: boolean;
}

/**
 * The storage origin browsers upload to: `S3_PUBLIC_ENDPOINT` (same variable as the API, which signs URLs for
 * it), else `S3_ENDPOINT`; `next dev` falls back to the local SeaweedFS. Only an http(s) origin is used.
 */
export function storageOrigin(
  env: Record<string, string | undefined>,
  dev: boolean,
): string | null {
  return httpOrigin(
    env.S3_PUBLIC_ENDPOINT || env.S3_ENDPOINT || (dev ? 'http://localhost:8333' : ''),
  );
}

/** The origin of `PUBLIC_MEDIA_BASE_URL` (the API builds `ImageVariants` URLs from the same variable). */
export function mediaOrigin(env: Record<string, string | undefined>): string | null {
  return httpOrigin(env.PUBLIC_MEDIA_BASE_URL);
}

function httpOrigin(raw: string | undefined): string | null {
  try {
    const url = new URL(raw ?? '');
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
}

const HOST = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function buildCsp({
  nonce,
  customCodeHosts = [],
  storage = null,
  media = null,
  dev = false,
}: CspOptions): string {
  // Only well-formed host names reach the header: a stray character must not open a new directive.
  const hosts = customCodeHosts.filter((h) => HOST.test(h)).map((h) => `https://${h}`);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, ...hosts, ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...(media ? [media] : []), ...hosts],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(storage ? [storage] : []), ...hosts, ...(dev ? ['ws:'] : [])],
    'frame-src': hosts.length ? hosts : ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
