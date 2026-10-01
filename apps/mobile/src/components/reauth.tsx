// Re-authentication step of in-account actions (spec 01 AC-21, AC-44, AC-55; SEC-05, Q-144): the current
// password, or — for accounts without one (social login only) — a 6-digit code emailed for one `purpose`.
import { useEffect, useState } from 'react';
import type { Locale } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';
import { Button, Input, LinkButton, Notice } from './form';

type Challenge = components['schemas']['TwoFactorChallenge'];
type Purpose = NonNullable<components['schemas']['TwoFactorChallengeCreateRequest']['purpose']>;

export interface ApiError {
  code?: string;
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

export type ReauthProof = { currentPassword: string } | { challengeId: string; code: string };

/** Field error of `name`, or the message as a general error when the API named no field. */
export function splitError(error: ApiError | undefined) {
  return {
    field: (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message,
    general: error && !error.details?.fields?.length ? error.message : undefined,
  };
}

export function Reauth({
  locale,
  hasPassword,
  purpose,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  locale: Locale;
  hasPassword: boolean;
  purpose: Purpose;
  submitLabel: string;
  /** Runs the protected action; returns the API error, or nothing on success. */
  onSubmit: (proof: ReauthProof) => Promise<ApiError | undefined>;
  onCancel: () => void;
}) {
  const t = createT(locale);
  const api = mobileApi(locale);
  const [challenge, setChallenge] = useState<Challenge>();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [now, setNow] = useState(Date.now());
  const { field, general } = splitError(error);

  async function sendCode() {
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/me/two-factor/challenges', { body: { purpose } });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    setChallenge(res.data);
    setCode('');
    setNow(Date.now());
  }

  useEffect(() => {
    if (!hasPassword) void sendCode();
    // Once per opening of the step.
  }, []);

  // The resend countdown of an emailed code (AC-27 limits apply).
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  async function submit() {
    setBusy(true);
    setError(undefined);
    const err = await onSubmit(
      challenge ? { challengeId: challenge.challengeId, code } : { currentPassword: password },
    );
    setBusy(false);
    if (err) setError(err);
  }

  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000))
    : 0;

  return (
    <>
      {general ? <Notice kind="error" text={general} /> : null}
      {hasPassword ? (
        <Input
          label={t('t_current_password')}
          value={password}
          onChangeText={setPassword}
          secure
          textContentType="password"
          error={field('currentPassword')}
        />
      ) : null}
      {challenge ? (
        <>
          <Notice kind="info" text={challenge.notice.message} />
          <Input
            label={t('t_ui_verification_code')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            error={field('code')}
          />
        </>
      ) : null}
      {hasPassword || challenge ? (
        <Button
          label={submitLabel}
          onPress={submit}
          busy={busy}
          disabled={!!challenge && code.length !== 6}
        />
      ) : null}
      {challenge ? (
        wait > 0 ? (
          <Notice kind="info" text={t('t_2fa_resend_wait', { seconds: wait })} />
        ) : (
          <LinkButton label={t('t_2fa_resend_code')} onPress={() => void sendCode()} />
        )
      ) : null}
      <LinkButton label={t('t_cancel')} onPress={onCancel} />
    </>
  );
}
