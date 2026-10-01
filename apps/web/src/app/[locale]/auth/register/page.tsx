'use client';
// Spec 01 AC-1…AC-6, AC-37, AC-38: register (buyer + freelancer at once) or a social button; `?ref=CODE`
// pre-fills the referral code, which the social flow carries too.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { SocialButtons } from '../../../../components/auth/social';
import { Alert, AuthCard, Field, Submit } from '../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../lib/client';

function RegisterForm() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const search = useSearchParams();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    referralCode: search.get('ref') ?? '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [pending, setPending] = useState<string>();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const { fields, general } = splitErrors(err);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/register', {
      body: {
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
        acceptTerms: acceptTerms as true,
        referralCode: form.referralCode.trim().toUpperCase() || null,
      },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    if (res.data.outcome === 'logged_in') return router.push(href(locale, '/account'));
    setPending(res.data.notice?.message);
  }

  if (pending) {
    return (
      <AuthCard title={t('t_verify_email')}>
        <Alert kind="success">{pending}</Alert>
        <Link href={href(locale, '/auth/login')}>{t('t_login')}</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('t_create_account')}>
      {general && <Alert kind="error">{general}</Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label={t('t_fullname')}
          name="fullName"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={set('fullName')}
          error={fields.fullName}
        />
        <Field
          label={t('t_username')}
          name="username"
          autoComplete="username"
          required
          value={form.username}
          onChange={set('username')}
          error={fields.username}
        />
        <Field
          label={t('t_email_address')}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={fields.email}
        />
        <Field
          label={t('t_password')}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={set('password')}
          error={fields.password ?? undefined}
          showLabel={t('t_ui_show_password')}
          hideLabel={t('t_ui_hide_password')}
        />
        {!fields.password && <p className="auth-muted">{t('t_password_validation_message')}</p>}
        <Field
          label={t('t_referral_code_optional')}
          name="referralCode"
          value={form.referralCode}
          onChange={set('referralCode')}
          error={fields.referralCode}
        />
        <div className="auth-field">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              aria-invalid={!!fields.acceptTerms}
            />
            <span>
              {t('t_i_agree_terms_privacy', {
                terms: t('t_terms_of_service'),
                privacy: t('t_privacy_policy'),
              })}
            </span>
          </label>
          {fields.acceptTerms && (
            <p className="auth-error" role="alert">
              {fields.acceptTerms}
            </p>
          )}
        </div>
        <Submit busy={busy}>{t('t_signup')}</Submit>
      </form>
      <SocialButtons referralCode={form.referralCode} />
      <p className="auth-footer">
        {t('t_already_have_account')} <Link href={href(locale, '/auth/login')}>{t('t_login')}</Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
