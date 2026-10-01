import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createT } from '../lib/i18n';

export const metadata: Metadata = {
  // Georgian until staff language arrives (slice 16, see AdminLayout).
  title: createT('ka')('t_platform_admin_document_title'),
  robots: { index: false, follow: false },
};

// Staff language comes from the staff account (slice 16); Georgian until then.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ka" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
