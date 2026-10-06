// The web's 404 page (QA 4.1.26 BUG-01, spec 02 AC-9): legacy `errors/404.blade.php` texts in the page language,
// with a way back home. Rendered by the `not-found.tsx` of both root layouts, so `notFound()` from a page and an
// unknown URL (the `[...missing]` catch-all) look the same. A not-found file gets no params: the locale comes from
// the proxy's `x-mt-locale` request header. Next.js answers HTTP 404 and adds `noindex` on its own.
import 'server-only';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getT, toLocale } from '../../lib/i18n';
import { href } from '../../lib/href';
import { pageTitle } from '../../lib/page-title';
import './not-found.css';

export async function NotFoundView() {
  const locale = toLocale((await headers()).get('x-mt-locale') ?? undefined);
  const t = await getT(locale);
  const heading = t('t_page_not_fount');
  return (
    <main className="mt-not-found" data-testid="not-found">
      {/* React 19 hoists this into <head>; a not-found file cannot export metadata. */}
      <title>{await pageTitle(locale, heading)}</title>
      <p className="mt-not-found-code" aria-hidden="true">
        404
      </p>
      <div className="mt-not-found-body">
        <h1 className="mt-not-found-title">{heading}</h1>
        <p className="mt-not-found-text">{t('t_pls_check_url_address_bar_try_again')}</p>
        <Link className="mt-not-found-home" href={href(locale, '/')}>
          {t('t_back_to_homepage')}
        </Link>
      </div>
    </main>
  );
}
