'use client';
// Admin top bar: the screens built so far; links hidden when the permission is missing (cosmetic, AC-9).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { t, useAdminApi } from '../lib/client';

type Me = components['schemas']['AdminMe'];

export function AdminNav({ onMe }: { onMe?: (me: Me) => void }) {
  const api = useAdminApi();
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me>();

  useEffect(() => {
    void api.GET('/admin/me').then((res) => {
      if (res.error) return router.replace('/login');
      setMe(res.data);
      onMe?.(res.data);
    });
    // Load once per page.
  }, []);

  const can = (p: Me['permissions'][number]) =>
    !!me && (me.isSuperAdmin || me.permissions.includes(p));
  const links = [
    { href: '/settings', label: t('t_settings'), show: can('settings.read') },
    { href: '/security', label: t('t_banned_ips'), show: can('security.ip_bans') },
    { href: '/restrictions', label: t('t_user_restrictions'), show: can('users.read') },
    { href: '/portfolio', label: t('t_portfolios'), show: can('portfolio.moderate') },
    { href: '/kyc', label: t('t_verifications'), show: can('kyc.review') },
    { href: '/account', label: t('t_change_password'), show: !!me },
  ];

  async function logout() {
    await api.POST('/admin/auth/logout');
    router.replace('/login');
  }

  return (
    <header className="admin-header">
      <nav aria-label={t('t_admin_navigation')} className="admin-nav">
        {links
          .filter((l) => l.show)
          .map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
      </nav>
      <span className="auth-muted">{me?.fullName}</span>
      <button type="button" className="auth-link-button" onClick={logout}>
        {t('t_logout')}
      </button>
    </header>
  );
}
