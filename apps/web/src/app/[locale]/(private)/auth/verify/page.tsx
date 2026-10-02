'use client';
// Spec 01 AC-7, AC-8: the verification link from the email.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Alert } from '@mytask/ui/web';
import { AuthCard } from '../../../../../components/auth/ui';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../../../../lib/client';

function Verify() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const search = useSearchParams();
  const [err, setErr] = useState<ApiErrorBody>();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const body = { token: search.get('token') ?? '', email: search.get('email') ?? '' };
    // SEC-48: the link token leaves the address bar (history, screenshots, Referer) once read.
    window.history.replaceState(null, '', window.location.pathname);
    void api.POST('/auth/email-verification/confirm', { body }).then((res) => {
      if (res.error) return setErr(res.error as ApiErrorBody);
      router.replace(`${href(locale, '/auth/login')}?verified=1`);
    });
  }, [api, search, router, locale]);

  return (
    <AuthCard title={t('t_verify_email')}>
      {err ? (
        <>
          <Alert kind="error">{err.message}</Alert>
          <Link href={href(locale, '/auth/request')}>{t('t_resend_verification_email')}</Link>
        </>
      ) : (
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      )}
    </AuthCard>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
