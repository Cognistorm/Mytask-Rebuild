'use client';
// Auth page panel (audit §3.8 centred panel). The form pieces (Field, TextArea, Submit, Alert, CodeInput)
// live in @mytask/ui/web since task 4.1.2. Its styles (auth.css) load in app/layout.tsx.
import type { ReactNode } from 'react';

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
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img className="auth-logo" src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
        <h1 id="auth-title" className="mt-text-h2">
          {title}
        </h1>
        {subtitle && <p className="auth-muted">{subtitle}</p>}
        {children}
      </section>
    </main>
  );
}
