// Spec 01 resend verification on mobile (AC-9), reached from an expired/invalid verify link (AC-8) or from
// login of a pending account (AC-13). Not pending → `t_already_verified_user` (409 AUTH_ALREADY_VERIFIED).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Input, LinkButton, Notice, Screen } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

export default function ResendVerification() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [sent, setSent] = useState<string>();

  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  async function onSubmit() {
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/auth/email-verification/resend', { body: { email } });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    setSent(res.data.message);
  }

  return (
    <Screen
      card
      title={t('t_resend_verification_email')}
      subtitle={t('t_resend_verification_email_subtitle')}
    >
      {sent ? <Notice kind="success" text={sent} /> : null}
      {general ? <Notice kind="error" text={general} /> : null}
      {!sent ? (
        <>
          <Input
            label={t('t_email_address')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={field('email')}
          />
          <Button label={t('t_send')} onPress={onSubmit} busy={busy} />
        </>
      ) : null}
      <LinkButton label={t('t_back_to_sign_in')} onPress={() => router.replace('/login')} />
    </Screen>
  );
}
