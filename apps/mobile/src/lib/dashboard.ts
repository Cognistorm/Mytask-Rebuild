// Dashboard navigation and side memory in the app (spec 02 AC-2…AC-5; design 07 "Native app"). The lists match
// the web (`apps/web/src/components/dashboard/nav.ts`, legacy `seller-app.blade.php`, `buyer-app.blade.php`);
// items behind a setting follow the public config (spec 00 AC-11) and stay hidden while it loads.
// An item shows only once its app screen exists (`screen`): the later slices fill these in, so the app never
// opens a dead end. Selling Home and the Buying projects landing are the first section of the Dashboard tab.
import { useSyncExternalStore } from 'react';
import type { components } from '@mytask/types';
import type { PublicConfig } from './public-config';

export type DashboardSide = components['schemas']['DashboardSide'];

interface NavDef {
  key: string;
  label: string;
  /** App route of the screen; omitted until the owning slice builds it. */
  screen?: string;
  show?: (c: PublicConfig) => boolean;
}

const projectsOn = (c: PublicConfig) => c.projects.enabled; // S-075
const offersOn = (c: PublicConfig) => c.customOffers.enabled; // S-034
const unblockOn = (c: PublicConfig) => c.escrow.unblockRequestAvailable; // S-025 / S-029 (P-5)

const SELLING: NavDef[] = [
  { key: 'orders', label: 't_orders' },
  { key: 'gigs', label: 't_gigs' },
  { key: 'projects', label: 't_awarded_projects', show: projectsOn },
  { key: 'offers', label: 't_personal_offers', show: offersOn },
  { key: 'reviews', label: 't_reviews' },
  { key: 'refunds', label: 't_refunds' },
  { key: 'unblock', label: 't_unblock_money_requests', show: unblockOn },
  { key: 'portfolio', label: 't_portfolio' },
  { key: 'earnings', label: 't_earnings' },
  { key: 'withdrawals', label: 't_withdrawals' },
];

const BUYING: NavDef[] = [
  { key: 'orders', label: 't_buy_services' },
  { key: 'offers', label: 't_personal_offers', show: offersOn },
  { key: 'reviews', label: 't_my_reviews' },
  { key: 'refunds', label: 't_refunds' },
  { key: 'favourites', label: 't_favorite_list' },
];

/** The side's navigation below its first section (Home / Projects): items with a screen, by setting. */
export function navItems(
  side: DashboardSide,
  config: PublicConfig | undefined,
): { key: string; label: string; screen: string }[] {
  return (side === 'selling' ? SELLING : BUYING).flatMap((d) =>
    d.screen && (!d.show || (config !== undefined && d.show(config)))
      ? [{ key: d.key, label: d.label, screen: d.screen }]
      : [],
  );
}

// The side shown by the Dashboard tab, shared with the Account tab's switcher. Seeded from `Me.lastDashboard`
// (Buying for users who never chose, AC-3); every switch is saved on the account by the caller.
let current: DashboardSide | undefined;
const listeners = new Set<() => void>();

export function setDashboardSide(side: DashboardSide): void {
  if (current === side) return;
  current = side;
  listeners.forEach((l) => l());
}

export function useDashboardSide(): DashboardSide | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
