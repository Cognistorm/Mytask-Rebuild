// Account → Settings on mobile (spec 02 AC-29…AC-34, EC-12; screens table "password confirm field (accounts without
// a password: "Send code" + 6-digit code field when the email changes); wrong or expired code; email-change pending
// banner (P-18); delete-account danger zone with the dialog"), the same fields, texts, rules and ops as the web
// `/account/settings` (legacy `Account/Settings/SettingsComponent.php:156-354`): username, email, full name, city,
// confirmed with the current password (`updateMe`); no country field (Georgia only, Q-162, ADR-021). Accounts
// without a password (social login only, Q-144) confirm only an email change, with a code emailed to the current
// address (`email_change` challenge). A new email waits for its link (AC-30), which opens the website page
// `/auth/email-change`. Delete account with the legacy warning in a bottom sheet (AC-32…AC-34).
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { SecondaryButton, Skeleton } from '../../components/dashboard';
import { Button, Input, LinkButton, Notice, Screen } from '../../components/form';
import { BottomSheet } from '../../components/profile';
import { Block } from '../../components/profile-edit/block';
import type { ApiError } from '../../components/reauth';
import { clearSession, loadSession, mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

type Me = components['schemas']['Me'];
type Challenge = components['schemas']['TwoFactorChallenge'];
type UpdateBody = components['schemas']['MeUpdateRequest'];

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

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

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'ready'; me: Me };

export default function AccountSettingsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) {
      return setState(me?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    setState(me.data.isRestricted ? { kind: 'restricted' } : { kind: 'ready', me: me.data });
  }, []);

  useEffect(() => void load(), [load]);

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  return (
    <Screen title={t('t_account_settings')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={6} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <Settings me={state.me} onSaved={(me) => setState({ kind: 'ready', me })} />
      ) : null}
    </Screen>
  );
}

function Settings({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const [form, setForm] = useState<Form>(() => formOf(me));
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<Challenge>();
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError>();
  const [notice, setNotice] = useState<{ text: string; pending: boolean }>();
  const [deleting, setDeleting] = useState<'confirm' | 'busy'>();
  const [deleteErr, setDeleteErr] = useState<string>();

  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;

  // The resend countdown of the emailed code (spec 01 AC-27 limits apply).
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
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
    const res = await api
      .POST('/me/two-factor/challenges', { body: { purpose: 'email_change' } })
      .catch(() => undefined);
    setBusy(false);
    if (!res?.data) {
      return setErr((res?.error as ApiError) ?? { message: t('t_toast_something_went_wrong') });
    }
    setChallenge(res.data);
    setCode('');
    setNow(Date.now());
  }

  async function save() {
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
    const res = await api.PATCH('/me', { body }).catch(() => undefined);
    setBusy(false);
    if (!res?.data) {
      return setErr((res?.error as ApiError) ?? { message: t('t_toast_something_went_wrong') });
    }
    onSaved(res.data);
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
    const res = await api.DELETE('/me').catch(() => undefined);
    if (!res || res.error) {
      setDeleting('confirm');
      // AC-32 / AC-33: the refusal reason (active orders or projects, balance) shows in the sheet.
      setDeleteErr(
        (res?.error as ApiError | undefined)?.message ?? t('t_toast_something_went_wrong'),
      );
      return;
    }
    // Legacy: logged out and sent home; the app's start is the login screen once signed out.
    await clearSession();
    setDeleting(undefined);
    router.replace('/login');
  }

  return (
    <>
      {/* AC-30: the open email-change link (also after a reload, from `Me.pendingEmail`). */}
      {me.pendingEmail && !notice?.pending ? (
        <Notice kind="info" text={t('t_email_change_pending', { email: me.pendingEmail })} />
      ) : null}

      <Block title={t('t_account_settings')} testID="settings-form">
        {notice ? <Notice kind="success" text={notice.text} /> : null}
        {general ? <Notice kind="error" text={general} /> : null}
        <Input
          label={t('t_username')}
          placeholder={t('t_enter_username')}
          textContentType="username"
          maxLength={60}
          value={form.username}
          onChangeText={set('username')}
          error={fields.username}
        />
        <Input
          label={t('t_email_address')}
          placeholder={t('t_enter_email_address')}
          keyboardType="email-address"
          textContentType="emailAddress"
          maxLength={60}
          value={form.email}
          onChangeText={set('email')}
          error={fields.email}
        />
        <Input
          label={t('t_fullname')}
          placeholder={t('t_enter_fullname')}
          textContentType="name"
          maxLength={60}
          value={form.fullName}
          onChangeText={set('fullName')}
          error={fields.fullName}
        />
        <Input
          label={t('t_city')}
          placeholder={t('t_enter_city')}
          maxLength={60}
          value={form.city}
          onChangeText={set('city')}
          error={fields.city}
        />
        {me.hasPassword ? (
          <Input
            label={t('t_password')}
            placeholder={t('t_enter_your_current_password')}
            secure
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            error={fields.currentPassword}
          />
        ) : null}
        {needsCode ? (
          <View style={s.code} testID="email-code">
            <Text style={s.hint}>{t('t_confirm_with_email_code')}</Text>
            {challenge ? (
              <>
                <Notice kind="info" text={challenge.notice.message} />
                <Input
                  label={t('t_ui_verification_code')}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  error={fields.code}
                />
              </>
            ) : null}
            {wait > 0 ? (
              <Notice kind="info" text={t('t_2fa_resend_wait', { seconds: wait })} />
            ) : (
              <LinkButton label={t('t_2fa_resend_code')} onPress={() => !busy && void sendCode()} />
            )}
          </View>
        ) : null}
        <Button
          label={t('t_update')}
          busy={busy}
          disabled={needsCode && (!challenge || code.length !== 6)}
          onPress={() => void save()}
        />
      </Block>

      <Block title={t('t_delete_account')} testID="danger-zone">
        <Button
          label={t('t_delete_account')}
          danger
          onPress={() => {
            setDeleteErr(undefined);
            setDeleting('confirm');
          }}
        />
      </Block>

      <BottomSheet
        open={!!deleting}
        onClose={() => deleting !== 'busy' && setDeleting(undefined)}
        title={t('t_confirm_delete_account')}
        closeLabel={t('t_ui_close')}
        testID="delete-account-sheet"
      >
        <Text style={s.body}>{t('t_delete_account_warning')}</Text>
        {deleteErr ? <Notice kind="error" text={deleteErr} /> : null}
        <View style={s.buttons}>
          <SecondaryButton label={t('t_cancel')} onPress={() => setDeleting(undefined)} />
          <Button
            label={t('t_delete')}
            danger
            busy={deleting === 'busy'}
            onPress={() => void deleteAccount()}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  code: { gap: theme.space[2] },
  hint: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  buttons: { gap: theme.space[2] },
});
