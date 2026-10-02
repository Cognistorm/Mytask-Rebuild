// Portfolio screen (spec 02 AC-28, AC-42; screens table "Portfolio grid → item viewer"), the same data, order and keys
// as the web `/profile/{username}/portfolio`: owner box, title, the grid of works newest first with "Load more", or
// "No work added yet.". The owner also sees their pending and rejected works, marked. Open to guests (no session gate).
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { EmptyState, SecondaryButton, Skeleton } from '../../../../components/dashboard';
import { Button, Notice } from '../../../../components/form';
import { OwnerBox, PortfolioGrid } from '../../../../components/portfolio';
import { loadSession, mobileApi } from '../../../../lib/api';
import { createT } from '../../../../lib/i18n';
import {
  isGuestView,
  PORTFOLIO_PAGE_SIZE,
  type PortfolioItemCard,
  type UserProfile,
} from '../../../../lib/profile';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      profile: UserProfile;
      items: PortfolioItemCard[];
      cursor: string | null;
    };

async function fetchFirst(username: string): Promise<State> {
  const [profile, page] = await Promise.all([
    api.GET('/users/{username}', { params: { path: { username } } }),
    api.GET('/portfolio-items', { params: { query: { username, limit: PORTFOLIO_PAGE_SIZE } } }),
  ]);
  // Pending, banned, deleted and unknown users (AC-9, EC-4).
  if (profile.response.status === 404 || page.response.status === 404) return { kind: 'not-found' };
  if (!profile.data || !page.data) return { kind: 'error' };
  return {
    kind: 'ready',
    profile: profile.data,
    items: page.data.data ?? [],
    cursor: page.data.nextCursor,
  };
}

export default function PortfolioScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const load = useCallback(async () => {
    // Coming back (e.g. from an item) re-reads quietly; only the first load shows the skeleton.
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    const hasSession = await loadSession();
    let next = await fetchFirst(username);
    // An expired access token reads as a guest (optional user): one `getMe` refreshes it, then read again, so the
    // owner sees their pending and rejected works (as the profile screen).
    if (hasSession && next.kind === 'ready' && isGuestView(next.profile)) {
      const me = await api.GET('/me');
      if (me.data) next = await fetchFirst(username);
    }
    setMoreFailed(false);
    setState(next);
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const more = async () => {
    if (state.kind !== 'ready' || !state.cursor) return;
    setBusy(true);
    setMoreFailed(false);
    const res = await api
      .GET('/portfolio-items', {
        params: { query: { username, cursor: state.cursor, limit: PORTFOLIO_PAGE_SIZE } },
      })
      .catch(() => undefined);
    setBusy(false);
    if (!res?.data) return setMoreFailed(true);
    const seen = new Set(state.items.map((i) => i.id));
    setState({
      ...state,
      items: [...state.items, ...(res.data.data ?? []).filter((i) => !seen.has(i.id))],
      cursor: res.data.nextCursor,
    });
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        {state.kind === 'loading' ? (
          <Skeleton label={t('t_ui_loading')} tiles={4} rows={1} />
        ) : null}
        {state.kind === 'not-found' ? (
          <View style={s.gap} testID="portfolio-not-found">
            <Notice kind="info" text={t('t_user_not_found')} />
            <SecondaryButton
              label={t('t_go_back')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          </View>
        ) : null}
        {state.kind === 'error' ? (
          <View style={s.gap}>
            <Notice kind="error" text={t('t_toast_something_went_wrong')} />
            <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
          </View>
        ) : null}
        {state.kind === 'ready' ? (
          <>
            <OwnerBox
              user={{
                id: state.profile.id,
                username: state.profile.username,
                avatar: state.profile.avatar,
                isPremium: state.profile.isPremium,
                isIdVerified: state.profile.isIdVerified,
                isOnline: state.profile.isOnline,
                countryCode: state.profile.countryCode,
                isDeleted: false,
              }}
              headline={state.profile.headline}
              t={t}
            />
            <Text style={s.title} accessibilityRole="header">
              {t('t_username_portfolio', { username: state.profile.username })}
            </Text>
            {state.items.length === 0 ? (
              <EmptyState title={t('t_no_portfolio_yet')} />
            ) : (
              <PortfolioGrid username={state.profile.username} items={state.items} t={t} />
            )}
            {moreFailed ? <Notice kind="error" text={t('t_toast_something_went_wrong')} /> : null}
            {state.cursor ? (
              <Button label={t('t_load_more')} busy={busy} onPress={() => void more()} />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[4] },
  gap: { gap: theme.space[3] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
});
