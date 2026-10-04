// Canonical and hreflang of public pages (url-map §8, spec 03 AC-37): absolute URLs on `APP_URL`; Georgian
// unprefixed, English under /en, `x-default` = Georgian. List pages keep `?page=N` (N > 1) and drop filters and
// sort. Search results are `noindex, follow` with `/search` as canonical.
import type { Metadata } from 'next';
import type { Locale } from '@mytask/i18n';
import { href } from './href';

export function siteUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3100').replace(/\/+$/, '');
}

/** `alternates` for a page available in both languages at `path` (without the /en prefix). */
export function alternates(locale: Locale, path: string, page = 1): Metadata['alternates'] {
  const query = page > 1 ? `?page=${page}` : '';
  const abs = (l: Locale) => `${siteUrl()}${href(l, path)}${query}`;
  return {
    canonical: abs(locale),
    languages: { ka: abs('ka'), en: abs('en'), 'x-default': abs('ka') },
  };
}
