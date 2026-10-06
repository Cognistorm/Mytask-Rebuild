// Locale from the path only (ADR-006 §1): Georgian unprefixed, English under /en/.
// Internally every page lives under app/[locale]/, so `/x` is rewritten to `/ka/x`.
// A request for `/ka/...` is not a public URL: it is redirected (301) to the unprefixed form.
// Trailing slashes are removed here too (Next's own 308 is off, `skipTrailingSlashRedirect`), so
// `/ka/` reaches its final URL in one 301 hop (url-map §1 rules 3 and 5, QA P3 BUG-11).
// Legacy `?locale=` and `?theme=` answer one 301 to the same page without them (url-map §2, spec 03 AC-36): `en`
// moves the path under /en, anything else to the unprefixed Georgian path; `theme=dark|light` also sets the
// theme cookie on the redirect. `?page=1` is the clean list (url-map §2) and goes in the same hop.
// Every page gets a Content-Security-Policy with a fresh nonce (ADR-013 §5): the strict one, plus the S-127
// custom-code hosts on public pages only (spec 16 AC-73/AC-74, ADR-019 §2).
import { type NextRequest, NextResponse } from 'next/server';
import { buildCsp, createNonce, mediaOrigin, storageOrigin } from './lib/csp';
import { getWebCustomCode } from './lib/custom-code';
import { THEME_COOKIE } from './lib/theme';
import { isPublicPath } from './lib/zones';

// `next dev` runs the proxy a second time on its own `/ka/...` rewrite, which the /ka rule above would send back
// with a 301 (an endless loop on every Georgian URL under `pnpm local`, 3X.15b); `next start` does not. The rewrite
// therefore carries this per-process token, and a request that has it is already handled. A visitor cannot know it.
const REWRITTEN = 'x-mt-rewritten';
const rewriteToken = createNonce();

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get(REWRITTEN) === rewriteToken) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  let target = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  // Defence in depth: `//host/...` must never become a protocol-relative redirect target (Next.js already
  // normalises such paths; e2e "a path starting with //" guards both).
  target = target.replace(/^\/{2,}/, '/');
  if (target === '/ka' || target.startsWith('/ka/')) target = target.slice(3) || '/';
  const legacy = legacyParams(target, search);
  if (legacy) {
    const response = NextResponse.redirect(new URL(legacy.url, request.url), 301);
    if (legacy.theme) {
      // Read by the browser's theme switch too (lib/theme-client.ts), so not HttpOnly.
      response.cookies.set(THEME_COOKIE, legacy.theme, {
        path: '/',
        maxAge: 365 * 24 * 3600,
        sameSite: 'lax',
      });
    }
    return response;
  }
  if (target !== pathname) {
    // A plain URL: NextURL would put the request's trailing slash back on.
    return NextResponse.redirect(new URL(`${target}${search}`, request.url), 301);
  }

  const nonce = createNonce();
  const customCode = isPublicPath(pathname) ? await getWebCustomCode() : null;
  const dev = process.env.NODE_ENV === 'development';
  const csp = buildCsp({
    nonce,
    customCodeHosts: customCode?.allowedHosts,
    storage: storageOrigin(process.env, dev),
    media: mediaOrigin(process.env),
    dev,
  });
  // Next.js reads the nonce from the request's CSP header; the layouts read `x-nonce`.
  const headers = new Headers(request.headers);
  headers.set('content-security-policy', csp);
  headers.set('x-nonce', nonce);
  // The 404 page gets no params, so it reads the page language from here (components/not-found).
  const english = pathname === '/en' || pathname.startsWith('/en/');
  headers.set('x-mt-locale', english ? 'en' : 'ka');

  let response: NextResponse;
  if (english) {
    response = NextResponse.next({ request: { headers } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/ka${pathname}`;
    url.search = search;
    headers.set(REWRITTEN, rewriteToken);
    response = NextResponse.rewrite(url, { request: { headers } });
  }
  response.headers.set('content-security-policy', csp);
  return response;
}

/** The redirect target when `locale` or `theme` is in the query (other parameters kept, in their order). */
export function legacyParams(
  path: string,
  search: string,
): { url: string; theme: 'dark' | 'light' | null } | null {
  const query = new URLSearchParams(search);
  if (!query.has('locale') && !query.has('theme') && query.get('page') !== '1') return null;
  let target = path;
  if (query.has('locale')) {
    const bare = path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path;
    target = query.get('locale') === 'en' ? (bare === '/' ? '/en' : `/en${bare}`) : bare;
    query.delete('locale');
  }
  const value = query.get('theme');
  const theme = value === 'dark' || value === 'light' ? value : null;
  query.delete('theme');
  if (query.get('page') === '1') query.delete('page');
  const rest = query.toString();
  return { url: `${target}${rest ? `?${rest}` : ''}`, theme };
}

export const config = {
  // Everything except the API, Next internals and public files.
  matcher: ['/((?!api/|_next/|fonts/|brand/|favicon.ico|robots.txt|sitemap).*)'],
};
