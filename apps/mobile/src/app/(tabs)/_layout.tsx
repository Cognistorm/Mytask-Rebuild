// App tab bar (components.md §6.9; design 07 "Native app"; audit §4.11): Home and Explore (slice 2, 4.2.14),
// Dashboard and Account; Messages joins with slice 08. Guests browse Home and Explore (Owner Q-167); the Dashboard
// and Account tabs send them to login. Restricted → the restrictions removal center (spec 01 AC-19).
// 3X look (3X.17d): the tab bar is the translucent surface of the header bars with a translucent hairline and a small
// lift shadow; the active tab in brand ink. Scenes sit on the page canvas.
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { Icon } from '../../components/dashboard';
import { loadSession, mobileApi } from '../../lib/api';
import { setDashboardSide } from '../../lib/dashboard';
import { createT } from '../../lib/i18n';
import { MeContext, type Me } from '../../lib/me';
import { Canvas } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function TabLayout() {
  const [me, setMe] = useState<Me | 'loading' | 'guest'>('loading');

  useEffect(() => {
    void (async () => {
      if (!(await loadSession())) return setMe('guest');
      const res = await api.GET('/me');
      if (res.data) setDashboardSide(res.data.lastDashboard);
      setMe(res.data ?? 'guest');
    })();
  }, []);

  const ctx = useMemo(() => (typeof me === 'object' ? { me, setMe } : undefined), [me]);

  if (me === 'loading') {
    return (
      <Canvas>
        <SafeAreaView style={{ flex: 1, padding: theme.space[4] }}>
          <Text accessibilityRole="progressbar" style={theme.text.body}>
            {t('t_ui_loading')}
          </Text>
        </SafeAreaView>
      </Canvas>
    );
  }
  if (ctx?.me.isRestricted) return <Redirect href="/restricted" />;
  // A guest's tap on Dashboard or Account opens the login screen on top, so Back returns to browsing.
  const accountOnly = ctx
    ? undefined
    : {
        tabPress: (e: { preventDefault: () => void }) => {
          e.preventDefault();
          router.push('/login');
        },
      };

  return (
    <MeContext.Provider value={ctx}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.text.brand,
          tabBarInactiveTintColor: theme.colors.text.secondary,
          tabBarLabelStyle: theme.text.caption,
          tabBarStyle: {
            backgroundColor: theme.colors.bg.translucent,
            borderTopColor: theme.colors.border.translucent,
            ...theme.shadow.sm,
          },
          sceneStyle: { backgroundColor: theme.colors.bg.canvas },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t('t_home'),
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'homeFill' : 'home'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t('t_explore'),
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'exploreFill' : 'explore'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          listeners={accountOnly}
          options={{
            title: t('t_ui_tab_dashboard'),
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'dashboardFill' : 'dashboard'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          listeners={accountOnly}
          options={{
            title: t('t_ui_tab_account'),
            tabBarIcon: ({ focused, color }) => (
              <Icon name={focused ? 'accountFill' : 'account'} color={color} />
            ),
          }}
        />
      </Tabs>
    </MeContext.Provider>
  );
}
