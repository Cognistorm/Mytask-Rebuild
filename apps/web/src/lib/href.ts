// Locale-aware paths, for server and client components alike.
import type { Locale } from '@mytask/i18n';

/** Georgian unprefixed, English under /en (ADR-006 §1). */
export function href(locale: Locale, path: string): string {
  return locale === 'en' ? `/en${path === '/' ? '' : path}` : path;
}
