// Locale from the path only (ADR-006 §1): Georgian unprefixed, English under /en/.
// Internally every page lives under app/[locale]/, so `/x` is rewritten to `/ka/x`.
// A request for `/ka/...` is not a public URL: it is redirected (301) to the unprefixed form.
// Trailing slashes are removed here too (Next's own 308 is off, `skipTrailingSlashRedirect`), so
// `/ka/` reaches its final URL in one 301 hop (url-map §1 rules 3 and 5, QA P3 BUG-11).
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  let target = pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
  if (target === '/ka' || target.startsWith('/ka/')) target = target.slice(3) || '/';
  if (target !== pathname) {
    // A plain URL: NextURL would put the request's trailing slash back on.
    return NextResponse.redirect(new URL(`${target}${search}`, request.url), 301);
  }
  if (pathname === '/en' || pathname.startsWith('/en/')) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/ka${pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except the API, Next internals and public files.
  matcher: ['/((?!api/|_next/|fonts/|brand/|favicon.ico|robots.txt|sitemap).*)'],
};
