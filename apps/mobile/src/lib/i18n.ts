import { createInstance } from 'i18next';
import { i18nextOptions, type Locale } from '@mytask/i18n';

export function createT(locale: Locale) {
  const i18n = createInstance();
  // Resources are bundled, so initialisation is synchronous. Overrides from GET /i18n/{locale} are merged
  // at start-up when the translations slice lands (ADR-006 §4).
  void i18n.init({ ...i18nextOptions, lng: locale, initAsync: false });
  return i18n.t;
}
