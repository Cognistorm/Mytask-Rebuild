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

/** A piece of a translated text: plain text, or a link whose `link` names the URL parameter it stood for. */
export interface TextPart {
  text: string;
  link?: string;
}

/**
 * Legacy strings carry links as HTML, e.g. `t_by_signup_u_agree_to_terms_privacy`:
 * `… <a href="{{privacy_url}}" class="…">privacy policy</a> …`. Translate them with each URL parameter set to its
 * own name (`{ privacy_url: 'privacy_url' }`) and split the result here, so apps render real links and never
 * inject HTML (QA BUG-04, ADR-006 §3). Any other markup is dropped.
 */
export function splitLegacyLinks(translated: string): TextPart[] {
  const parts: TextPart[] = [];
  const strip = (s: string) => s.replace(/<[^>]*>/g, '');
  const re = /<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis;
  let last = 0;
  for (const m of translated.matchAll(re)) {
    if (m.index! > last) parts.push({ text: strip(translated.slice(last, m.index)) });
    parts.push({ text: strip(m[2]!), link: m[1]! });
    last = m.index! + m[0].length;
  }
  if (last < translated.length) parts.push({ text: strip(translated.slice(last)) });
  return parts.filter((p) => p.text !== '');
}

/**
 * A free text (e.g. a staff reason) placed in the middle of a sentence that ends with its own full stop, as in
 * `t_portfolio_rejected_reason` "… Reason: {{reason}}. …": trims it and drops one final `.` so the text never
 * shows "..". (QA 4.1.26 BUG-04).
 */
export function inSentence(text: string | null | undefined): string {
  return (text ?? '').trim().replace(/\.$/, '');
}

export {
  contentLength,
  englishFieldIssue,
  georgianFieldIssue,
  normaliseContentText,
  type ContentLanguageIssue,
} from './content-language';
