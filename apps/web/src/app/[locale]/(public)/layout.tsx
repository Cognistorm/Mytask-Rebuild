// Root layout of the PUBLIC pages (spec 16 AC-73 allow-list, ADR-019 §2): the only place that renders the
// S-110 custom code. React cannot place raw HTML inside <head>, so the head slot is emitted first in <body>
// (scripts behave the same); the footer slot comes last. Keep src/lib/zones.ts in step with this folder.
// Every public page gets the site header and footer (ROADMAP 4.2.9a); the skip link jumps over the header. The
// visitor's username goes to the client parts of the page (gig card hearts, 4.3.20b).
import type { ReactNode } from 'react';
import {
  Document,
  documentContext,
  documentMetadata,
  generateLocaleParams,
} from '../../../components/document';
import { SiteFooter } from '../../../components/site/site-footer';
import { SiteHeader } from '../../../components/site/site-header';
import { ViewerProvider } from '../../../components/site/viewer-context';
import { getWebCustomCode, withNonce } from '../../../lib/custom-code';
import { getT } from '../../../lib/i18n';
import { getViewer } from '../../../lib/site-data';

export const metadata = documentMetadata;
export const generateStaticParams = generateLocaleParams;

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale, nonce } = await documentContext(params);
  const [code, { viewer }] = await Promise.all([getWebCustomCode(), getViewer(locale)]);
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
        <ViewerProvider username={viewer?.username ?? null}>{children}</ViewerProvider>
      </div>
      <SiteFooter locale={locale} />
    </Document>
  );
}
