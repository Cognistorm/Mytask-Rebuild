// Legacy `/post/service` → 301 to `/create` (spec 04 AC-1; url-map).
import type { NextRequest } from 'next/server';
import { isLocale } from '@mytask/i18n';
import { href } from '../../../../../lib/href';
import { permanentRedirect } from '../../../../../lib/permanent-redirect';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const target = href(isLocale(locale) ? locale : 'ka', '/create');
  return permanentRedirect(`${target}${request.nextUrl.search}`);
}
