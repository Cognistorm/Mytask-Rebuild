'use client';
// Settings areas in the sidebar (docs/05-design/admin-refresh.md §4, task 4X.3): one item per area the API returns,
// in the contract `SettingArea` order. The list is loaded once per page load and kept here, so changing area or
// screen does not load it again.
import type { components } from '@mytask/types';
import type { ApiClient } from '@mytask/api-client';
import { t } from './client';

export type SettingArea = components['schemas']['SettingArea'];

/** Contract `SettingArea` enum order (docs/04-api/openapi.yaml). */
export const SETTING_AREAS = [
  'plans',
  'fees',
  'payments',
  'escrow',
  'withdrawals',
  'marketplace',
  'subscriptions',
  'auth',
  'moderation',
  'media',
  'chat',
  'notifications',
  'content',
  'custom_code',
  'system',
] as const satisfies readonly SettingArea[];

// Fails to compile when the contract gains an area this list does not have.
const everyArea: Exclude<SettingArea, (typeof SETTING_AREAS)[number]> extends never ? true : never =
  true;
void everyArea;

export const areaTitle = (area: SettingArea) => t(`t_settings_area_${area}`);
export const areaHref = (area: SettingArea) => `/settings?area=${area}`;

/** The areas present in a settings list, in contract order. */
export const areasOf = (rows: { area: SettingArea }[]): SettingArea[] =>
  SETTING_AREAS.filter((a) => rows.some((r) => r.area === a));

let known: SettingArea[] | undefined;
let loading: Promise<SettingArea[] | undefined> | undefined;

export const knownAreas = () => known;

export function rememberAreas(areas: SettingArea[]) {
  known = areas;
}

/** Signing out forgets the list (the next staff member may see other areas). */
export function forgetAreas() {
  known = undefined;
  loading = undefined;
}

/** Loads the list once; a failed load is not kept, so the next screen tries again. */
export function loadAreas(api: ApiClient): Promise<SettingArea[] | undefined> {
  if (known) return Promise.resolve(known);
  loading ??= api.GET('/admin/settings', { params: { query: {} } }).then((res) => {
    loading = undefined;
    if (res.error) return undefined;
    known = areasOf(res.data.settings);
    return known;
  });
  return loading;
}
