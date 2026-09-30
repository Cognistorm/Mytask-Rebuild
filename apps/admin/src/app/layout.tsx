import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'MyTask.ge admin',
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
