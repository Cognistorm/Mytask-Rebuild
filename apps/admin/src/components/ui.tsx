'use client';
// Auth page panel (audit §3.8 centred panel). The form pieces (Field, TextArea, Submit, Alert, CodeInput)
// live in @mytask/ui/web since task 4.1.2. Its styles (auth.css) load in app/layout.tsx. The logo carries the
// "Admin" pill, as in the sidebar (4X.7).
import type { ReactNode } from 'react';
import { t } from '../lib/client';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="admin-auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img
            className="auth-logo"
            src="/brand/mytask-logo-wordmark-trimmed.png"
            alt="MyTask.ge"
          />
          <span className="admin-brand-label">{t('t_dashboard')}</span>
        </span>
        <h1 id="auth-title" className="mt-text-h2">
          {title}
        </h1>
        {subtitle && <p className="auth-muted">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
