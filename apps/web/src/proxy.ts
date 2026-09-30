// Locale from the path only (ADR-006 §1): Georgian unprefixed, English under /en/.
// Internally every page lives under app/[locale]/, so `/x` is rewritten to `/ka/x`.
// A request for `/ka/...` is not a public URL: it is redirected (301) to the unprefixed form.
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) return NextResponse.next();
  if (pathname === '/ka' || pathname.startsWith('/ka/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 301);
  }
  const url = request.nextUrl.clone();
  url.pathname = `/ka${pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except the API, Next internals and public files.
  matcher: ['/((?!api/|_next/|fonts/|brand/|favicon.ico|robots.txt|sitemap).*)'],
};
