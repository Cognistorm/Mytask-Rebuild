// Gig screen `/service/{slug}` (spec 04 AC-26…AC-30, AC-33; screen 02 "Native app"; legacy
// `Main/Service/ServiceComponent.php`), the same data, rules and keys as the web gig page (4.3.11): `lookupGig` by
// the uid after the last `-`, so an old slug still opens the gig (the shared link carries the current one). Others'
// pending / rejected and unknown gigs read "Page not found" (AC-28). Opened from every GigCard and from
// `mytask://service/{slug}` / the App Link. ROADMAP 4.3.14a = the frame: notices, breadcrumb, gallery, title, seller
// row, stats, purchase box and the description; 4.3.14b = FAQ / Reviews / Documents, "You may also like", Share,
// favourite, Report and the visit. Open to guests (no session gate).
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { openCategoryPath } from '../../components/catalog';
import { Section, SecondaryButton, Skeleton } from '../../components/dashboard';
import { Notice } from '../../components/form';
import {
  GigNotices,
  GigSeller,
  GigStats,
  GigTitle,
  PurchaseBox,
  uidOfSlug,
  type Gig,
} from '../../components/gig-page';
import { Gallery } from '../../components/portfolio';
import { RichText } from '../../components/rich-text';
import { loadSession, mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { Breadcrumb, Canvas } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error' } | { kind: 'ready'; gig: Gig };

async function fetchGig(uid: string): Promise<State> {
  const res = await api.GET('/gigs/lookup', { params: { query: { uid } } });
  if (res.response.status === 404 || res.response.status === 400) return { kind: 'not-found' };
  if (!res.data) return { kind: 'error' };
  return { kind: 'ready', gig: res.data };
}

export default function GigScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = uidOfSlug(slug ?? '');
    if (!uid || uid.length > 40) return setState({ kind: 'not-found' });
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    try {
      const hasSession = await loadSession();
      let next = await fetchGig(uid);
      // An expired access token reads as a guest (optional user), so the owner's pending or rejected gig answers
      // 404 and `viewer` is null: one `getMe` refreshes the token, then read again (as the portfolio viewer).
      if (
        hasSession &&
        (next.kind === 'not-found' || (next.kind === 'ready' && !next.gig.viewer))
      ) {
        const me = await api.GET('/me');
        if (me.data) next = await fetchGig(uid);
      }
      setState(next);
    } catch {
      setState({ kind: 'error' });
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Canvas>
      <SafeAreaView style={s.screen}>
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={
            state.kind === 'ready' ? (
              <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
            ) : undefined
          }
          testID="gig-screen"
        >
          {state.kind === 'loading' ? (
            <Skeleton label={t('t_ui_loading')} tiles={1} rows={4} />
          ) : null}
          {state.kind === 'not-found' ? (
            <View style={s.gap} testID="gig-not-found">
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
          {state.kind === 'ready' ? <GigBody gig={state.gig} /> : null}
        </ScrollView>
      </SafeAreaView>
    </Canvas>
  );
}

function GigBody({ gig }: { gig: Gig }) {
  // Georgian text on an English screen (AC-27) is announced in Georgian.
  const lang = gig.contentLocale !== locale ? gig.contentLocale : undefined;

  // Breadcrumb: Home › category › sub-category › child category (AC-26), each to its category screen.
  const levels = [gig.category, gig.subcategory, gig.childCategory];
  const crumbs = [
    { label: t('t_home'), onPress: () => router.navigate('/') },
    ...levels.map((c, i) => ({
      label: c.name,
      onPress: () =>
        openCategoryPath(
          levels
            .slice(0, i + 1)
            .map((x) => x.slug)
            .join('/'),
        ),
    })),
  ];

  return (
    <>
      <GigNotices gig={gig} t={t} locale={locale} />
      <Breadcrumb label={t('t_breadcrumb')} color={null} items={crumbs} />
      {/* The gig's images as legacy; the cover only when there are none. */}
      <Gallery images={gig.images.length > 0 ? gig.images : [gig.thumbnail]} title={gig.title} />
      <GigTitle gig={gig} t={t} lang={lang} />
      <GigSeller gig={gig} t={t} />
      <GigStats gig={gig} t={t} />
      <PurchaseBox gig={gig} t={t} lang={lang} />
      <Section title={t('t_description')} testID="gig-description">
        <RichText html={gig.description} profile="user_text" lang={lang} />
      </Section>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[4] },
  gap: { gap: theme.space[3] },
});
