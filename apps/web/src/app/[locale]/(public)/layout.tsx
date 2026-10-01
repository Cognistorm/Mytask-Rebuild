// Root layout of the PUBLIC pages (spec 16 AC-73 allow-list, ADR-019 §2): the only place that renders the
// S-110 custom code. React cannot place raw HTML inside <head>, so the head slot is emitted first in <body>
// (scripts behave the same); the footer slot comes last. Keep src/lib/zones.ts in step with this folder.
import type { ReactNode } from 'react';
import {
  Document,
  documentContext,
  documentMetadata,
  generateLocaleParams,
} from '../../../components/document';
import { getWebCustomCode, withNonce } from '../../../lib/custom-code';

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
      {children}
    </Document>
  );
}
