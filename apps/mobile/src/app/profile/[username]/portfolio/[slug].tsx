// Portfolio item viewer (spec 02 AC-28, AC-42; screens table "item viewer (swipe gallery)"), the same data, order
// and keys as the web `/profile/{username}/portfolio/{slug}`: the owner's pending / rejected note, swipe gallery
// (thumbnail first, then the gallery), title, "Watch video" / "Live preview" (open the browser), description,
// "Share this project" (native share sheet, public works only) and the owner box. Pending and rejected works answer
// 404 to everyone but the owner; a username that is not the owner's is 404 too (EC-4). An old slug (the uid is its
// suffix) opens the item; the shared link always carries the current slug. Open to guests (no session gate).
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { Section, SecondaryButton, Skeleton } from '../../../../components/dashboard';
import { Notice } from '../../../../components/form';
import { Gallery, OwnerBox, StatusNote } from '../../../../components/portfolio';
import { OutlineButton } from '../../../../components/profile';
import { loadSession, mobileApi } from '../../../../lib/api';
import { createT } from '../../../../lib/i18n';
import { sameUser, type PortfolioItem } from '../../../../lib/profile';
import { portfolioItemUrl } from '../../../../lib/web-pages';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'ready'; item: PortfolioItem };

async function fetchItem(username: string, slug: string): Promise<State> {
  const res = await api.GET('/portfolio-items/lookup', { params: { query: { slug } } });
  if (res.response.status === 404 || res.response.status === 400) return { kind: 'not-found' };
  if (!res.data) return { kind: 'error' };
  if (!sameUser(res.data.owner.username, username)) return { kind: 'not-found' };
  return { kind: 'ready', item: res.data };
}

export default function PortfolioItemScreen() {
  const { username, slug } = useLocalSearchParams<{ username: string; slug: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    const hasSession = await loadSession();
    let next = await fetchItem(username, slug);
    // An expired access token reads as a guest (optional user), so the owner's pending or rejected work answers
    // 404: one `getMe` refreshes the token, then read again. A public work looks the same to everyone.
    if (hasSession && next.kind === 'not-found') {
      const me = await api.GET('/me');
      if (me.data) next = await fetchItem(username, slug);
    }
    setState(next);
  }, [username, slug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        {state.kind === 'loading' ? (
          <Skeleton label={t('t_ui_loading')} tiles={1} rows={3} />
        ) : null}
        {state.kind === 'not-found' ? (
          <View style={s.gap} testID="portfolio-item-not-found">
            <Notice kind="info" text={t('t_page_not_fount')} />
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
        {state.kind === 'ready' ? <Item item={state.item} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ item }: { item: PortfolioItem }) {
  const share = () => {
    const url = portfolioItemUrl(item.owner.username, item.slug);
    // iOS shares the link as a URL; Android only takes text.
    void Share.share(
      Platform.OS === 'ios' ? { url, title: item.title } : { message: url, title: item.title },
    );
  };

  return (
    <>
      {item.status !== 'active' ? (
        <StatusNote status={item.status} reason={item.rejectionReason} t={t} />
      ) : null}

      <Gallery images={[item.thumbnail, ...item.images]} title={item.title} />
      <Text style={s.title} accessibilityRole="header">
        {item.title}
      </Text>

      {item.videoUrl || item.projectUrl || item.status === 'active' ? (
        <View style={s.actions}>
          {item.videoUrl ? (
            <OutlineButton
              label={t('t_watch_video')}
              onPress={() => void Linking.openURL(item.videoUrl ?? '')}
              testID="watch-video"
            />
          ) : null}
          {item.projectUrl ? (
            <OutlineButton
              label={t('t_live_preview')}
              onPress={() => void Linking.openURL(item.projectUrl ?? '')}
              testID="live-preview"
            />
          ) : null}
          {item.status === 'active' ? (
            <OutlineButton label={t('t_share_this_project')} onPress={share} testID="share-item" />
          ) : null}
        </View>
      ) : null}

      <Section title={t('t_description')}>
        <Text style={s.description}>{item.description}</Text>
      </Section>

      <OwnerBox user={item.owner} t={t} />
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[4] },
  gap: { gap: theme.space[3] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  description: { ...theme.text.body, color: theme.colors.text.primary },
});
