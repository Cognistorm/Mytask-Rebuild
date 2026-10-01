'use client';
// Spec 01 AC-10…AC-16, AC-22…AC-27, AC-37, AC-53: login, social buttons, then the email-code step when 2FA applies.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { SocialButtons } from '../../../../components/auth/social';
import { TwoFactorStep, type TwoFactorChallenge } from '../../../../components/auth/two-factor';
import { Alert, AuthCard, Field, Submit } from '../../../../components/auth/ui';
import {
  href,
  safeNext,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../lib/client';

function LoginForm() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [challenge, setChallenge] = useState<TwoFactorChallenge>();

  const done = () => router.push(safeNext(search.get('next'), href(locale, '/account')));
  const { fields, general } = splitErrors(err);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/login', { body: { email, password, rememberMe } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    if (res.response.status === 202) return setChallenge(res.data as unknown as TwoFactorChallenge);
    done();
  }

  if (challenge) return <TwoFactorStep challenge={challenge} onDone={done} />;

  return (
    <AuthCard title={t('t_welcome_back')}>
      {search.get('verified') && (
        <Alert kind="success">{t('t_ur_account_has_been_successfully_verified_email')}</Alert>
      )}
      {search.get('reset') && <Alert kind="success">{t('t_password_has_been_updated')}</Alert>}
      {general && <Alert kind="error">{general}</Alert>}
      {err?.code === 'ACCOUNT_PENDING' && err.details?.verificationMethod === 'email' && (
        <Link href={href(locale, '/auth/request')}>{t('t_resend_verification_email')}</Link>
      )}
      <form onSubmit={onLogin} noValidate>
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
        <Field
          label={t('t_password')}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          error={fields.password}
          showLabel={t('t_ui_show_password')}
          hideLabel={t('t_ui_hide_password')}
        />
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            {t('t_remember_me')}
          </label>
          <Link href={href(locale, '/auth/password/reset')}>{t('t_forgot_password')}</Link>
        </div>
        <Submit busy={busy}>{t('t_login')}</Submit>
      </form>
      {/* A `?ref=` link that lands here still reaches a new social account (AC-38); a malformed one is ignored. */}
      <SocialButtons
        referralCode={/^[A-Za-z0-9]{8}$/.test(search.get('ref') ?? '') ? search.get('ref') : null}
        next={search.get('next')}
      />
      <p className="auth-footer">
        <Link href={href(locale, '/auth/register')}>{t('t_create_account')}</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
