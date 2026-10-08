// Legacy `/seller/gigs/analytics/{uid}` → 301 to `/seller/gigs/{uid}/analytics` (url-map §5: "301 for the id forms"; the legacy
// id is the gig uid, `gigs.blade.php`).
import type { NextRequest } from 'next/server';
import { isLocale } from '@mytask/i18n';
import { href } from '../../../../../../../lib/href';
import { permanentRedirect } from '../../../../../../../lib/permanent-redirect';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string; uid: string }> },
) {
  const { locale, uid } = await params;
  const target = href(
    isLocale(locale) ? locale : 'ka',
    `/seller/gigs/${encodeURIComponent(uid)}/analytics`,
  );
  return permanentRedirect(target);
}
