'use client';
// Account area side card (spec 02 AC-35; legacy `components/main/account/sidebar.blade.php`, audit §3.6): avatar,
// username, then the account links. Billing, payment methods, subscription and referrals join with their
// slices (specs 05, 09); the theme switch (S-105) with task 4.1.20d.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Avatar } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { href, useApi } from '../../lib/client';

type Me = components['schemas']['Me'];

export type AccountPage = 'settings' | 'profile' | 'password' | 'verification' | 'sessions';

export function AccountNav(props: { t: TFunction; locale: Locale; me: Me; current: AccountPage }) {
  const { t, locale, me } = props;
  const api = useApi(locale);
  const router = useRouter();
  const links: { key: AccountPage; path: string; label: string }[] = [
    { key: 'settings', path: '/account/settings', label: t('t_account_settings') },
    { key: 'profile', path: '/account/profile', label: t('t_edit_profile') },
    { key: 'password', path: '/account/password', label: t('t_update_password') },
    { key: 'verification', path: '/account/verification', label: t('t_verification_center') },
    { key: 'sessions', path: '/account/sessions', label: t('t_browser_sessions') },
  ];

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    router.replace(href(locale, '/auth/login'));
  }

  return (
    <nav className="mt-edit-card mt-account-nav" aria-label={t('t_account_settings')}>
      <Avatar image={me.avatar} name={me.username} size="xl" />
      <p className="mt-edit-username">{me.username}</p>
      <ul className="mt-edit-links">
        {links.map((l) => (
          <li key={l.key}>
            <Link
              href={href(locale, l.path)}
              aria-current={l.key === props.current ? 'page' : undefined}
            >
              {l.label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="mt-edit-link" onClick={() => void logout()}>
            {t('t_logout')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
