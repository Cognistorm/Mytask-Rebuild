'use client';
// Spec 01 AC-10…AC-16, AC-22…AC-27, AC-53: login, then the email-code step when 2FA applies.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Alert, AuthCard, CodeInput, Field, Submit } from '../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../lib/client';

interface Challenge {
  challengeId: string;
  resendAvailableAt: string;
  notice: { message: string };
}

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
  const [challenge, setChallenge] = useState<Challenge>();
  const [code, setCode] = useState('');
  const [info, setInfo] = useState<string>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const done = () => router.push(search.get('next') ?? href(locale, '/account'));
  const { fields, general } = splitErrors(err);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/login', { body: { email, password, rememberMe } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    if (res.response.status === 202) {
      const c = res.data as unknown as Challenge;
      setChallenge(c);
      setInfo(c.notice.message);
      return;
    }
    done();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/2fa/verify', {
      body: { challengeId: challenge.challengeId, code },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    done();
  }

  async function onResend() {
    if (!challenge) return;
    setErr(undefined);
    const res = await api.POST('/auth/2fa/resend', {
      body: { challengeId: challenge.challengeId },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    const c = res.data as unknown as Challenge;
    setChallenge(c);
    setCode('');
    setInfo(c.notice.message);
  }

  if (challenge) {
    const wait = Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000));
    return (
      <AuthCard title={t('t_2fa_enter_code_title')}>
        {info && <Alert kind="info">{info}</Alert>}
        {err && <Alert kind="error">{err.message}</Alert>}
        <form onSubmit={onVerify} noValidate>
          <CodeInput label={t('t_ui_verification_code')} value={code} onChange={setCode} />
          <Submit busy={busy || code.length !== 6}>{t('t_continue')}</Submit>
        </form>
        <div className="auth-row">
          <button type="button" className="auth-link-button" disabled={wait > 0} onClick={onResend}>
            {wait > 0 ? t('t_2fa_resend_wait', { seconds: wait }) : t('t_2fa_resend_code')}
          </button>
        </div>
      </AuthCard>
    );
  }

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
