'use client';
// Signed-in placeholder for slice 01: who am I, the 2FA switch (AC-20, AC-21) and logout (AC-42).
// The switch asks for the current password, or for an account without one (social login only) a
// `toggle_two_factor` code emailed to the account (SEC-05, Q-144; as the app, task 3.12). "My dashboard" opens
// the dashboard chosen last (spec 02 AC-3); account settings proper are `/account/settings` (task 4.1.20a).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, CodeInput, Field, Submit } from '@mytask/ui/web';
import { AuthCard } from '../../../../components/auth/ui';
import { lastDashboardHref } from '../../../../components/dashboard/shell';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../lib/client';
import { usePublicConfig } from '../../../../lib/public-config';

type Me = components['schemas']['Me'];
type Challenge = components['schemas']['TwoFactorChallenge'];

export default function AccountPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const config = usePublicConfig(locale);
  const [me, setMe] = useState<Me>();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const [challenge, setChallenge] = useState<Challenge>();
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const { fields, general } = splitErrors(err);

  const load = useCallback(async () => {
    const res = await api.GET('/me');
    if (res.error) {
      router.replace(`${href(locale, '/auth/login')}?next=${href(locale, '/account')}`);
      return;
    }
    // Restricted users only reach the restrictions removal center (spec 01 AC-19).
    if (res.data.isRestricted) {
      router.replace(href(locale, '/restricted'));
      return;
    }
    setMe(res.data);
  }, [api, router, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // The resend countdown of an emailed code (AC-27 limits apply).
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  async function sendCode() {
    setBusy(true);
    setErr(undefined);
    setNotice(undefined);
    const res = await api.POST('/me/two-factor/challenges', {
      body: { purpose: 'toggle_two_factor' },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setChallenge(res.data);
    setCode('');
    setNow(Date.now());
  }

  async function toggle2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    setErr(undefined);
    const res = await api.PUT('/me/two-factor', {
      body: challenge
        ? { enabled: !me.twoFactorEnabled, challengeId: challenge.challengeId, code }
        : { enabled: !me.twoFactorEnabled, currentPassword: password },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(res.data.notice?.message);
    setPassword('');
    setChallenge(undefined);
    setCode('');
    void load();
  }

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    router.replace(href(locale, '/auth/login'));
  }

  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000))
    : 0;

  if (!me) {
    return (
      <AuthCard title={t('t_account_settings')}>
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('t_account_settings')}>
      <dl className="account-list">
        <dt>{t('t_fullname')}</dt>
        <dd>{me.fullName}</dd>
        <dt>{t('t_username')}</dt>
        <dd>{me.username}</dd>
        <dt>{t('t_email_address')}</dt>
        <dd>{me.email}</dd>
        <dt>{t('t_referral_code')}</dt>
        <dd>{me.referralCode}</dd>
      </dl>
      <Link href={lastDashboardHref(locale, me, config)} data-testid="my-dashboard">
        {t('t_my_dashboard')}
      </Link>
      <Link href={href(locale, '/account/settings')} data-testid="settings-link">
        {t('t_account_settings')}
      </Link>
      <Link href={href(locale, '/account/profile')}>{t('t_edit_profile')}</Link>
      <Link href={href(locale, '/account/password')}>{t('t_change_password')}</Link>
      <Link href={href(locale, '/account/sessions')}>{t('t_browser_sessions')}</Link>
      {me.twoFactorAvailable && (
        <form onSubmit={toggle2fa} noValidate>
          <h2 className="mt-text-h3">{t('t_two_factor_auth')}</h2>
          <p className="auth-muted">{t('t_two_factor_auth_hint')}</p>
          <p data-testid="twofa-state">
            {t(me.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}
          </p>
          {notice && <Alert kind="success">{notice}</Alert>}
          {general && <Alert kind="error">{general}</Alert>}
          {me.hasPassword ? (
            <>
              <Field
                label={t('t_confirm_with_password')}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                error={fields.currentPassword}
                showLabel={t('t_ui_show_password')}
                hideLabel={t('t_ui_hide_password')}
              />
              <Submit busy={busy}>{t('t_submit')}</Submit>
            </>
          ) : challenge ? (
            <>
              <Alert kind="info">{challenge.notice.message}</Alert>
              <CodeInput label={t('t_ui_verification_code')} value={code} onChange={setCode} />
              {fields.code && <p className="auth-error">{fields.code}</p>}
              <Submit busy={busy || code.length !== 6}>{t('t_submit')}</Submit>
              <div className="auth-row">
                <button
                  type="button"
                  className="auth-link-button"
                  disabled={wait > 0 || busy}
                  onClick={() => void sendCode()}
                >
                  {wait > 0 ? t('t_2fa_resend_wait', { seconds: wait }) : t('t_2fa_resend_code')}
                </button>
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setChallenge(undefined);
                    setCode('');
                    setErr(undefined);
                  }}
                >
                  {t('t_cancel')}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="auth-button"
              disabled={busy}
              data-testid="twofa-send-code"
              onClick={() => void sendCode()}
            >
              {t('t_submit')}
            </button>
          )}
        </form>
      )}
      <button type="button" className="auth-link-button" onClick={logout}>
        {t('t_logout')}
      </button>
    </AuthCard>
  );
}
