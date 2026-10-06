// Account tab (spec 02 AC-1, AC-2, screens table "Account tab with a segmented Buying / Selling control").
// The switcher opens the chosen dashboard (saved on the account, AC-3). Account links (AC-35) in the web side
// card's order: Account settings (4.1.24c), Edit profile (4.1.23b), View profile (4.1.23a), Verification centre
// (4.1.24d), Password and security with the sessions (slice 01), Logout; billing, payment methods, subscription and
// referrals join with specs 05/09. The account is read again on focus, so a change made in Settings
// (username, email) shows here at once.
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { RoleSwitcher } from '../../components/dashboard';
import { Button, LinkButton, Screen } from '../../components/form';
import { clearSession, mobileApi } from '../../lib/api';
import { useDashboardSide } from '../../lib/dashboard';
import { createT } from '../../lib/i18n';
import { RequireMe, useMe, useSwitchDashboard } from '../../lib/me';
import { BrandStrip, Card } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

/** Guests go to login (Owner Q-167): this tab needs the signed-in account. */
export default function AccountTab() {
  return (
    <RequireMe>
      <AccountTabScreen />
    </RequireMe>
  );
}

function AccountTabScreen() {
  const { me, setMe } = useMe();
  const side = useDashboardSide();
  const switchTo = useSwitchDashboard(api);

  useFocusEffect(
    useCallback(() => {
      void api
        .GET('/me')
        .then((res) => res.data && setMe(res.data))
        .catch(() => undefined);
    }, [setMe]),
  );

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    await clearSession();
    router.replace('/login');
  }

  return (
    <Screen title={t('t_account_settings')}>
      <RoleSwitcher
        label={t('t_dashboard_switcher')}
        current={side}
        items={[
          { side: 'buying', label: t('t_buying') },
          { side: 'selling', label: t('t_selling') },
        ]}
        onSelect={(next) => {
          switchTo(next);
          router.navigate('/dashboard');
        }}
      />
      <Card style={s.card}>
        <BrandStrip />
        <Text style={s.name}>{me.fullName}</Text>
        <Text style={s.line}>{me.username}</Text>
        <Text style={s.line}>{me.email}</Text>
        <Text style={s.line}>{t(me.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}</Text>
      </Card>
      <LinkButton
        label={t('t_account_settings')}
        onPress={() => router.push('/account/settings')}
      />
      <LinkButton label={t('t_edit_profile')} onPress={() => router.push('/account/profile')} />
      <LinkButton
        label={t('t_view_profile')}
        onPress={() =>
          router.push({ pathname: '/profile/[username]', params: { username: me.username } })
        }
      />
      <LinkButton
        label={t('t_verification_center')}
        onPress={() => router.push('/account/verification')}
      />
      <LinkButton
        label={t('t_security_settings_sidebar')}
        onPress={() => router.push('/account/security')}
      />
      <Button label={t('t_logout')} onPress={logout} />
    </Screen>
  );
}

const s = StyleSheet.create({
  // The top padding clears the 4 px brand strip.
  card: { padding: theme.space[4], paddingTop: theme.space[5], gap: theme.space[1] },
  name: { ...theme.text.title, color: theme.colors.text.primary },
  line: { ...theme.text.body, color: theme.colors.text.secondary },
});
