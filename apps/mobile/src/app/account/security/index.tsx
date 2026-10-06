// Account → Security on mobile (spec 01 screens table): link to Password, the 2FA switch (AC-20, AC-21) and the
// sessions list with "Log out other browser sessions" (AC-43, AC-44, AC-55). Same flows as the web pages
// `/account` (2FA card) and `/account/sessions`; legacy `SessionsComponent.php:97-210`, `sessions.blade.php`.
// Re-authentication: current password, or an emailed code on accounts without one (`components/reauth`).
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { Button, LinkButton, Notice, Screen } from '../../../components/form';
import { Reauth, type ApiError, type ReauthProof } from '../../../components/reauth';
import { loadSession, mobileApi } from '../../../lib/api';
import { createT } from '../../../lib/i18n';
import { Card } from '../../../ui';

type Me = components['schemas']['Me'];
type Session = components['schemas']['SessionSummary'];

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

const MOBILE_OS = /android|ios|iphone|ipad/i;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "5 minutes ago" (legacy Carbon `diffForHumans`); the date and time where the engine lacks RelativeTimeFormat. */
function ago(iso: string, now: number): string {
  if (typeof Intl.RelativeTimeFormat !== 'function') return new Date(iso).toLocaleString(locale);
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return fmt.format(Math.round(seconds / size), unit);
  }
  return fmt.format(seconds, 'second');
}

function DeviceIcon({ mobile }: { mobile: boolean }) {
  return (
    <Svg
      width={theme.space[6]}
      height={theme.space[6]}
      viewBox="0 0 24 24"
      fill={theme.colors.text.muted}
    >
      <Path
        d={
          mobile
            ? 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h8V4H8zm3 13h2v2h-2v-2z'
            : 'M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6H4z'
        }
      />
    </Svg>
  );
}

