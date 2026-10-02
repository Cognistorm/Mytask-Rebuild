// Legacy edit URL `/seller/portfolio/edit/{uid}` → 301 to `/seller/portfolio/{uid}/edit` (url-map §5).
import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@mytask/i18n';
import { href } from '../../../../../../../lib/href';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; uid: string }> },
) {
  const { locale, uid } = await params;
  const target = href(
    isLocale(locale) ? locale : 'ka',
    `/seller/portfolio/${encodeURIComponent(uid)}/edit`,
  );
  return NextResponse.redirect(new URL(`${target}${request.nextUrl.search}`, request.url), 301);
}
