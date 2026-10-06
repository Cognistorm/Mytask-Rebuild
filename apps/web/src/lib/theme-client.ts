'use client';
// Browser side of the theme (see ./theme.ts): saves the choice in the cookie the server reads and applies it to
// the open page at once (no reload; legacy reloaded with `?theme=`).
import { THEME_COOKIE, type ThemeChoice, type Theme } from './theme';

const YEAR = 365 * 24 * 3600;

export function applyTheme(choice: ThemeChoice | null, defaultTheme: Theme): void {
  try {
    document.cookie =
      choice === null
        ? `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
        : `${THEME_COOKIE}=${choice}; Path=/; Max-Age=${YEAR}; SameSite=Lax`;
  } catch {
    // Cookies blocked: the page still switches; the next page load shows the default.
  }
  const effective = choice ?? defaultTheme;
  const dark =
    effective === 'dark' ||
    (effective === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const html = document.documentElement;
  const theme = dark ? 'dark' : 'light';
  html.dataset.themeChoice = effective;
  if (html.dataset.theme === theme) return;
  // F-3X18-1 (3X.21d): no transitions for the frame of the switch (foundation.css), so every surface takes its
  // new colours at once instead of starting a colour/shadow transition. Removed after that frame has painted.
  html.dataset.themeSwitching = '';
  html.dataset.theme = theme;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      delete html.dataset.themeSwitching;
    }),
  );
}

export function savedThemeCookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${THEME_COOKIE}=`))
    ?.slice(THEME_COOKIE.length + 1);
}