export default function Security() {
  const [me, setMe] = useState<Me | 'loading' | 'signed-out'>('loading');
  const [sessions, setSessions] = useState<Session[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  // The 2FA value waiting for re-authentication, and the "log out others" step.
  const [twoFactorTo, setTwoFactorTo] = useState<boolean>();
  const [twoFactorNotice, setTwoFactorNotice] = useState<string>();
  const [revoking, setRevoking] = useState(false);
  const [revokeNotice, setRevokeNotice] = useState<string>();

  const loadMe = useCallback(async () => {
    const res = await api.GET('/me');
    setMe(res.data ?? 'signed-out');
    return res.data;
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadFailed(false);
    const res = await api.GET('/me/sessions');
    if (res.error) return setLoadFailed(true);
    setSessions(res.data.data);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    void (async () => {
      if (!(await loadSession())) return setMe('signed-out');
      const data = await loadMe();
      if (data && !data.isRestricted) void loadSessions();
    })();
  }, [loadMe, loadSessions]);

  if (me === 'signed-out') return <Redirect href="/login" />;
  // Restricted users only reach the restrictions removal center (spec 01 AC-19).
  if (me !== 'loading' && me.isRestricted) return <Redirect href="/restricted" />;

  async function saveTwoFactor(proof: ReauthProof): Promise<ApiError | undefined> {
    const res = await api.PUT('/me/two-factor', { body: { enabled: !!twoFactorTo, ...proof } });
    if (res.error) return res.error as ApiError;
    setTwoFactorTo(undefined);
    setTwoFactorNotice(res.data.notice?.message);
    await loadMe();
  }

  async function revokeOthers(proof: ReauthProof): Promise<ApiError | undefined> {
    const res = await api.POST('/me/sessions/revoke-others', { body: proof });
    if (res.error) return res.error as ApiError;
    setRevoking(false);
    setRevokeNotice(t('t_toast_operation_success'));
    void loadSessions();
  }

  const muted = { ...theme.text.bodySm, color: theme.colors.text.muted };
  return (
    <Screen title={t('t_security_settings')}>
      {me === 'loading' ? (
        <Text accessibilityRole="progressbar" style={s.body}>
          {t('t_ui_loading')}
        </Text>
      ) : (
        <>
          <LinkButton
            label={t('t_change_password')}
            onPress={() => router.push('/account/security/password')}
          />

          {me.twoFactorAvailable ? (
            <Card style={s.card}>
              <Text style={s.heading} accessibilityRole="header">
                {t('t_two_factor_auth')}
              </Text>
              <Text style={muted}>{t('t_two_factor_auth_hint')}</Text>
              <View style={s.row}>
                <Text style={[s.body, s.grow]}>
                  {t(me.twoFactorEnabled ? 't_2fa_enabled' : 't_2fa_disabled')}
                </Text>
                <Switch
                  value={twoFactorTo ?? me.twoFactorEnabled}
                  onValueChange={(v) => {
                    setTwoFactorNotice(undefined);
                    setTwoFactorTo(v === me.twoFactorEnabled ? undefined : v);
                  }}
                  disabled={twoFactorTo !== undefined}
                  trackColor={{
                    true: theme.colors.action.primary,
                    false: theme.colors.border.strong,
                  }}
                  thumbColor={theme.colors.bg.surface}
                  accessibilityLabel={t('t_two_factor_auth')}
                />
              </View>
              {twoFactorNotice ? <Notice kind="success" text={twoFactorNotice} /> : null}
              {twoFactorTo !== undefined ? (
                <>
                  {me.hasPassword ? (
                    <Text style={muted}>{t('t_confirm_with_password')}</Text>
                  ) : null}
                  <Reauth
                    locale={locale}
                    hasPassword={me.hasPassword}
                    purpose="toggle_two_factor"
                    submitLabel={t('t_submit')}
                    onSubmit={saveTwoFactor}
                    onCancel={() => setTwoFactorTo(undefined)}
                  />
                </>
              ) : null}
            </Card>
          ) : null}

          <Card style={s.card}>
            <Text style={s.heading} accessibilityRole="header">
              {t('t_browser_sessions')}
            </Text>
            <Text style={muted}>{t('t_browser_sessions_subtitle')}</Text>
            {!sessions && !loadFailed ? (
              <Text accessibilityRole="progressbar" style={s.body}>
                {t('t_ui_loading')}
              </Text>
            ) : null}
            {loadFailed ? (
              <>
                <Notice kind="error" text={t('t_toast_something_went_wrong')} />
                <LinkButton label={t('t_ui_retry')} onPress={() => void loadSessions()} />
              </>
            ) : null}
            {sessions?.map((x) => (
              <View key={x.id} style={s.session} accessibilityRole="text">
                <DeviceIcon mobile={x.client !== 'web' || MOBILE_OS.test(x.os ?? '')} />
                <View style={s.grow}>
                  <Text style={s.body}>
                    {x.os || t('t_unknown')} - {x.browser || x.deviceLabel || t('t_unknown')}
                  </Text>
                  <Text style={muted}>{x.ip}</Text>
                  {x.isCurrent ? (
                    <Text style={s.current}>{t('t_this_device')}</Text>
                  ) : (
                    <Text style={muted}>
                      {t('t_last_activity')} {ago(x.lastActiveAt, now)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
            {revokeNotice ? <Notice kind="success" text={revokeNotice} /> : null}
            {sessions && !revoking ? (
              <Button
                label={t('t_logout_other_browser_sessions')}
                onPress={() => {
                  setRevokeNotice(undefined);
                  setRevoking(true);
                }}
              />
            ) : null}
            {revoking ? (
              <>
                {me.hasPassword ? (
                  <Text style={muted}>
                    {t('t_to_help_make_ur_account_secure_enter_current_pass')}
                  </Text>
                ) : null}
                <Reauth
                  locale={locale}
                  hasPassword={me.hasPassword}
                  purpose="revoke_sessions"
                  submitLabel={t('t_logout_other_browser_sessions')}
                  onSubmit={revokeOthers}
                  onCancel={() => setRevoking(false)}
                />
              </>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { ...theme.text.body, color: theme.colors.text.primary },
  heading: { ...theme.text.h3, color: theme.colors.text.primary },
  current: { ...theme.text.bodySm, color: theme.colors.text.success },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  card: {
    gap: theme.space[3],
    padding: theme.space[4],
  },
  session: { flexDirection: 'row', gap: theme.space[3], alignItems: 'flex-start' },
});
