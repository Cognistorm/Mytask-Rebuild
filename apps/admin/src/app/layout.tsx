import '@mytask/tokens/fonts.css';
import '@mytask/tokens/tokens.css';
// Gradient canvas, motion utilities, category theme helpers (3X.8): before every component stylesheet.
import '@mytask/ui/web/foundation.css';
// Every button class's look (3X.9a): global, so it applies whichever component stylesheets a route loads.
import '@mytask/ui/web/buttons.css';
// Text field, checkbox, radio and switch looks (3X.9b), global for the same reason.
import '@mytask/ui/web/controls.css';
// Card and panel surfaces and the card hover (3X.9d), global for the same reason.
import '@mytask/ui/web/surfaces.css';
// The dashboard frame and sidebar looks the admin shell is built on (4X.2).
import '@mytask/ui/web/dashboard.css';
import './globals.css';
// Admin page and auth panel styles (every admin screen uses them).
import '../components/auth.css';
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
