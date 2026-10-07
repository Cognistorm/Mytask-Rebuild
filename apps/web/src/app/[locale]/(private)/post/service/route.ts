// Legacy `/post/service` → 301 to `/create` (spec 04 AC-1; url-map).
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@mytask/i18n';
import { href } from '../../../../../lib/href';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const target = href(isLocale(locale) ? locale : 'ka', '/create');
  return NextResponse.redirect(new URL(`${target}${request.nextUrl.search}`, request.url), 301);
}
