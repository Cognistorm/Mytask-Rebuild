'use client';
// The staff member's own password (spec 16 AC-6): other sessions end, this one stays.
import { useState } from 'react';
import { AdminShell } from '../../components/shell';
import { Alert, Field, Submit } from '@mytask/ui/web';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

export default function AccountPage() {
  const api = useAdminApi();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [done, setDone] = useState(false);
  const { fields, general } = splitErrors(err);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    setDone(false);
    const res = await api.POST('/admin/me/password', {
      body: { currentPassword: current, newPassword: next, newPasswordConfirmation: confirm },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setDone(true);
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  const pw = {
    type: 'password',
    showLabel: t('t_ui_show_password'),
    hideLabel: t('t_ui_hide_password'),
  };
  return (
    <AdminShell>
      <h1 className="mt-text-h2">{t('t_change_password')}</h1>
      {done && <Alert kind="success">{t('t_ur_account_password_updated')}</Alert>}
      {general && <Alert kind="error">{general}</Alert>}
      <form className="admin-section admin-stack" onSubmit={submit} noValidate>
        <Field
          {...pw}
          label={t('t_current_password')}
          name="currentPassword"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          error={fields.currentPassword}
        />
        <Field
          {...pw}
          label={t('t_new_password')}
          name="newPassword"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          error={fields.newPassword}
        />
        <p className="auth-muted">{t('t_password_validation_message')}</p>
        <Field
          {...pw}
          label={t('t_password_confirmation')}
          name="newPasswordConfirmation"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={fields.newPasswordConfirmation}
        />
        <Submit busy={busy}>{t('t_change_password')}</Submit>
      </form>
    </AdminShell>
  );
}
