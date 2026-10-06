// The `<html>` shell shared by the two root layouts (ADR-019 §2): `(public)` and `(private)` render the same
// document; only the public one adds the S-110 custom code. Both read the request header so every page is
// rendered per request, which lets Next.js put the proxy's CSP nonce on its own scripts. The theme comes from the
// visitor's `mt_theme` cookie and S-105/S-106 (lib/theme.ts, spec 02 AC-35).
import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
// Gradient canvas, motion utilities, category theme helpers (3X.8): before every component stylesheet.
import '@mytask/ui/web/foundation.css';
import '../styles/globals.css';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocale, locales, type Locale } from '@mytask/i18n';
import { effectiveChoice, getAppearance, SYSTEM_THEME_SCRIPT, THEME_COOKIE } from '../lib/theme';

export const documentMetadata: Metadata = {
  title: 'MyTask.ge',
};

export function generateLocaleParams() {
  return locales.map((locale) => ({ locale }));
}

/** The page language (404 for anything else) and the CSP nonce the proxy set for this request. */
export async function documentContext(
  params: Promise<{ locale: string }>,
): Promise<{ locale: Locale; nonce: string }> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const nonce = (await headers()).get('x-nonce') ?? '';
  return { locale, nonce };
}

export async function Document({
  locale,
  children,
  bodyStart,
  bodyEnd,
}: {
  locale: Locale;
  children: ReactNode;
  bodyStart?: ReactNode;
  bodyEnd?: ReactNode;
}) {
  const [jar, head, appearance] = await Promise.all([cookies(), headers(), getAppearance()]);
  const choice = effectiveChoice(jar.get(THEME_COOKIE)?.value, appearance);
  return (
    // The browser may change data-theme before hydration (`system` script, theme switch).
    <html
      lang={locale}
      data-theme={choice === 'dark' ? 'dark' : 'light'}
      data-theme-choice={choice}
      suppressHydrationWarning
    >
      <body>
        {/* Before any content, so a `system` choice is applied before the first paint. */}
        {choice === 'system' && (
          <script
            nonce={head.get('x-nonce') ?? ''}
            dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }}
          />
        )}
        {bodyStart}
        {children}
        {bodyEnd}
      </body>
    </html>
  );
}
