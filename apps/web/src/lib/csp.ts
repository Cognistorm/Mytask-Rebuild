// Content-Security-Policy of the website (ADR-013 §5, §7; ADR-019 §2). Our own scripts run with a fresh
// nonce per request (Next.js applies it to its scripts when the proxy passes the policy on the request).
// Private pages get exactly this strict policy. Public pages add the S-127 hosts (custom code, AC-74) to
// script/connect/img/frame sources; the path-scoped vendor table (ADR-019 §4) arrives with slice 17.

export interface CspOptions {
  nonce: string;
  /** S-127 hostnames (`example.com` or `*.example.com`); public pages only. */
  customCodeHosts?: readonly string[];
  /** `next dev` needs eval (React debugging) and the HMR websocket. */
  dev?: boolean;
}

const HOST = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function buildCsp({ nonce, customCodeHosts = [], dev = false }: CspOptions): string {
  // Only well-formed host names reach the header: a stray character must not open a new directive.
  const hosts = customCodeHosts.filter((h) => HOST.test(h)).map((h) => `https://${h}`);
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, ...hosts, ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...hosts],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...hosts, ...(dev ? ['ws:'] : [])],
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
