// Spec 01 email verification on mobile (AC-7, AC-8), opened by the VerifyEmail link
// `{APP_URL}[/en]/auth/verify?token&email` (App Link, `+native-intent` drops `/en`) or
// `mytask://auth/verify?token&email`. No session is created: success goes to login.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { LinkButton, Notice, Screen } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = one(params.token);
  const email = one(params.email);
  const [error, setError] = useState<string>();
  // The link is single-use: confirm it once even if the screen re-renders.
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    void api.POST('/auth/email-verification/confirm', { body: { token, email } }).then((res) => {
      // Expired (`t_verification_email_link_expired`) or unknown (`t_verification_email_not_exists`).
      if (res.error) return setError((res.error as { message: string }).message);
      router.replace({ pathname: '/login', params: { verified: '1' } });
    });
  }, [token, email]);

  return (
    <Screen card title={t('t_verify_email')}>
      {error ? (
        <>
          <Notice kind="error" text={error} />
          <LinkButton
            label={t('t_resend_verification_email')}
            onPress={() => router.replace({ pathname: '/auth/request', params: { email } })}
          />
        </>
      ) : (
        <Text
          accessibilityRole="progressbar"
          style={{ ...theme.text.body, color: theme.colors.text.primary }}
        >
          {t('t_ui_loading')}
        </Text>
      )}
    </Screen>
  );
}
