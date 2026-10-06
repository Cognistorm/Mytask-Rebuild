'use client';
// Staff login (spec 16 AC-2, spec 01 AC-29/AC-51): username or e-mail + password, then the email code when
// staff 2FA (S-060) is ON and this browser is not trusted.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, CodeInput, Field, Submit } from '@mytask/ui/web';
import { AuthCard } from '../../components/ui';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

export default function AdminLogin() {
  const api = useAdminApi();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState<string>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/admin/auth/login', { body: { login, password } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    if (res.response.status === 202) {
      return setChallengeId((res.data as unknown as { challengeId: string }).challengeId);
    }
    router.replace('/settings');
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/admin/auth/2fa/verify', { body: { challengeId, code } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    router.replace('/settings');
  }

  if (challengeId) {
    return (
      <AuthCard title={t('t_2fa_enter_code_title')}>
        {err && <Alert kind="error">{err.message}</Alert>}
        <form onSubmit={onVerify} noValidate>
          <CodeInput label={t('t_ui_verification_code')} value={code} onChange={setCode} />
          <Submit busy={busy || code.length !== 6}>{t('t_continue')}</Submit>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('t_login')}>
      {general && <Alert kind="error">{general}</Alert>}
      <form onSubmit={onLogin} noValidate>
        <Field
          label={t('t_username_or_email_address')}
          name="login"
          autoComplete="username"
          required
          value={login}
          onChange={setLogin}
          error={fields.login}
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
        <Submit busy={busy}>{t('t_login')}</Submit>
      </form>
    </AuthCard>
  );
}
