// The emailed-code step of login (spec 01 AC-22…AC-27, AC-30), shared by password login and social login.
import { useEffect, useState } from 'react';
import type { Locale } from '@mytask/api-client';
import { getDeviceToken, mobileApi, saveSession } from '../lib/api';
import { createT } from '../lib/i18n';
import type { TwoFactorChallenge } from '../lib/social';
import { Button, Input, LinkButton, Notice, Screen } from './form';

export function TwoFactorStep({
  locale,
  challenge: first,
  onDone,
}: {
  locale: Locale;
  challenge: TwoFactorChallenge;
  onDone: () => void;
}) {
  const t = createT(locale);
  const api = mobileApi(locale);
  const [challenge, setChallenge] = useState(first);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function onVerify() {
    setBusy(true);
    setError(undefined);
    const deviceToken = await getDeviceToken();
    const res = await api.POST('/auth/2fa/verify', {
      body: { challengeId: challenge.challengeId, code, deviceToken },
    });
    setBusy(false);
    if (res.error) return setError((res.error as { message: string }).message);
    await saveSession(res.data);
    onDone();
  }

  async function onResend() {
    const res = await api.POST('/auth/2fa/resend', {
      body: { challengeId: challenge.challengeId },
    });
    if (res.error) return setError((res.error as { message: string }).message);
    setChallenge(res.data as unknown as TwoFactorChallenge);
    setCode('');
  }

  const wait = Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000));
  return (
    <Screen card title={t('t_2fa_enter_code_title')}>
      <Notice kind="info" text={challenge.notice.message} />
      {error ? <Notice kind="error" text={error} /> : null}
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
