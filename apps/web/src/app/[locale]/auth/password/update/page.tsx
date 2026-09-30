'use client';
// Spec 01 AC-33, AC-34: the link from the email; the token is checked before the form is shown.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Alert, AuthCard, Field, Submit } from '../../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../../lib/client';

function UpdateForm() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const email = search.get('email') ?? '';
  const [state, setState] = useState<'checking' | 'form' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  useEffect(() => {
    void api.POST('/auth/password-reset/validate', { body: { token, email } }).then((res) => {
      if (!res.error) return setState('form');
      if ((res.error as ApiErrorBody).code === 'AUTH_LINK_EXPIRED') return setState('expired');
      router.replace(href(locale, '/auth/login'));
    });
  }, [api, token, email, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/password-reset/complete', {
      body: { token, email, password, passwordConfirmation: confirm },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    router.push(`${href(locale, '/auth/login')}?reset=1`);
  }

  return (
    <AuthCard title={t('t_update_password')}>
      {state === 'expired' && (
        <>
          <Alert kind="error">{t('t_password_reset_link_expired')}</Alert>
          <Link href={href(locale, '/auth/password/reset')}>{t('t_reset_password')}</Link>
        </>
      )}
      {general && <Alert kind="error">{general}</Alert>}
      {state === 'form' && (
        <form onSubmit={onSubmit} noValidate>
          <Field
            label={t('t_new_password')}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={setPassword}
            error={fields.password}
            showLabel={t('t_ui_show_password')}
            hideLabel={t('t_ui_hide_password')}
          />
          <Field
            label={t('t_password_confirmation')}
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={setConfirm}
            error={fields.passwordConfirmation}
            showLabel={t('t_ui_show_password')}
            hideLabel={t('t_ui_hide_password')}
          />
          <Submit busy={busy}>{t('t_update_password')}</Submit>
        </form>
      )}
    </AuthCard>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdateForm />
    </Suspense>
  );
}
