// Spec 01 login on mobile (AC-10…AC-16) with the email-code step (AC-22…AC-27) and social login
// (AC-37…AC-41). Mobile stays signed in.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Input, LinkButton, Notice, Screen } from '../components/form';
import { SocialButtons } from '../components/social';
import { TwoFactorStep } from '../components/two-factor';
import { getDeviceToken, mobileApi, saveSession } from '../lib/api';
import { createT } from '../lib/i18n';
import type { TwoFactorChallenge } from '../lib/social';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<TwoFactorChallenge>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();

  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  async function onLogin() {
    setBusy(true);
    setError(undefined);
    const deviceToken = await getDeviceToken();
    const res = await api.POST('/auth/login', { body: { email, password, deviceToken } });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    if (res.response.status === 202) return setChallenge(res.data as unknown as TwoFactorChallenge);
    await saveSession(res.data as never);
    router.replace('/');
  }

  if (challenge) {
    return (
      <TwoFactorStep locale={locale} challenge={challenge} onDone={() => router.replace('/')} />
    );
  }

  return (
    <Screen title={t('t_welcome_back')}>
      {general ? <Notice kind="error" text={general} /> : null}
      <Input
        label={t('t_email_address')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={field('email')}
      />
      <Input
        label={t('t_password')}
        value={password}
        onChangeText={setPassword}
        secure
        textContentType="password"
        error={field('password')}
      />
      <Button label={t('t_login')} onPress={onLogin} busy={busy} />
      <SocialButtons
        locale={locale}
        onSignedIn={() => router.replace('/')}
        onChallenge={setChallenge}
      />
      <LinkButton label={t('t_create_account')} onPress={() => router.push('/register')} />
    </Screen>
  );
}
