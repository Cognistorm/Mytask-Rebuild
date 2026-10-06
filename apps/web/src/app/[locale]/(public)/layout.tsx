// Root layout of the PUBLIC pages (spec 16 AC-73 allow-list, ADR-019 §2): the only place that renders the
// S-110 custom code. React cannot place raw HTML inside <head>, so the head slot is emitted first in <body>
// (scripts behave the same); the footer slot comes last. Keep src/lib/zones.ts in step with this folder.
// Every public page gets the site header and footer (ROADMAP 4.2.9a); the skip link jumps over the header.
import type { ReactNode } from 'react';
import {
  Document,
  documentContext,
  documentMetadata,
  generateLocaleParams,
} from '../../../components/document';
import { SiteFooter } from '../../../components/site/site-footer';
import { SiteHeader } from '../../../components/site/site-header';
import { getWebCustomCode, withNonce } from '../../../lib/custom-code';
import { getT } from '../../../lib/i18n';

export const metadata = documentMetadata;
export const generateStaticParams = generateLocaleParams;

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale, nonce }, code] = await Promise.all([
    documentContext(params),
    getWebCustomCode(),
  ]);
  const t = await getT(locale);
  const slot = (name: string, html: string | null | undefined) =>
    html ? (
      <div data-custom-code={name} dangerouslySetInnerHTML={{ __html: withNonce(html, nonce) }} />
    ) : null;
  return (
    <Document
      locale={locale}
      bodyStart={slot('head', code?.head)}
      bodyEnd={slot('footer', code?.footer)}
    >
      <a className="mt-skip-link" href="#mt-content">
        {t('t_skip_to_content')}
      </a>
      <SiteHeader locale={locale} />
      <div id="mt-content" tabIndex={-1}>
        {children}
      </div>
      <SiteFooter locale={locale} />
    </Document>
  );
}
