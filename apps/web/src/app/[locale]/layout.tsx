import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
import './globals.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocale, locales } from '@mytask/i18n';

export const metadata: Metadata = {
  title: 'MyTask.ge',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} data-theme="light">
      <body>{children}</body>
    </html>
  );
}
