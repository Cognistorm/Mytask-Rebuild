'use client';
// Dashboard shell of every `/seller/*` and `/account/*` dashboard page (spec 02 AC-1…AC-5; design
// docs/05-design/screens/07-dashboard-switcher.md): sidebar with the side's navigation, top bar with the
// Buying / Selling switcher and the account menu. The switch saves the side on the account
// (`updateMyPreferences`, AC-3), so web and mobile open the same dashboard next time; no new login (AC-2).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { components } from '@mytask/types';
import {
  AccountMenu,
  DashboardLayout,
  RoleSwitcher,
  SidebarNav,
  type DashboardSide,
} from '@mytask/ui/web';
import { href, useApi, useLocale, useT } from '../../lib/client';
import { usePublicConfig, type PublicConfig } from '../../lib/public-config';
import { dashboardHome, navItems, switchTarget } from './nav';
import './dashboard.css';

type Me = components['schemas']['Me'];

interface DashboardContextValue {
  me: Me | undefined;
  /** Replaces the account after a save that returns `Me` (account settings: the menu shows the new username). */
  setMe: (me: Me) => void;
  config: PublicConfig | undefined;
  /** Link to the other side (twin page or its home) that also saves the choice. */
  otherSide: { href: string; onSelect: () => void };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard outside DashboardShell');
  return ctx;
}

export function DashboardShell({
  side,
  active,
  children,
}: {
  side: DashboardSide;
  active?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const pathname = usePathname();
  const config = usePublicConfig(locale);
  const [me, setMe] = useState<Me>();

  useEffect(() => {
    let live = true;
    void api.GET('/me').then((res) => {
      if (!live) return;
      if (res.error) {
        router.replace(`${href(locale, '/auth/login')}?next=${encodeURIComponent(pathname)}`);
        return;
      }
      // Restricted users only reach the restrictions removal center (spec 01 AC-19).
      if (res.data.isRestricted) {
        router.replace(href(locale, '/restricted'));
        return;
      }
      setMe(res.data);
    });
    return () => {
      live = false;
    };
  }, [api, router, locale, pathname]);

  const choose = useCallback(
    (to: DashboardSide) => {
      if (me?.lastDashboard === to) return;
      void api.PATCH('/me/preferences', { body: { lastDashboard: to } }).then((res) => {
        if (res.data) setMe(res.data);
      });
    },
    [api, me?.lastDashboard],
  );

  const other: DashboardSide = side === 'selling' ? 'buying' : 'selling';
  const otherHref = href(locale, switchTarget(side, active, config));
  const sideHref = (s: DashboardSide) => (s === side ? pathname : otherHref);

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    router.replace(href(locale, '/auth/login'));
  }

  const navLabel = t(side === 'selling' ? 't_selling_navigation' : 't_buying_navigation');

  return (
    <DashboardContext.Provider
      value={{ me, setMe, config, otherSide: { href: otherHref, onSelect: () => choose(other) } }}
    >
      <DashboardLayout
        side={side}
        logo={
          // A plain link: the home page is in the public root layout (full page load, ADR-019 §2).
          <a href={href(locale, '/')}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
          </a>
        }
        sidebar={(close) => (
          <SidebarNav
            label={navLabel}
            side={side}
            badge={t(side === 'selling' ? 't_seller_dashboard' : 't_buyer_dashboard')}
            items={navItems(side, config, locale, t)}
            activeKey={active}
            Link={Link}
            onNavigate={close}
          />
        )}
        switcher={
          <RoleSwitcher
            label={t('t_dashboard_switcher')}
            current={side}
            Link={Link}
            items={(['buying', 'selling'] as const).map((s) => ({
              side: s,
              label: t(s === 'buying' ? 't_buying' : 't_selling'),
              href: sideHref(s),
              onSelect: () => choose(s),
            }))}
          />
        }
        accountMenu={
          <AccountMenu
            label={t('t_account_menu')}
            trigger={<span data-testid="account-menu-name">{me?.username ?? '…'}</span>}
          >
            {me && (
              <p className="mt-account-menu-caption">
                {t('t_logged_in_as_username', { username: me.username })}
              </p>
            )}
            {me && (
              <Link href={href(locale, `/profile/${me.username}`)}>{t('t_view_profile')}</Link>
            )}
            <Link href={href(locale, '/account/profile')} data-testid="menu-edit-profile">
              {t('t_edit_profile')}
            </Link>
            <Link href={otherHref} onClick={() => choose(other)} data-testid="menu-switch">
              {t(other === 'selling' ? 't_switch_to_selling' : 't_switch_to_buying')}
            </Link>
            <Link href={href(locale, '/account/settings')} data-testid="menu-settings">
              {t('t_account_settings')}
            </Link>
            <Link href={href(locale, '/account/password')}>{t('t_update_password')}</Link>
            <button type="button" onClick={() => void logout()}>
              {t('t_logout')}
            </button>
          </AccountMenu>
        }
        openMenuLabel={t('t_ui_open_menu')}
        closeLabel={t('t_ui_close')}
      >
        {children}
      </DashboardLayout>
    </DashboardContext.Provider>
  );
}

/** Link to the dashboard the user chose last (AC-3; the API answers `buying` for a user who never chose). */
export function lastDashboardHref(
  locale: ReturnType<typeof useLocale>,
  me: Me,
  config?: PublicConfig,
): string {
  return href(locale, dashboardHome(me.lastDashboard, config));
}
