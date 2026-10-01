// Home tab placeholder for slice 01: signed in -> account summary + logout; signed out -> login screen.
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { Button, LinkButton, Screen } from '../components/form';
import { clearSession, loadSession, mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function Home() {
  const [state, setState] = useState<'loading' | 'signed-out' | components['schemas']['Me']>(
    'loading',
  );

  useEffect(() => {
    void (async () => {
      if (!(await loadSession())) return setState('signed-out');
      const res = await api.GET('/me');
      setState(res.data ?? 'signed-out');
    })();
  }, []);

  if (state === 'signed-out') return <Redirect href="/login" />;
  // Restricted users only reach the restrictions removal center (spec 01 AC-19).
  if (state !== 'loading' && state.isRestricted) return <Redirect href="/restricted" />;
  if (state === 'loading') {
    return (
      <Screen title={t('t_home')}>
        <Text accessibilityRole="progressbar">{t('t_ui_loading')}</Text>
      </Screen>
    );
  }

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    await clearSession();
    router.replace('/login');
  }

  const line = { ...theme.text.body, color: theme.colors.text.primary };
  return (
    <Screen title={t('t_account_settings')}>
      <Text style={line}>{state.fullName}</Text>
      <Text style={line}>{state.username}</Text>
      <Text style={line}>{state.email}</Text>
      <Text style={line}>{t(state.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}</Text>
      <LinkButton
        label={t('t_security_settings_sidebar')}
        onPress={() => router.push('/account/security')}
      />
      <Button label={t('t_logout')} onPress={logout} />
    </Screen>
  );
}
