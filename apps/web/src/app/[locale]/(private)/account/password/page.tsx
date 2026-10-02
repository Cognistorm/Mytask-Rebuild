'use client';
// Account → Password (spec 01 AC-35, AC-55, EC-3; legacy `Account/Password/PasswordComponent.php:96-155`).
// Current + new + confirmation; success keeps this session (the API ends the others). Social-only accounts
// (no password) get a notice instead of the form.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field, Submit } from '@mytask/ui/web';
import { AuthCard } from '../../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../../lib/client';

type Me = components['schemas']['Me'];

export default function ChangePasswordPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const [me, setMe] = useState<Me>();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const { fields, general } = splitErrors(err);

  useEffect(() => {
    void api.GET('/me').then((res) => {
      if (res.error) {
        router.replace(`${href(locale, '/auth/login')}?next=${href(locale, '/account/password')}`);
        return;
      }
      if (res.data.isRestricted) {
        router.replace(href(locale, '/restricted'));
        return;
      }
      setMe(res.data);
    });
  }, [api, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    setNotice(undefined);
    const res = await api.POST('/me/password', {
      body: { currentPassword: current, password, passwordConfirmation: confirm },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(res.data.message);
    setCurrent('');
    setPassword('');
    setConfirm('');
  }

  return (
    <AuthCard title={t('t_change_password')}>
      {!me && (
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      )}
      {me && !me.hasPassword && <Alert kind="info">{t('t_password_social_account_notice')}</Alert>}
      {me?.hasPassword && (
        <form onSubmit={onSubmit} noValidate>
          {notice && <Alert kind="success">{notice}</Alert>}
          {general && <Alert kind="error">{general}</Alert>}
          <Field
            label={t('t_current_password')}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={setCurrent}
            error={fields.currentPassword}
            showLabel={t('t_ui_show_password')}
            hideLabel={t('t_ui_hide_password')}
          />
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
          <Submit busy={busy}>{t('t_update')}</Submit>
        </form>
      )}
      <Link href={href(locale, '/account')}>{t('t_account_settings')}</Link>
    </AuthCard>
  );
}
