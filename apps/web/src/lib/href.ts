// Locale-aware paths, for server and client components alike.
import type { Locale } from '@mytask/i18n';

/** Georgian unprefixed, English under /en (ADR-006 §1). */
export function href(locale: Locale, path: string): string {
  return locale === 'en' ? `/en${path === '/' ? '' : path}` : path;
}

/** A path segment as Next.js passed it: decoded once, left as is when it is not valid percent-encoding. */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
