'use client';
// The footer's language switch: the header's links with the browser's current path.
import type { Locale } from '@mytask/i18n';
import { useT } from '../../lib/client';
import { LanguageLinks } from './header-client';

export function FooterLanguage({ locale, label }: { locale: Locale; label: string }) {
  const t = useT(locale);
  return <LanguageLinks locale={locale} label={label} t={t} />;
}
