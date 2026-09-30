'use client';
// Spec 01 AC-32, AC-36: always the same answer (no account enumeration).
import Link from 'next/link';
import { useState } from 'react';
import { Alert, AuthCard, Field, Submit } from '../../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../../lib/client';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [sent, setSent] = useState<string>();
  const { fields, general } = splitErrors(err);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/password-reset', { body: { email } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setSent(res.data.message);
  }

  return (
    <AuthCard title={t('t_reset_password')}>
      {sent && <Alert kind="success">{sent}</Alert>}
      {general && <Alert kind="error">{general}</Alert>}
      {!sent && (
        <form onSubmit={onSubmit} noValidate>
          <Field
            label={t('t_email_address')}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
            error={fields.email}
          />
          <Submit busy={busy}>{t('t_reset_password')}</Submit>
        </form>
      )}
      <p className="auth-footer">
        <Link href={href(locale, '/auth/login')}>{t('t_login')}</Link>
      </p>
    </AuthCard>
  );
}
