// Spec 01 forgot password on mobile (AC-32, AC-36): always the same answer (no account enumeration).
// The emailed link opens the app's set-new-password screen when installed (auth/password/update).
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Input, LinkButton, Notice, Screen } from '../../../components/form';
import { mobileApi } from '../../../lib/api';
import { createT } from '../../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [sent, setSent] = useState<string>();

  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  async function onSubmit() {
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/auth/password-reset', { body: { email } });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    setSent(res.data.message);
  }

  return (
    <Screen title={t('t_reset_ur_password')} subtitle={t('t_reset_ur_password_subtitle')}>
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
          <Button label={t('t_reset_password')} onPress={onSubmit} busy={busy} />
        </>
      ) : null}
      <LinkButton label={t('t_back_to_sign_in')} onPress={() => router.replace('/login')} />
    </Screen>
  );
}
