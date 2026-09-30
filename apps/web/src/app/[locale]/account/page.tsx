'use client';
// Signed-in placeholder for slice 01: who am I, the 2FA switch (AC-20, AC-21) and logout (AC-42).
// The real dashboards arrive with slice 02.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, AuthCard, Field, Submit } from '../../../components/auth/ui';
import { href, splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../../lib/client';

type Me = components['schemas']['Me'];

export default function AccountPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const [me, setMe] = useState<Me>();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const { fields, general } = splitErrors(err);

  const load = useCallback(async () => {
    const res = await api.GET('/me');
    if (res.error) {
      router.replace(`${href(locale, '/auth/login')}?next=${href(locale, '/account')}`);
      return;
    }
    setMe(res.data);
  }, [api, router, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    setErr(undefined);
    const res = await api.PUT('/me/two-factor', {
      body: { enabled: !me.twoFactorEnabled, currentPassword: password },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(res.data.notice?.message);
    setPassword('');
    void load();
  }

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    router.replace(href(locale, '/auth/login'));
  }

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
      {me.twoFactorAvailable && (
        <form onSubmit={toggle2fa} noValidate>
          <h2 className="mt-text-h3">{t('t_two_factor_auth')}</h2>
          <p className="auth-muted">{t('t_two_factor_auth_hint')}</p>
          <p data-testid="twofa-state">
            {t(me.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}
          </p>
          {notice && <Alert kind="success">{notice}</Alert>}
          {general && <Alert kind="error">{general}</Alert>}
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
        </form>
      )}
      <button type="button" className="auth-link-button" onClick={logout}>
        {t('t_logout')}
      </button>
    </AuthCard>
  );
}
