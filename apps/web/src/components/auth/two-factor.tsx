'use client';
// Spec 01 AC-22…AC-27, AC-30, AC-54: the email-code step after a password login or a social login.
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { Alert, CodeInput, Submit } from '@mytask/ui/web';
import { AuthCard } from './ui';

export type TwoFactorChallenge = components['schemas']['TwoFactorChallenge'];

export function TwoFactorStep({
  challenge: first,
  onDone,
}: {
  challenge: TwoFactorChallenge;
  onDone: () => void;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);

  const [challenge, setChallenge] = useState(first);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/auth/2fa/verify', {
      body: { challengeId: challenge.challengeId, code },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    onDone();
  }

  async function onResend() {
    setErr(undefined);
    const res = await api.POST('/auth/2fa/resend', {
      body: { challengeId: challenge.challengeId },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setChallenge(res.data as TwoFactorChallenge);
    setCode('');
  }

  const wait = Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000));
  return (
    <AuthCard title={t('t_2fa_enter_code_title')}>
      <Alert kind="info">{challenge.notice.message}</Alert>
      {err && <Alert kind="error">{err.message}</Alert>}
      <form onSubmit={onVerify} noValidate>
        <CodeInput label={t('t_ui_verification_code')} value={code} onChange={setCode} />
        <Submit busy={busy || code.length !== 6}>{t('t_continue')}</Submit>
      </form>
      <div className="auth-row">
        <button type="button" className="auth-link-button" disabled={wait > 0} onClick={onResend}>
          {wait > 0 ? t('t_2fa_resend_wait', { seconds: wait }) : t('t_2fa_resend_code')}
        </button>
      </div>
    </AuthCard>
  );
}
