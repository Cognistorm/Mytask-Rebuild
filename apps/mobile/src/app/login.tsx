// Spec 01 login on mobile (AC-10…AC-16) with the email-code step (AC-22…AC-27). Mobile stays signed in.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Input, LinkButton, Notice, Screen } from '../components/form';
import { getDeviceToken, mobileApi, saveSession } from '../lib/api';
import { createT } from '../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}
interface Challenge {
  challengeId: string;
  resendAvailableAt: string;
  notice: { message: string };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  async function onLogin() {
    setBusy(true);
    setError(undefined);
    const deviceToken = await getDeviceToken();
    const res = await api.POST('/auth/login', { body: { email, password, deviceToken } });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    if (res.response.status === 202) return setChallenge(res.data as unknown as Challenge);
    await saveSession(res.data as never);
    router.replace('/');
  }

  async function onVerify() {
    if (!challenge) return;
    setBusy(true);
    setError(undefined);
    const deviceToken = await getDeviceToken();
    const res = await api.POST('/auth/2fa/verify', {
      body: { challengeId: challenge.challengeId, code, deviceToken },
    });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    await saveSession(res.data);
    router.replace('/');
  }

  async function onResend() {
    if (!challenge) return;
    const res = await api.POST('/auth/2fa/resend', {
      body: { challengeId: challenge.challengeId },
    });
    if (res.error) return setError(res.error as ApiError);
    setChallenge(res.data as unknown as Challenge);
    setCode('');
  }

  if (challenge) {
    const wait = Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000));
    return (
      <Screen title={t('t_2fa_enter_code_title')}>
        <Notice kind="info" text={challenge.notice.message} />
        {error ? <Notice kind="error" text={error.message} /> : null}
        <Input
          label={t('t_ui_verification_code')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
        />
        <Button label={t('t_continue')} onPress={onVerify} busy={busy} />
        {wait > 0 ? (
          <Notice kind="info" text={t('t_2fa_resend_wait', { seconds: wait })} />
        ) : (
          <LinkButton label={t('t_2fa_resend_code')} onPress={onResend} />
        )}
      </Screen>
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
      <LinkButton label={t('t_create_account')} onPress={() => router.push('/register')} />
    </Screen>
  );
}
