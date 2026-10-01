// Spec 01 register on mobile (AC-1…AC-6), with social sign-up (AC-37, AC-38) carrying the referral code.
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { splitLegacyLinks } from '@mytask/i18n';
import { Button, Input, LinkButton, LinkList, Notice, Screen } from '../components/form';
import { SocialButtons } from '../components/social';
import { TwoFactorStep } from '../components/two-factor';
import { getDeviceToken, mobileApi, saveSession } from '../lib/api';
import { createT } from '../lib/i18n';
import { usePublicConfig } from '../lib/public-config';
import type { TwoFactorChallenge } from '../lib/social';
import { openWebPage, PRIVACY_URL, TERMS_URL } from '../lib/web-pages';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);
const terms = splitLegacyLinks(
  t('t_by_signup_u_agree_to_terms_privacy', { privacy_url: 'privacy_url', terms_url: 'terms_url' }),
);

interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

export default function Register() {
  const siteTitle = usePublicConfig(locale)?.branding?.siteTitle ?? 'MyTask';
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [pending, setPending] = useState<string>();
  // A social button can reach an existing account with 2FA on (AC-30).
  const [challenge, setChallenge] = useState<TwoFactorChallenge>();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const field = (name: string) => error?.details?.fields?.find((f) => f.field === name)?.message;
  const general = error && !error.details?.fields?.length ? error.message : undefined;

  async function onSubmit() {
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/auth/register', {
      body: {
        ...form,
        acceptTerms: acceptTerms as true,
        referralCode: form.referralCode.trim().toUpperCase() || null,
        deviceToken: await getDeviceToken(),
      },
    });
    setBusy(false);
    if (res.error) return setError(res.error as ApiError);
    if (res.data.session) {
      await saveSession(res.data.session);
      return router.replace('/');
    }
    setPending(res.data.notice?.message);
  }

  if (challenge) {
    return (
      <TwoFactorStep locale={locale} challenge={challenge} onDone={() => router.replace('/')} />
    );
  }

  if (pending) {
    return (
      <Screen title={t('t_verify_email')}>
        <Notice kind="success" text={pending} />
        <LinkButton label={t('t_login')} onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('t_welcome_to_app_name', { name: siteTitle })}
      subtitle={t('t_pls_signup_to_continue')}
    >
      {general ? <Notice kind="error" text={general} /> : null}
      <Input
        label={t('t_fullname')}
        value={form.fullName}
        onChangeText={set('fullName')}
        textContentType="name"
        error={field('fullName')}
      />
      <Input
        label={t('t_email_address')}
        value={form.email}
        onChangeText={set('email')}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={field('email')}
      />
      <Input
        label={t('t_username')}
        value={form.username}
        onChangeText={set('username')}
        textContentType="username"
        error={field('username')}
      />
      <Input
        label={t('t_password')}
        value={form.password}
        onChangeText={set('password')}
        secure
        textContentType="newPassword"
        error={field('password') ?? undefined}
      />
      <Text style={{ ...theme.text.bodySm, color: theme.colors.text.secondary }}>
        {t('t_password_validation_message')}
      </Text>
      <Input
        label={t('t_referral_code_optional')}
        value={form.referralCode}
        onChangeText={set('referralCode')}
        error={field('referralCode')}
      />
      <View style={{ flexDirection: 'row', gap: theme.space[2], alignItems: 'center' }}>
        <Switch
          value={acceptTerms}
          onValueChange={setAcceptTerms}
          accessibilityLabel={terms.map((p) => p.text).join('')}
        />
        {/* Legacy sentence with its two links, rendered as text + links, never HTML (QA BUG-04). */}
        <Text style={{ ...theme.text.body, color: theme.colors.text.primary, flex: 1 }}>
          {terms.map((p, i) =>
            p.link ? (
              <Text
                key={i}
                accessibilityRole="link"
                style={{ color: theme.colors.text.link, textDecorationLine: 'underline' }}
                onPress={() => openWebPage(p.link === 'terms_url' ? TERMS_URL : PRIVACY_URL)}
              >
                {p.text}
              </Text>
            ) : (
              <Text key={i}>{p.text}</Text>
            ),
          )}
        </Text>
      </View>
      {field('acceptTerms') ? <Notice kind="error" text={field('acceptTerms')!} /> : null}
      <Button label={t('t_create_account')} onPress={onSubmit} busy={busy} />
      <SocialButtons
        locale={locale}
        referralCode={form.referralCode}
        onSignedIn={() => router.replace('/')}
        onChallenge={setChallenge}
      />
      {/* Legacy link list (`register.blade.php`, QA BUG-01). */}
      <LinkList
        items={[
          {
            label: `${t('t_already_have_account')} ${t('t_login')}`,
            onPress: () => router.replace('/login'),
          },
          { label: t('t_resend_verification_email'), onPress: () => router.push('/auth/request') },
          { label: t('t_privacy_policy'), onPress: () => openWebPage(PRIVACY_URL) },
          { label: t('t_terms_of_service'), onPress: () => openWebPage(TERMS_URL) },
        ]}
      />
    </Screen>
  );
}
