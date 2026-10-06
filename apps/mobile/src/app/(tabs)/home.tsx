// Home tab (ROADMAP 4.2.14; design 01-home.md "Native app"; spec 03 AC-24…AC-26): logo bar, a compact teal hero
// (search field that opens the Explore search, Gigs shortcut), then the getHome rows as horizontal lists: featured
// categories (S-107), Top gigs, one row per visible category with "See more", best sellers (S-108). Rows the API
// returns null or empty are hidden; pull to refresh. Bell and cart join with their slices (14, 5); the invite banner
// with slice 9. A category opens its screen, "See more" of best sellers opens `/sellers` (4.2.15).
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { GigCardView, openCategoryPath, SellerMini } from '../../components/catalog';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { usePublicConfig } from '../../lib/public-config';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Home = components['schemas']['Home'];
type GigCard = components['schemas']['GigCard'];
type CategoryRef = components['schemas']['CategoryRef'];

/** Featured tiles and home rows are top-level categories, so the slug is the whole path. */
const openCategory = (c: CategoryRef) => openCategoryPath(c.slug);

export default function HomeScreen() {
  const config = usePublicConfig(locale);
  // Row cards take 80 % of the screen so the next one peeks (components.md §7.2 carousel item).
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.8);
  const tileWidth = Math.round(width * 0.42);
  const [home, setHome] = useState<Home | null | 'error'>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await api.GET('/home').catch(() => undefined);
    setHome(res?.data ?? 'error');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const data = home && home !== 'error' ? home : null;
  const hero = config?.content.hero;

  const row = (key: string, title: string, gigs: GigCard[], onMore: () => void) => (
    <View key={key} style={s.row} testID={`home-row-${key}`}>
      <View style={s.rowHead}>
        <Text style={s.rowTitle} accessibilityRole="header">
          {title}
        </Text>
        <Pressable onPress={onMore} accessibilityRole="link" hitSlop={theme.space[2]}>
          <Text style={s.more}>{t('t_see_more')}</Text>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={gigs}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GigCardView gig={item} t={t} width={cardWidth} />}
        ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.space[3]}
        decelerationRate="fast"
        contentContainerStyle={s.rowList}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.bar}>
        <Image
          source={require('../../../../../packages/assets/logo/mytask-logo-wordmark-trimmed.png')}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="MyTask.ge"
        />
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <View style={s.hero}>
          <Text style={s.heroTitle} accessibilityRole="header">
            {hero?.title || t('t_find_best')}
          </Text>
          <Pressable
            style={s.heroSearch}
            onPress={() => router.push({ pathname: '/explore', params: { focus: '1' } })}
            accessibilityRole="search"
            accessibilityLabel={t('t_search')}
            testID="home-search"
          >
            <Text style={s.heroPlaceholder}>{t('t_what_service_are_u_looking_for_today')}</Text>
          </Pressable>
          <View style={s.shortcuts}>
            <Pressable
              style={s.shortcut}
              onPress={() => router.push('/explore')}
              accessibilityRole="button"
            >
              <Text style={s.shortcutText}>{t('t_gigs')}</Text>
            </Pressable>
            {config?.projects.enabled ? (
              <Pressable
                style={s.shortcut}
                onPress={() =>
                  router.push({ pathname: '/explore-projects/[[...path]]', params: { path: [] } })
                }
                accessibilityRole="button"
              >
                <Text style={s.shortcutText}>{t('t_projects')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {home === 'error' ? (
          <View style={s.pad}>
            <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          </View>
        ) : null}

        {data?.featuredCategories && data.featuredCategories.length > 0 ? (
          <View style={s.row} testID="home-featured">
            <View style={s.rowHead}>
              <Text style={s.rowTitle} accessibilityRole="header">
                {t('t_featured_categories')}
              </Text>
            </View>
            <FlatList
              horizontal
              data={data.featuredCategories}
              keyExtractor={(f) => f.category.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.tile, { width: tileWidth }]}
                  onPress={() => openCategory(item.category)}
                  accessibilityRole="link"
                  accessibilityLabel={item.category.name}
                >
                  {item.image ? (
                    <Image source={{ uri: item.image.medium }} style={s.tileImage} />
                  ) : null}
                  <Text style={s.tileText} numberOfLines={2}>
                    {item.category.name}
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rowList}
            />
          </View>
        ) : null}

        {data && data.topGigs.length > 0
          ? row('top', t('t_selected_gigs_for_u'), data.topGigs, () => router.push('/explore'))
          : null}

        {data?.categoryRows
          .filter((r) => r.gigs.length > 0)
          .map((r) => row(r.category.id, r.category.name, r.gigs, () => openCategory(r.category)))}

        {data?.bestSellers && data.bestSellers.length > 0 ? (
          <View style={s.row} testID="home-best-sellers">
            <View style={s.rowHead}>
              <Text style={s.rowTitle} accessibilityRole="header">
                {t('t_top_sellers')}
              </Text>
              <Pressable
                onPress={() => router.push('/sellers')}
                accessibilityRole="link"
                hitSlop={theme.space[2]}
              >
                <Text style={s.more}>{t('t_see_more')}</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={data.bestSellers}
              keyExtractor={(b) => b.user.id}
              renderItem={({ item }) => (
                <SellerMini seller={item} t={t} width={Math.round(width * 0.6)} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rowList}
            />
          </View>
        ) : null}
        <View style={{ height: theme.space[12] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  bar: {
    height: theme.size.layout.headerHeightMobile,
    justifyContent: 'center',
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.bg.surface,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.border.subtle,
  },
  logo: { height: theme.size.layout.logoHeightMobile, width: theme.space[24] + theme.space[12] },
  hero: { gap: theme.space[3], padding: theme.space[4], backgroundColor: theme.colors.bg.hero },
  heroTitle: { ...theme.text.h2, color: theme.colors.text.onHero },
  heroSearch: {
    minHeight: theme.size.control.lg,
    justifyContent: 'center',
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.surface,
  },
  heroPlaceholder: { ...theme.text.body, color: theme.colors.text.muted },
  shortcuts: { flexDirection: 'row', gap: theme.space[3] },
  shortcut: {
    flex: 1,
    minHeight: theme.size.touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.strong,
    borderColor: theme.colors.text.onHero,
    borderRadius: theme.radius.pill,
  },
  shortcutText: { ...theme.text.label, color: theme.colors.text.onHero },
  pad: { padding: theme.space[4] },
  row: { marginTop: theme.space[6] },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    marginBottom: theme.space[3],
  },
  rowTitle: { ...theme.text.h3, color: theme.colors.text.primary, flexShrink: 1 },
  more: { ...theme.text.label, color: theme.colors.text.link },
  rowList: { paddingHorizontal: theme.space[4] },
  tile: {
    aspectRatio: theme.size.layout.cardImageRatio,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.bg.hero,
  },
  tileImage: StyleSheet.absoluteFill,
  tileText: {
    ...theme.text.label,
    padding: theme.space[3],
    color: theme.colors.text.onImage,
    backgroundColor: theme.colors.bg.scrim,
  },
});
