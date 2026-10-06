// Theme of the page (spec 02 AC-35, S-105/S-106, Q-059; design tokens.md §2.4): the server renders
// `<html data-theme>` from the visitor's choice so there is no flash. The choice lives in the `mt_theme` cookie
// (written by the browser when the user switches, and synced from the account's `Me.theme` by the dashboard
// shell); no cookie = S-106. S-105 OFF = everyone gets S-106 (legacy `current_theme()`). The appearance settings
// come from getPublicConfig, cached 60 s per process like the custom code; any failure = light, switch on.
// Not `server-only`: the cookie name and the resolver are shared with the browser helper.
import { createApiClient } from '@mytask/api-client';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

export const THEME_COOKIE = 'mt_theme';

export interface Appearance {
  switcherEnabled: boolean;
  defaultTheme: Theme;
}

const FALLBACK: Appearance = { switcherEnabled: true, defaultTheme: 'light' };
const TTL_MS = 60_000;
let cached: { value: Appearance; until: number } | undefined;
let inFlight: Promise<Appearance> | undefined;

async function load(): Promise<Appearance> {
  try {
    const api = createApiClient({
      baseUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:3000/api/v1',
      client: 'web',
    });
    const { data } = await api.GET('/config/public', { signal: AbortSignal.timeout(1500) });
    if (!data) return FALLBACK;
    return {
      switcherEnabled: data.appearance.themeSwitcherEnabled,
      defaultTheme: data.appearance.defaultTheme,
    };
  } catch {
    return FALLBACK;
  }
}

export async function getAppearance(): Promise<Appearance> {
  if (cached && cached.until > Date.now()) return cached.value;
  inFlight ??= load().then((value) => {
    cached = { value, until: Date.now() + TTL_MS };
    inFlight = undefined;
    return value;
  });
  return inFlight;
}

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'system';
}

/**
 * The choice that applies: the saved one when the switch is on, else the platform default. `system` is
 * resolved in the browser (`prefers-color-scheme`); the server renders light for it until then.
 */
export function effectiveChoice(saved: unknown, appearance: Appearance): ThemeChoice {
  if (!appearance.switcherEnabled || !isThemeChoice(saved)) return appearance.defaultTheme;
  return saved;
}

/** Runs first in `<head>`: a `system` choice follows the device setting before the first paint. */
export const SYSTEM_THEME_SCRIPT =
  "(function(){var d=document.documentElement;if(d.dataset.themeChoice==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)d.dataset.theme='dark'})()";
