// Home tab (ROADMAP 4.2.14; design 01-home.md "Native app"; spec 03 AC-24…AC-26): logo bar, a compact teal hero
// (search field that opens the Explore search, Gigs shortcut), then the getHome rows as horizontal lists: featured
// categories (S-107), Top gigs, one row per visible category with "See more", best sellers (S-108). Rows the API
// returns null or empty are hidden; pull to refresh. Bell and cart join with their slices (14, 5); the invite banner
// with slice 9. A category opens its screen, "See more" of best sellers opens `/sellers` (4.2.15).
// 3X look (3X.17a, visual-refresh.md §3.4, §8.5, §10): canvas + hero gradients, over-hero shortcut pills, featured
// tiles with the name on a band in the category gradient, row headings with the category dot + accent bar, "See
// more" in the category ink, row items entering with the M-10 stagger.
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { GigCardView, openCategoryPath, SellerMini } from '../../components/catalog';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { usePublicConfig } from '../../lib/public-config';
import {
  Canvas,
  Card,
  CategoryHeading,
  CategoryLink,
  enterAt,
  Gradient,
  GradientLayers,
  InputFrame,
  useCategoryTheme,
  usePressScale,
} from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Home = components['schemas']['Home'];
type GigCard = components['schemas']['GigCard'];
type CategoryRef = components['schemas']['CategoryColorRef'];
type FeaturedCategory = components['schemas']['HomeFeaturedCategory'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const row = (
    key: string,
    title: string,
    category: CategoryRef | undefined,
    gigs: GigCard[],
    onMore: () => void,
  ) => (
    <View key={key} style={s.row} testID={`home-row-${key}`}>
      <RowHead title={title} category={category}>
        <CategoryLink label={t('t_see_more')} color={category?.color} onPress={onMore} />
      </RowHead>
      <FlatList
        horizontal
        data={gigs}
        keyExtractor={(g) => g.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={enterAt(index)}>
            <GigCardView gig={item} t={t} width={cardWidth} />
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.space[3]}
        decelerationRate="fast"
        contentContainerStyle={s.rowList}
      />
    </View>
  );

  return (
    <Canvas>
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
          <GradientLayers layers={theme.gradient.hero} style={s.hero}>
            <Text style={s.heroTitle} accessibilityRole="header">
              {hero?.title || t('t_find_best')}
            </Text>
            <InputFrame>
              <Pressable
                style={s.heroSearch}
                onPress={() => router.push({ pathname: '/explore', params: { focus: '1' } })}
                accessibilityRole="search"
                accessibilityLabel={t('t_search')}
                testID="home-search"
              >
                <Text style={s.heroPlaceholder}>{t('t_what_service_are_u_looking_for_today')}</Text>
              </Pressable>
            </InputFrame>
            <View style={s.shortcuts}>
              <HeroShortcut label={t('t_gigs')} onPress={() => router.push('/explore')} />
              {config?.projects.enabled ? (
                <HeroShortcut
                  label={t('t_projects')}
                  onPress={() =>
                    router.push({
                      pathname: '/explore-projects/[[...path]]',
                      params: { path: [] },
                    })
                  }
                />
              ) : null}
            </View>
          </GradientLayers>

          {home === 'error' ? (
            <View style={s.pad}>
              <Notice kind="error" text={t('t_toast_something_went_wrong')} />
            </View>
          ) : null}

          {data?.featuredCategories && data.featuredCategories.length > 0 ? (
            <View style={s.row} testID="home-featured">
              <RowHead title={t('t_featured_categories')} />
              <FlatList
                horizontal
                data={data.featuredCategories}
                keyExtractor={(f) => f.category.id}
                renderItem={({ item, index }) => (
                  <Animated.View entering={enterAt(index)}>
                    <FeaturedTile item={item} width={tileWidth} />
                  </Animated.View>
                )}
                ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.rowList}
              />
            </View>
          ) : null}

          {data && data.topGigs.length > 0
            ? row('top', t('t_selected_gigs_for_u'), undefined, data.topGigs, () =>
                router.push('/explore'),
              )
            : null}

          {data?.categoryRows
            .filter((r) => r.gigs.length > 0)
            .map((r) =>
              row(r.category.id, r.category.name, r.category, r.gigs, () =>
                openCategory(r.category),
              ),
            )}

          {data?.bestSellers && data.bestSellers.length > 0 ? (
            <View style={s.row} testID="home-best-sellers">
              <RowHead title={t('t_top_sellers')}>
                <CategoryLink
                  label={t('t_see_more')}
                  color={null}
                  onPress={() => router.push('/sellers')}
                />
              </RowHead>
              <FlatList
                horizontal
                data={data.bestSellers}
                keyExtractor={(b) => b.user.id}
                renderItem={({ item, index }) => (
                  <Animated.View entering={enterAt(index)}>
                    <SellerMini seller={item} t={t} width={Math.round(width * 0.6)} />
                  </Animated.View>
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
    </Canvas>
  );
}

/** A row heading; category rows (`category` set) get the accent bar in their colour. */
function RowHead(props: {
  title: string;
  category?: { color: string | null };
  children?: ReactNode;
}) {
  return (
    <View style={s.rowHead}>
      {props.category ? (
        <CategoryHeading title={props.title} color={props.category.color} />
      ) : (
        <Text style={s.rowTitle} accessibilityRole="header">
          {props.title}
        </Text>
      )}
      {props.children}
    </View>
  );
}

/** Gigs / Projects over the hero (§8.4 over-hero pill): dark veil, white hairline, white text; presses in. */
function HeroShortcut(props: { label: string; onPress: () => void }) {
  const press = usePressScale();
  return (
    <AnimatedPressable
      style={[s.shortcut, press.style]}
      onPress={props.onPress}
      onPressIn={press.pressIn}
      onPressOut={press.pressOut}
      accessibilityRole="button"
    >
      <Text style={s.shortcutText}>{props.label}</Text>
    </AnimatedPressable>
  );
}

/**
 * Featured category tile (§8.5, as the web `.mt-category-tile`): the image over the category tint, the name on a
 * band in the category gradient along the bottom edge (contrast never depends on the photo).
 */
function FeaturedTile({ item, width }: { item: FeaturedCategory; width: number }) {
  const cat = useCategoryTheme(item.category.color);
  return (
    <Card
      style={{ width }}
      onPress={() => openCategory(item.category)}
      accessibilityRole="link"
      accessibilityLabel={item.category.name}
    >
      <View style={s.tile}>
        <Gradient
          token={{
            ...theme.gradient.brandBanner,
            colors: [cat.tint, cat.tintStrong],
            locations: [0, 1],
          }}
          fill
        />
        {item.image ? <Image source={{ uri: item.image.medium }} style={s.tileImage} /> : null}
        <Gradient
          token={{
            ...theme.gradient.brandBanner,
            colors: [cat.gradientStart, cat.gradientEnd],
            locations: [0, 1],
          }}
          style={s.tileBand}
        >
          <Text style={[s.tileText, { color: cat.onSolid }]} numberOfLines={2}>
            {item.category.name}
          </Text>
        </Gradient>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    height: theme.size.layout.headerHeightMobile,
    justifyContent: 'center',
    paddingHorizontal: theme.space[4],
    backgroundColor: theme.colors.bg.translucent,
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.border.translucent,
  },
  logo: { height: theme.size.layout.logoHeightMobile, width: theme.space[24] + theme.space[12] },
  hero: { gap: theme.space[3], padding: theme.space[4], backgroundColor: theme.colors.bg.hero },
  heroTitle: { ...theme.text.h2, color: theme.colors.text.onHero },
  heroSearch: {
    minHeight: theme.size.control.lg,
    justifyContent: 'center',
    paddingHorizontal: theme.space[4],
  },
  heroPlaceholder: { ...theme.text.body, color: theme.colors.text.muted },
  shortcuts: { flexDirection: 'row', gap: theme.space[3] },
  shortcut: {
    flex: 1,
    minHeight: theme.size.touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.overHero,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg.overHero,
  },
  shortcutText: { ...theme.text.label, color: theme.colors.text.onHero },
  pad: { padding: theme.space[4] },
  row: { marginTop: theme.space[6] },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    marginBottom: theme.space[3],
  },
  rowTitle: { ...theme.text.h3, color: theme.colors.text.primary, flexShrink: 1 },
  // The vertical padding leaves room for the card shadows inside the horizontal list.
  rowList: { paddingHorizontal: theme.space[4], paddingVertical: theme.space[1] },
  // The card's fill sits inside its 1 px border, so the clip is one pixel tighter.
  tile: {
    aspectRatio: theme.size.layout.cardImageRatio,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: theme.radius.card - theme.borderWidth.hairline,
  },
  tileImage: StyleSheet.absoluteFill,
  tileBand: { paddingHorizontal: theme.space[3], paddingVertical: theme.space[2] },
  tileText: theme.text.label,
});
