// Georgian fallback for translatable content (ADR-006 §6, CONVENTIONS "Reads", spec 03 AC-4, R-S9): each field in
// the requested language, the Georgian text where the English one is missing or empty, and `contentLocale: ka` on
// the resource as soon as one shown field fell back.
import type { Locale } from '@mytask/types';

type Row = { locale: Locale };

export function localized<T extends Row, F extends keyof T & string>(
  rows: readonly T[],
  locale: Locale,
  fields: readonly [F, ...F[]],
): { values: { [K in F]: string | null }; contentLocale: Locale; hasEnglish: boolean } {
  const ka = rows.find((r) => r.locale === 'ka');
  const en = rows.find((r) => r.locale === 'en');
  const text = (row: T | undefined, f: F) => {
    const v = row?.[f];
    return typeof v === 'string' && v.trim() !== '' ? v : null;
  };
  const values = {} as { [K in F]: string | null };
  let contentLocale: Locale = locale;
  for (const f of fields) {
    const wanted = text(locale === 'en' ? en : ka, f);
    // A Georgian request never shows English body text; only a row without a Georgian name borrows the English one.
    const fallback = locale === 'en' || f === fields[0] ? text(locale === 'en' ? ka : en, f) : null;
    if (wanted === null && fallback !== null) contentLocale = locale === 'en' ? 'ka' : 'en';
    values[f] = wanted ?? fallback;
  }
  return { values, contentLocale, hasEnglish: text(en, fields[0]) !== null };
}
