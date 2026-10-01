// `/app-return/auth/{provider}` (url-map §7, ADR-002 §7): the https return of a social login started in the
// app. With the app installed the App Link never reaches this page. Without it, the browser lands here: the
// page only says to finish in the app. It never reads or forwards `code` / `state` — only the app holds the
// PKCE verifier (SEC-09) — and sends no Referer, so the one-time code does not leak through the Login link.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert, AuthCard } from '../../../../../components/auth/ui';
import { getT, toLocale } from '../../../../../lib/i18n';
import type { SocialProvider } from '../../../../../lib/public-config';

const PROVIDERS = [
  'google',
  'facebook',
  'github',
  'linkedin',
  'twitter',
] as const satisfies readonly SocialProvider[];

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function AppReturnSocialPage({
  params,
}: {
  params: Promise<{ locale: string; provider: string }>;
}) {
  const { locale: raw, provider } = await params;
  if (!(PROVIDERS as readonly string[]).includes(provider)) notFound();
  const locale = toLocale(raw);
  const t = await getT(locale);
  return (
    <AuthCard title={t('t_app_return_social_title')}>
      <Alert kind="info">{t('t_app_return_social_notice')}</Alert>
      <p className="auth-footer">
        <Link href={locale === 'en' ? '/en/auth/login' : '/auth/login'}>{t('t_login')}</Link>
      </p>
    </AuthCard>
  );
}
