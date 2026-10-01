// Locale from the path only (ADR-006 §1): Georgian unprefixed, English under /en/.
// Internally every page lives under app/[locale]/, so `/x` is rewritten to `/ka/x`.
// A request for `/ka/...` is not a public URL: it is redirected (301) to the unprefixed form.
// Trailing slashes are removed here too (Next's own 308 is off, `skipTrailingSlashRedirect`), so
// `/ka/` reaches its final URL in one 301 hop (url-map §1 rules 3 and 5, QA P3 BUG-11).
// Every page gets a Content-Security-Policy with a fresh nonce (ADR-013 §5): the strict one, plus the S-127
// custom-code hosts on public pages only (spec 16 AC-73/AC-74, ADR-019 §2).
import { type NextRequest, NextResponse } from 'next/server';
import { buildCsp, createNonce } from './lib/csp';
import { getWebCustomCode } from './lib/custom-code';
import { isPublicPath } from './lib/zones';

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  let target = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  if (target === '/ka' || target.startsWith('/ka/')) target = target.slice(3) || '/';
  if (target !== pathname) {
    // A plain URL: NextURL would put the request's trailing slash back on.
    return NextResponse.redirect(new URL(`${target}${search}`, request.url), 301);
  }

  const nonce = createNonce();
  const customCode = isPublicPath(pathname) ? await getWebCustomCode() : null;
  const csp = buildCsp({
    nonce,
    customCodeHosts: customCode?.allowedHosts,
    dev: process.env.NODE_ENV === 'development',
  });
  // Next.js reads the nonce from the request's CSP header; the layouts read `x-nonce`.
  const headers = new Headers(request.headers);
  headers.set('content-security-policy', csp);
  headers.set('x-nonce', nonce);

  let response: NextResponse;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    response = NextResponse.next({ request: { headers } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/ka${pathname}`;
    url.search = search;
    response = NextResponse.rewrite(url, { request: { headers } });
  }
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  // Everything except the API, Next internals and public files.
  matcher: ['/((?!api/|_next/|fonts/|brand/|favicon.ico|robots.txt|sitemap).*)'],
};
