// Server-side translation for a request's locale (ADR-006 §3). Admin overrides from
// GET /api/v1/i18n/{locale} (ADR-006 §4) are merged here when the translations slice lands.
import { createInstance, type TFunction } from 'i18next';
import { i18nextOptions, isLocale, type Locale } from '@mytask/i18n';

export function toLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : 'ka';
}

export async function getT(locale: Locale): Promise<TFunction> {
  const i18n = createInstance();
  await i18n.init({ ...i18nextOptions, lng: locale });
  return i18n.t;
}
