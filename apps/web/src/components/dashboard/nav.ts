// Dashboard navigation (spec 02 AC-4, AC-5; legacy `components/layouts/seller-app.blade.php`,
// `buyer-app.blade.php`; url-map §5). One source for desktop and the phone drawer (components.md §6.8).
// Items behind a setting follow the public config (spec 00 AC-11): hidden while it is loading.
import type { DashboardSide, SidebarItem } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { href } from '../../lib/client';
import type { PublicConfig } from '../../lib/public-config';
import type { Locale } from '@mytask/i18n';

interface NavDef {
  key: string;
  label: string;
  path: string;
  show?: (c: PublicConfig) => boolean;
  /** Same page on the other side: the switcher keeps the user on it (design 07 "Switching behaviour"). */
  twin?: string;
}

const projectsOn = (c: PublicConfig) => c.projects.enabled; // S-075
const offersOn = (c: PublicConfig) => c.customOffers.enabled; // S-034
const unblockOn = (c: PublicConfig) => c.escrow.unblockRequestAvailable; // S-025 / S-029 (P-5)

const SELLING: NavDef[] = [
  { key: 'home', label: 't_home', path: '/seller/home' },
  { key: 'orders', label: 't_orders', path: '/seller/orders', twin: 'orders' },
  { key: 'gigs', label: 't_gigs', path: '/seller/gigs' },
  { key: 'projects', label: 't_awarded_projects', path: '/seller/projects', show: projectsOn },
  {
    key: 'offers',
    label: 't_personal_offers',
    path: '/seller/offers',
    show: offersOn,
    twin: 'offers',
  },
  { key: 'reviews', label: 't_reviews', path: '/seller/reviews', twin: 'reviews' },
  { key: 'refunds', label: 't_refunds', path: '/seller/refunds', twin: 'refunds' },
  {
    key: 'unblock',
    label: 't_unblock_money_requests',
    path: '/seller/unblock-requests',
    show: unblockOn,
  },
  { key: 'portfolio', label: 't_portfolio', path: '/seller/portfolio' },
  { key: 'earnings', label: 't_earnings', path: '/seller/earnings' },
  { key: 'withdrawals', label: 't_withdrawals', path: '/seller/withdrawals' },
];

const BUYING: NavDef[] = [
  { key: 'projects', label: 't_ordered_projects', path: '/account/projects', show: projectsOn },
  { key: 'orders', label: 't_buy_services', path: '/account/orders', twin: 'orders' },
  {
    key: 'offers',
    label: 't_personal_offers',
    path: '/account/offers',
    show: offersOn,
    twin: 'offers',
  },
  { key: 'reviews', label: 't_my_reviews', path: '/account/reviews', twin: 'reviews' },
  { key: 'refunds', label: 't_refunds', path: '/account/refunds', twin: 'refunds' },
  { key: 'favourites', label: 't_favorite_list', path: '/account/favorite' },
];

const NAV: Record<DashboardSide, NavDef[]> = { selling: SELLING, buying: BUYING };

export function navItems(
  side: DashboardSide,
  config: PublicConfig | undefined,
  locale: Locale,
  t: TFunction,
): SidebarItem[] {
  return NAV[side]
    .filter((d) => !d.show || (config !== undefined && d.show(config)))
    .map((d) => ({ key: d.key, label: t(d.label), href: href(locale, d.path) }));
}

/**
 * Landing page of a side: Selling → Home; Buying → Projects (legacy), or Orders while projects are OFF
 * (S-075 hides the Projects item, design 07 "States").
 */
export function dashboardHome(side: DashboardSide, config: PublicConfig | undefined): string {
  if (side === 'selling') return '/seller/home';
  return config && !config.projects.enabled ? '/account/orders' : '/account/projects';
}

/** Where the switcher sends the user from `activeKey` on `from`: the twin page, else the other side's home. */
export function switchTarget(
  from: DashboardSide,
  activeKey: string | undefined,
  config: PublicConfig | undefined,
): string {
  const to: DashboardSide = from === 'selling' ? 'buying' : 'selling';
  const twin = NAV[from].find((d) => d.key === activeKey)?.twin;
  const target = twin && NAV[to].find((d) => d.key === twin);
  return target && (!target.show || (config && target.show(config)))
    ? target.path
    : dashboardHome(to, config);
}
