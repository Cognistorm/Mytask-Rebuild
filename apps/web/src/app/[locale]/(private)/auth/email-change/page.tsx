'use client';
// Spec 02 AC-30 (P-18): the email-change link from EV-11, `/auth/email-change?token=` (handoff 4.1.11). Works with
// or without a session (the link may be opened on another device): signed in → back to Account settings, which
// reads `getMe` again; signed out → login.
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Alert } from '@mytask/ui/web';
import { AuthCard } from '../../../../../components/auth/ui';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../../../../lib/client';

function ConfirmEmailChange() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const search = useSearchParams();
  const [done, setDone] = useState<{ message: string; signedIn: boolean }>();
  const [err, setErr] = useState<ApiErrorBody>();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const token = search.get('token') ?? '';
    // SEC-48: the link token leaves the address bar (history, screenshots, Referer) once read.
    window.history.replaceState(null, '', window.location.pathname);
    void api.POST('/auth/email-change/confirm', { body: { token } }).then(async (res) => {
      if (res.error) return setErr(res.error as ApiErrorBody);
      const me = await api.GET('/me');
      setDone({ message: res.data.message, signedIn: !!me.data });
    });
  }, [api, search]);

  return (
    <AuthCard title={t('t_confirm_new_email')}>
      {done ? (
        <>
          <Alert kind="success">{done.message}</Alert>
          {done.signedIn ? (
            <Link href={href(locale, '/account/settings')}>{t('t_account_settings')}</Link>
          ) : (
            <Link href={href(locale, '/auth/login')}>{t('t_login')}</Link>
          )}
        </>
      ) : err ? (
        <>
          <Alert kind="error">{err.message}</Alert>
          <Link href={href(locale, '/account/settings')}>{t('t_account_settings')}</Link>
        </>
      ) : (
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      )}
    </AuthCard>
  );
}

export default function EmailChangePage() {
  return (
    <Suspense>
      <ConfirmEmailChange />
    </Suspense>
  );
}
