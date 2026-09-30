// Shared UI strings for web, admin and mobile (ADR-006 §3). Flat `t_*` keys, i18next `{{param}}` syntax.
// Runtime overrides from `GET /api/v1/i18n/{locale}` are merged on top by each app (ADR-006 §4).
import en from '../en.json';
import ka from '../ka.json';

export const locales = ['ka', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ka';

export type TranslationKey = keyof typeof ka | keyof typeof en;
export type Messages = Record<string, string>;

export const resources: Record<Locale, Messages> = { ka, en };

/** i18next options shared by every app. English falls back to Georgian (Q-023, ADR-006 §6). */
export const i18nextOptions = {
  resources: {
    ka: { translation: ka as Messages },
    en: { translation: en as Messages },
  },
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  supportedLngs: [...locales],
  interpolation: { escapeValue: false }, // React escapes; strings contain no HTML (ADR-006 §3)
  returnNull: false,
} as const;

export function isLocale(value: unknown): value is Locale {
  return value === 'ka' || value === 'en';
}
