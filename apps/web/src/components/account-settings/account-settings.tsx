'use client';
// Account settings (spec 02 AC-29…AC-35, EC-12; legacy `Account/Settings/SettingsComponent.php:156-354` and
// `account/settings/settings.blade.php`): username, email, full name, city, confirmed with the current password
// (`updateMe`). No country field (Georgia only; Owner 2026-10-02, ADR-021). Accounts without a password (social login only, Q-144) confirm only an email change,
// with a code emailed to the current address (`email_change` challenge). A new email waits for its link
// (AC-30, P-18: pending banner from `Me.pendingEmail`). Delete account with the legacy confirm dialog (AC-32…AC-34).
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, CodeInput, Dialog, Field, Skeleton, Submit } from '@mytask/ui/web';
import { href, splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { useDashboard } from '../dashboard/shell';
import { Block } from '../profile-edit/block';
import { AccountNav } from './account-nav';
import '../profile-edit/edit.css';
import './settings.css';

type Me = components['schemas']['Me'];
type Challenge = components['schemas']['TwoFactorChallenge'];
type UpdateBody = components['schemas']['MeUpdateRequest'];

interface Form {
  username: string;
  email: string;
  fullName: string;
  city: string;
}

const formOf = (me: Me): Form => ({
  username: me.username,
  email: me.email,
  fullName: me.fullName,
  city: me.city ?? '',
});

export function AccountSettings() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { me, setMe } = useDashboard();
  const [form, setForm] = useState<Form>();
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<Challenge>();
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<{ text: string; pending: boolean }>();
  const [deleting, setDeleting] = useState<'confirm' | 'busy'>();
  const [deleteErr, setDeleteErr] = useState<string>();
  const { fields, general } = splitErrors(err);

  // The form starts from the account once the shell has loaded it.
  useEffect(() => {
    if (me && !form) setForm(formOf(me));
  }, [me, form]);

  // The resend countdown of the emailed code (spec 01 AC-27 limits apply).
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  if (!me || !form) return <Skeleton label={t('t_ui_loading')} rows={6} />;

  const set = (key: keyof Form) => (value: string) => setForm((f) => f && { ...f, [key]: value });
  const emailChanged = form.email.trim().toLowerCase() !== me.email.toLowerCase();
  // AC-29 / EC-12: only an email change of an account without a password needs the emailed code.
  const needsCode = !me.hasPassword && emailChanged;
  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000))
    : 0;

  async function sendCode() {
    setBusy(true);
    setErr(undefined);
    setNotice(undefined);
    const res = await api.POST('/me/two-factor/challenges', { body: { purpose: 'email_change' } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setChallenge(res.data);
    setCode('');
    setNow(Date.now());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !form) return;
    // Only what changed is sent (omitted fields stay as they are).
    const body: UpdateBody = {};
    if (form.username.trim() !== me.username) body.username = form.username.trim();
    if (emailChanged) body.email = form.email.trim();
    if (form.fullName.trim() !== me.fullName) body.fullName = form.fullName.trim();
    if (form.city.trim() !== (me.city ?? '')) body.city = form.city.trim();
    if (me.hasPassword) body.currentPassword = password;
    else if (needsCode && challenge) {
      body.challengeId = challenge.challengeId;
      body.code = code;
    }
    setBusy(true);
    setErr(undefined);
    setNotice(undefined);
    const res = await api.PATCH('/me', { body });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setMe(res.data);
    setForm(formOf(res.data));
    setPassword('');
    setChallenge(undefined);
    setCode('');
    setNotice(
      body.email && res.data.pendingEmail
        ? { text: t('t_email_change_pending', { email: res.data.pendingEmail }), pending: true }
        : { text: t('t_ur_account_settings_updated'), pending: false },
    );
  }

  async function deleteAccount() {
    setDeleting('busy');
    setDeleteErr(undefined);
    const res = await api.DELETE('/me');
    if (res.error) {
      setDeleting('confirm');
      setDeleteErr((res.error as ApiErrorBody).message);
      return;
    }
    // Legacy: logged out and sent home. The home page is in the public root layout (full page load).
    window.location.assign(href(locale, '/'));
  }

  return (
    <div className="mt-edit" data-testid="account-settings">
      <h1 className="mt-edit-title">{t('t_account_settings')}</h1>
      <div className="mt-edit-layout">
        <div className="mt-edit-side">
          <AccountNav t={t} locale={locale} me={me} current="settings" />
        </div>
        <div className="mt-edit-main">
          {/* AC-30: the open email-change link (also after a reload, from `Me.pendingEmail`). */}
          {me.pendingEmail && !notice?.pending && (
            <Alert kind="info">
              <span data-testid="pending-email">
                {t('t_email_change_pending', { email: me.pendingEmail })}
              </span>
            </Alert>
          )}
          <Block title={t('t_account_settings')} testId="settings-form">
            <form className="mt-edit-form" onSubmit={save} noValidate>
              {notice && <Alert kind="success">{notice.text}</Alert>}
              {general && <Alert kind="error">{general}</Alert>}
              <div className="mt-edit-grid">
                <Field
                  label={t('t_username')}
                  name="username"
                  autoComplete="username"
                  required
                  maxLength={60}
                  placeholder={t('t_enter_username')}
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
                  maxLength={60}
                  placeholder={t('t_enter_email_address')}
                  value={form.email}
                  onChange={set('email')}
                  error={fields.email}
                />
                <Field
                  label={t('t_fullname')}
                  name="fullName"
                  autoComplete="name"
                  required
                  maxLength={60}
                  placeholder={t('t_enter_fullname')}
                  value={form.fullName}
                  onChange={set('fullName')}
                  error={fields.fullName}
                />
                <Field
                  label={t('t_city')}
                  name="city"
                  autoComplete="address-level2"
                  maxLength={60}
                  placeholder={t('t_enter_city')}
                  value={form.city}
                  onChange={set('city')}
                  error={fields.city}
                />
              </div>
              {me.hasPassword && (
                <Field
                  label={t('t_password')}
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder={t('t_enter_your_current_password')}
                  value={password}
                  onChange={setPassword}
                  error={fields.currentPassword}
                  showLabel={t('t_ui_show_password')}
                  hideLabel={t('t_ui_hide_password')}
                />
              )}
              {needsCode && (
                <div className="mt-settings-code" data-testid="email-code">
                  <p className="mt-edit-block-hint">{t('t_confirm_with_email_code')}</p>
                  {challenge && (
                    <>
                      <Alert kind="info">{challenge.notice.message}</Alert>
                      <CodeInput
                        label={t('t_ui_verification_code')}
                        value={code}
                        onChange={setCode}
                      />
                      {fields.code && <p className="auth-error">{fields.code}</p>}
                    </>
                  )}
                  <div>
                    <button
                      type="button"
                      className="mt-button"
                      disabled={wait > 0 || busy}
                      data-testid="send-code"
                      onClick={() => void sendCode()}
                    >
                      {wait > 0
                        ? t('t_2fa_resend_wait', { seconds: wait })
                        : t('t_2fa_resend_code')}
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-edit-buttons">
                <Submit busy={busy || (needsCode && (!challenge || code.length !== 6))}>
                  {t('t_update')}
                </Submit>
              </div>
            </form>
          </Block>
          <section className="mt-edit-block mt-settings-danger" data-testid="danger-zone">
            <div className="mt-edit-block-head">
              <h2 className="mt-edit-block-title">{t('t_delete_account')}</h2>
              <button
                type="button"
                className="mt-button mt-button-danger"
                data-testid="delete-account"
                onClick={() => {
                  setDeleteErr(undefined);
                  setDeleting('confirm');
                }}
              >
                {t('t_delete_account')}
              </button>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={t('t_confirm_delete_account')}
        description={t('t_delete_account_warning')}
        closeLabel={t('t_ui_close')}
        testId="delete-account-dialog"
      >
        {deleteErr && <Alert kind="error">{deleteErr}</Alert>}
        <div className="mt-edit-buttons">
          <button type="button" className="mt-button" onClick={() => setDeleting(undefined)}>
            {t('t_cancel')}
          </button>
          <button
            type="button"
            className="mt-button mt-button-danger"
            disabled={deleting === 'busy'}
            aria-busy={deleting === 'busy'}
            onClick={() => void deleteAccount()}
          >
            {t('t_delete')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
