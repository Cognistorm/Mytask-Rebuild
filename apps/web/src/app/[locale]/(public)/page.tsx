// Phase 3 placeholder home: proves tokens, fonts, i18n and the generated API client work end to end.
// The real home page is built in its slice from docs/05-design/screens/01-home.md.
import Link from 'next/link';
import type { Locale } from '@mytask/i18n';
import { serverApi } from '../../../lib/api';
import { getT, toLocale } from '../../../lib/i18n';

export const dynamic = 'force-dynamic';

async function isApiUp(locale: Locale): Promise<boolean> {
  try {
    const { data } = await serverApi(locale).GET('/health', { signal: AbortSignal.timeout(2000) });
    return data?.status === 'ok';
  } catch {
    return false;
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const [t, apiUp] = await Promise.all([getT(locale), isApiUp(locale)]);
  const prefix = locale === 'en' ? '/en' : '';

  return (
    <main className="shell">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimizer needed */}
      <img className="shell-logo" src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
      <h1 className="mt-text-h2">{t('t_home')}</h1>
      <p data-testid="api-status" data-up={apiUp} className={apiUp ? 'ok' : 'down'}>
        {t(apiUp ? 't_platform_api_status_ok' : 't_platform_api_status_unreachable')}
      </p>
      {/* Until the real header (slice 02): ways into the private pages (a full page load, ADR-019 §2). */}
      <nav aria-label={t('t_account_settings')}>
        <Link href={`${prefix}/auth/login`}>{t('t_login')}</Link> ·{' '}
        <Link href={`${prefix}/account`}>{t('t_account_settings')}</Link>
      </nav>
      {/* Legacy language-switcher keys `ka` / `en` (IMPORT-REPORT.md, non-t_* legacy keys). */}
      <nav aria-label={t('t_language')}>
        <Link href="/" hrefLang="ka">
          {t('ka')}
        </Link>{' '}
        ·{' '}
        <Link href="/en" hrefLang="en">
          {t('en')}
        </Link>
      </nav>
    </main>
  );
}
