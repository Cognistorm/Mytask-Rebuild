// Localized error messages from the shared i18n files (ADR-006 §2: `Accept-Language: ka|en`, default ka).
import en from '@mytask/i18n/en.json';
import ka from '@mytask/i18n/ka.json';
import type { ErrorCode } from './api-exception';

type Locale = 'ka' | 'en';
const bundles: Record<Locale, Record<string, string>> = { ka, en };

/**
 * Default message key per common code, for errors raised outside business code (routing, validator,
 * unexpected exceptions). Legacy keys; slice 01 (backend) confirms the per-code keys against spec 00.
 */
export const defaultMessageKeys: Partial<Record<ErrorCode, string>> = {
  NOT_FOUND: 't_page_not_fount',
  UNAUTHENTICATED: 't_unauthorized',
  FORBIDDEN: 't_forbidden',
  RATE_LIMITED: 't_too_many_requests',
};
export const FALLBACK_MESSAGE_KEY = 't_toast_something_went_wrong';

export function resolveLocale(acceptLanguage: string | undefined): Locale {
  // Only `ka` and `en` exist; anything else (or missing) is `ka` (ADR-006 §2).
  const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? '';
  return first === 'en' || first.startsWith('en-') ? 'en' : 'ka';
}

export function translate(
  key: string,
  locale: Locale,
  params: Record<string, unknown> = {},
): string {
  // English falls back to Georgian (Q-023); a missing key falls back to the generic message.
  const template =
    bundles[locale][key] ?? bundles.ka[key] ?? bundles[locale][FALLBACK_MESSAGE_KEY] ?? key;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
    params[name] === undefined ? '' : String(params[name]),
  );
}
