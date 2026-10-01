import { createInstance } from 'i18next';
import { i18nextOptions, type Locale } from '@mytask/i18n';

export function createT(locale: Locale) {
  const i18n = createInstance();
  // Resources are bundled, so initialisation is synchronous.
  void i18n.init({ ...i18nextOptions, lng: locale, initAsync: false });
  return i18n.t;
}
