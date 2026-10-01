// Spec 01 set new password on mobile (AC-31, AC-33, AC-34), opened by the reset email's link
// `{APP_URL}[/en]/auth/password/update?token&email` (App Link, `+native-intent` drops `/en`) or
// `mytask://auth/password/update?token&email`. The link is checked before the form is shown.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { Button, Input, LinkButton, Notice, Screen } from '../../../components/form';
import { clearSession, mobileApi } from '../../../lib/api';
import { createT } from '../../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

interface ApiError {
  code?: string;
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default function UpdatePassword() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = one(params.token);
  const email = one(params.email);
  const [state, setState] = useState<'checking' | 'form' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();

  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  useEffect(() => {
    // A link without token or email cannot be valid: same as AUTH_LINK_INVALID → login (AC-34).
    if (!token || !email) return router.replace('/login');
    void api.POST('/auth/password-reset/validate', { body: { token, email } }).then((res) => {
      if (!res.error) return setState('form');
      if ((res.error as ApiError).code === 'AUTH_LINK_EXPIRED') return setState('expired');
      router.replace('/login');
    });
  }, [token, email]);

  async function onSubmit() {
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/auth/password-reset/complete', {
      body: { token, email, password, passwordConfirmation: confirm },
    });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    // The API ended every session of this user (AC-31), including one kept on this phone.
    await clearSession();
    router.replace({ pathname: '/login', params: { reset: '1' } });
  }

  return (
    <Screen title={t('t_update_password')} subtitle={t('t_update_password_subtitle')}>
      {state === 'checking' ? (
        <Text
          accessibilityRole="progressbar"
          style={{ ...theme.text.body, color: theme.colors.text.primary }}
        >
          {t('t_ui_loading')}
        </Text>
      ) : null}
      {state === 'expired' ? (
        <>
          <Notice kind="error" text={t('t_password_reset_link_expired')} />
          <LinkButton
            label={t('t_reset_password')}
            onPress={() => router.replace('/auth/password/reset')}
          />
        </>
      ) : null}
      {general ? <Notice kind="error" text={general} /> : null}
      {state === 'form' ? (
        <>
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
    </Screen>
  );
}
