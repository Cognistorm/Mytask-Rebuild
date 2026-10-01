// Account → Security → Password on mobile (spec 01 AC-35, AC-55, EC-3; legacy
// `Account/Password/PasswordComponent.php:96-155`), as the web page `/account/password`. Success keeps this
// session (the API ends the others); social-only accounts (no password) get a notice instead of the form.
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { Button, Input, LinkButton, Notice, Screen } from '../../../components/form';
import { splitError, type ApiError } from '../../../components/reauth';
import { loadSession, mobileApi } from '../../../lib/api';
import { createT } from '../../../lib/i18n';

type Me = components['schemas']['Me'];

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function ChangePassword() {
  const [me, setMe] = useState<Me | 'loading' | 'signed-out'>('loading');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState<string>();
  const { field, general } = splitError(error);

  useEffect(() => {
    void (async () => {
      if (!(await loadSession())) return setMe('signed-out');
      const res = await api.GET('/me');
      setMe(res.data ?? 'signed-out');
    })();
  }, []);

  if (me === 'signed-out') return <Redirect href="/login" />;
  if (me !== 'loading' && me.isRestricted) return <Redirect href="/restricted" />;

  async function onSubmit() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    const res = await api.POST('/me/password', {
      body: { currentPassword: current, password, passwordConfirmation: confirm },
    });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    setNotice(res.data.message);
    setCurrent('');
    setPassword('');
    setConfirm('');
  }

  return (
    <Screen title={t('t_change_password')}>
      {me === 'loading' ? (
        <Text
          accessibilityRole="progressbar"
          style={{ ...theme.text.body, color: theme.colors.text.primary }}
        >
          {t('t_ui_loading')}
        </Text>
      ) : null}
      {me !== 'loading' && !me.hasPassword ? (
        <Notice kind="info" text={t('t_password_social_account_notice')} />
      ) : null}
      {me !== 'loading' && me.hasPassword ? (
        <>
          {notice ? <Notice kind="success" text={notice} /> : null}
          {general ? <Notice kind="error" text={general} /> : null}
          <Input
            label={t('t_current_password')}
            value={current}
            onChangeText={setCurrent}
            secure
            textContentType="password"
            error={field('currentPassword')}
          />
          <Input
            label={t('t_new_password')}
            value={password}
            onChangeText={setPassword}
            secure
            textContentType="newPassword"
            error={field('password')}
          />
          <Input
            label={t('t_password_confirmation')}
            value={confirm}
            onChangeText={setConfirm}
            secure
            textContentType="newPassword"
            error={field('passwordConfirmation')}
          />
          <Button label={t('t_update')} onPress={onSubmit} busy={busy} />
        </>
      ) : null}
      <LinkButton label={t('t_security_settings')} onPress={() => router.back()} />
    </Screen>
  );
}
