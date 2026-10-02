// Account tab (spec 02 AC-1, AC-2, screens table "Account tab with a segmented Buying / Selling control").
// The switcher opens the chosen dashboard (saved on the account, AC-3). Account links (AC-35): "Edit profile"
// (4.1.23b), "View profile" (the own public profile, 4.1.23a) and the slice 01 links; settings and the
// verification centre join with 4.1.24.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { RoleSwitcher } from '../../components/dashboard';
import { Button, LinkButton, Screen } from '../../components/form';
import { clearSession, mobileApi } from '../../lib/api';
import { useDashboardSide } from '../../lib/dashboard';
import { createT } from '../../lib/i18n';
import { useMe, useSwitchDashboard } from '../../lib/me';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function AccountTab() {
  const { me } = useMe();
  const side = useDashboardSide();
  const switchTo = useSwitchDashboard(api);

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
      <View style={s.card}>
        <Text style={s.name}>{me.fullName}</Text>
        <Text style={s.line}>{me.username}</Text>
        <Text style={s.line}>{me.email}</Text>
        <Text style={s.line}>{t(me.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}</Text>
      </View>
      <LinkButton label={t('t_edit_profile')} onPress={() => router.push('/account/profile')} />
      <LinkButton
        label={t('t_view_profile')}
        onPress={() =>
          router.push({ pathname: '/profile/[username]', params: { username: me.username } })
        }
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
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.card,
    padding: theme.space[4],
    gap: theme.space[1],
  },
  name: { ...theme.text.title, color: theme.colors.text.primary },
  line: { ...theme.text.body, color: theme.colors.text.secondary },
});
