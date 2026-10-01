// Root layout of every NON-public page (auth, account, restricted, app-return; later seller, cart, checkout,
// payment, inbox): never renders custom code, always served with the strict CSP (spec 16 AC-73, ADR-019 §2).
// A separate root layout makes every navigation between public and private pages a full page load.
import type { ReactNode } from 'react';
import {
  Document,
  documentContext,
  documentMetadata,
  generateLocaleParams,
} from '../../../components/document';

export const metadata = documentMetadata;
export const generateStaticParams = generateLocaleParams;

export default async function PrivateLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await documentContext(params);
  return <Document locale={locale}>{children}</Document>;
}
