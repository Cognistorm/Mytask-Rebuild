// The `<html>` shell shared by the two root layouts (ADR-019 §2): `(public)` and `(private)` render the same
// document; only the public one adds the S-110 custom code. Both read the request header so every page is
// rendered per request, which lets Next.js put the proxy's CSP nonce on its own scripts.
import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
import '../styles/globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocale, locales, type Locale } from '@mytask/i18n';

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

export function Document({
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
  return (
    <html lang={locale} data-theme="light">
      <body>
        {bodyStart}
        {children}
        {bodyEnd}
      </body>
    </html>
  );
}
