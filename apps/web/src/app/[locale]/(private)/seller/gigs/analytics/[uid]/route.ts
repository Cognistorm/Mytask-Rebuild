// Legacy `/seller/gigs/analytics/{uid}` → 301 to `/seller/gigs/{uid}/analytics` (url-map §5: "301 for the id forms"; the legacy
// id is the gig uid, `gigs.blade.php`).
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
    `/seller/gigs/${encodeURIComponent(uid)}/analytics`,
  );
  return NextResponse.redirect(new URL(target, request.url), 301);
}
