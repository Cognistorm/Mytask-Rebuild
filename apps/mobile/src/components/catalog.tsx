// Catalogue pieces of the app on the shared tokens (components.md §7.2 GigCard + Featured badge, FreelancerCard;
// spec 03 screens table, mobile column): gig card (full width in lists, fixed width in home rows), freelancer mini
// card, the full-screen filter sheet with a sticky "Show results" bar, the sort bottom sheet, and the gig results
// list with infinite scroll (42 per load) and pull to refresh. Same rules and keys as the web. Texts from i18n.
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import type { ApiClient } from '@mytask/api-client';
import {
  DELIVERY_KEYS,
  DELIVERY_TIMES,
  filterCount,
  NO_FILTERS,
  priceRangeInvalid,
  RATINGS,
  searchQuery,
  SORTS,
  type Filters,
  type GigCard,
  type SearchGigSort,
} from '../lib/catalog';
import { formatMoney } from '../lib/format';
import { gigUrl, openWebPage } from '../lib/web-pages';
import { EmptyState } from './dashboard';
import { Button, Notice } from './form';
import { Avatar, BottomSheet, RatingStars } from './profile';

type SellerCard = components['schemas']['SellerCard'];

export const openProfile = (username: string) =>
  router.push({ pathname: '/profile/[username]', params: { username } });

/**
 * One gig (§7.2): image 3:2, Featured frame + badge for Premium owners (AC-18, text + icon, never colour only),
 * seller row, 2-line title, rating or a quiet "No reviews yet", starting price. The gig page is slice 3 (the
 * website opens until then); the seller row opens the profile.
 */
export function GigCardView({
  gig,
  t,
  width,
}: {
  gig: GigCard;
  t: TFunction;
  /** Fixed width in a horizontal row; full width when left out. */
  width?: number;
}) {
  const average =
    gig.rating.averageTenths === null ? null : (gig.rating.averageTenths / 10).toFixed(1);
  return (
    <Pressable
      style={({ pressed }) => [
        s.card,
        gig.isFeatured && s.cardFeatured,
        width ? { width } : null,
        pressed && s.pressed,
      ]}
      onPress={() => openWebPage(gigUrl(gig.slug))}
      accessibilityRole="link"
      accessibilityLabel={gig.isFeatured ? `${gig.title}, ${t('t_featured')}` : gig.title}
      testID="gig-card"
    >
      <View style={s.media}>
        {gig.thumbnail ? (
          <Image source={{ uri: gig.thumbnail.medium }} style={s.mediaImage} />
        ) : null}
        {gig.isFeatured ? (
          <Text style={s.featured} accessibilityElementsHidden>
            {'♛ '}
            {t('t_featured')}
          </Text>
        ) : null}
      </View>
      <View style={s.body}>
        <Pressable
          style={s.seller}
          onPress={() => openProfile(gig.seller.username)}
          accessibilityRole="link"
          hitSlop={theme.space[2]}
        >
          <Avatar
            image={gig.seller.avatar}
            name={gig.seller.username}
            size="md"
            online={gig.seller.isOnline}
          />
          <Text style={s.sellerName} numberOfLines={1}>
            {gig.seller.username}
          </Text>
        </Pressable>
        <Text style={s.title} numberOfLines={2}>
          {gig.title}
        </Text>
        {average === null ? (
          <Text style={s.noReviews}>{t('t_no_reviews_yet')}</Text>
        ) : (
          <View style={s.rating}>
            <RatingStars
              tenths={gig.rating.averageTenths!}
              label={t('t_ui_rating_label', { rating: average, count: gig.rating.count })}
            />
            <Text style={s.ratingText}>
              {average} ({gig.rating.count})
            </Text>
          </View>
        )}
      </View>
      <View style={s.priceRow}>
        <Text style={s.priceLabel}>{t('t_starting_at')}</Text>
        <Text style={s.price}>{formatMoney(gig.price)}</Text>
      </View>
    </Pressable>
  );
}

/** A freelancer in home rows and lists (AC-27): avatar, username, "Account verified", up to 3 skills. */
export function SellerMini({
  seller,
  t,
  width,
  onSkill,
}: {
  seller: SellerCard;
  t: TFunction;
  width?: number;
  onSkill?: (slug: string) => void;
}) {
  const { user, skills } = seller;
  return (
    <View style={[s.seller_card, width ? { width } : null]} testID="freelancer-card">
      <Pressable
        style={s.sellerHead}
        onPress={() => openProfile(user.username)}
        accessibilityRole="link"
      >
        <Avatar image={user.avatar} name={user.username} size="lg" online={user.isOnline} />
        <Text style={s.title}>{user.username}</Text>
        {user.isIdVerified ? <Text style={s.verified}>{t('t_account_verified')}</Text> : null}
      </Pressable>
      <View style={s.skills}>
        {skills.map((k) => (
          <Pressable
            key={k.slug}
            onPress={() => onSkill?.(k.slug)}
            disabled={!onSkill}
            accessibilityRole={onSkill ? 'link' : undefined}
          >
            <Text style={s.chip}>{k.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Full-screen filters (spec 03 screens: "a full-screen sheet with a sticky Show results bar"). */
export function FilterSheet(props: {
  open: boolean;
  value: Filters;
  t: TFunction;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  const { t } = props;
  const [draft, setDraft] = useState(props.value);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (props.open) {
      setDraft(props.value);
      setError(false);
    }
  }, [props.open, props.value]);

  const option = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      style={s.option}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[s.radio, selected && s.radioOn]} />
      <Text style={s.optionText}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={props.open} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={s.sheetScreen} testID="filter-sheet">
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle} accessibilityRole="header">
            {t('t_filter')}
          </Text>
          <Pressable
            onPress={props.onClose}
            accessibilityRole="button"
            accessibilityLabel={t('t_ui_close')}
            hitSlop={theme.space[3]}
          >
            <Text style={s.close}>{'✕'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.sheetBody}>
          <Text style={s.legend}>{t('t_rating')}</Text>
          {RATINGS.map((n) =>
            option(
              n === 5 ? t('t_5_stars') : t('t_rating_n_plus', { n }),
              draft.rating === n,
              () => setDraft({ ...draft, rating: draft.rating === n ? null : n }),
              `r${n}`,
            ),
          )}
          <Text style={s.legend}>{t('t_price')}</Text>
          <View style={s.prices}>
            {(['minPrice', 'maxPrice'] as const).map((k) => (
              <View key={k} style={s.priceField}>
                <Text style={s.priceFieldLabel}>
                  {t(k === 'minPrice' ? 't_min_price' : 't_max_price')}
                </Text>
                <TextInput
                  style={[s.input, error && s.inputError]}
                  value={draft[k]}
                  onChangeText={(v) => {
                    setError(false);
                    setDraft({ ...draft, [k]: v });
                  }}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t(k === 'minPrice' ? 't_min_price' : 't_max_price')}
                />
              </View>
            ))}
          </View>
          {error ? <Notice kind="error" text={t('t_min_price_greater_than_max')} /> : null}
          <Text style={s.legend}>{t('t_delivery_time')}</Text>
          {DELIVERY_TIMES.map((d) =>
            option(
              t('t_up_to_delivery', { time: t(DELIVERY_KEYS[d]) }),
              draft.deliveryTime === d,
              () => setDraft({ ...draft, deliveryTime: draft.deliveryTime === d ? null : d }),
              `d${d}`,
            ),
          )}
        </ScrollView>
        <View style={s.stickyBar}>
          {filterCount(draft) > 0 ? (
            <Pressable onPress={() => setDraft(NO_FILTERS)} accessibilityRole="button">
              <Text style={s.link}>{t('t_reset_filter')}</Text>
            </Pressable>
          ) : null}
          <View style={s.stickyButton}>
            <Button
              label={t('t_show_results')}
              onPress={() => {
                if (priceRangeInvalid(draft)) return setError(true);
                props.onApply(draft);
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** The sort menu as a bottom sheet (spec 03 screens). */
export function SortSheet(props: {
  open: boolean;
  value: SearchGigSort;
  t: TFunction;
  onClose: () => void;
  onPick: (s: SearchGigSort) => void;
}) {
  const { t } = props;
  return (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={t('t_sort_by')}
      closeLabel={t('t_ui_close')}
      testID="sort-sheet"
    >
      {SORTS.map((o) => (
        <Pressable
          key={o.value}
          style={s.option}
          onPress={() => props.onPick(o.value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: o.value === props.value }}
        >
          <View style={[s.radio, o.value === props.value && s.radioOn]} />
          <Text style={s.optionText}>{t(o.key)}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready' };

/**
 * Gig results with the toolbar (count, Filter, Sort), 42 per load with infinite scroll, pull to refresh, the empty
 * state with "Reset filter" and an error state with retry. `header` renders above the toolbar (search field,
 * category title).
 */
export function GigResults(props: {
  api: ApiClient;
  t: TFunction;
  q: string;
  categoryId?: string;
  header?: ReactElement;
  testID?: string;
}) {
  const { api, t } = props;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SearchGigSort>('recommended');
  const [gigs, setGigs] = useState<GigCard[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const run = useRef(0);

  const { q, categoryId } = props;
  const load = useCallback(
    async (after: string | null) => {
      const id = ++run.current;
      const query = searchQuery({ q, categoryId, filters, sort }, after);
      const res = await api.GET('/search/gigs', { params: { query } }).catch(() => undefined);
      if (id !== run.current) return;
      if (!res?.data) return setState({ kind: 'error' });
      const page = res.data.data as GigCard[];
      setGigs((prev) =>
        after ? [...prev, ...page.filter((g) => !prev.some((p) => p.id === g.id))] : page,
      );
      setTotal(res.data.totalCount ?? 0);
      setCursor(res.data.nextCursor);
      setState({ kind: 'ready' });
    },
    [api, q, categoryId, filters, sort],
  );

  useEffect(() => {
    setState({ kind: 'loading' });
    void load(null);
  }, [load]);

  const count = filterCount(filters);
  const toolbar = (
    <View style={s.toolbar}>
      <Text style={s.count}>
        {state.kind === 'ready' ? t('t_n_results', { count: total }) : ''}
      </Text>
      <View style={s.toolbarButtons}>
        <Pressable
          style={s.toolButton}
          onPress={() => setSheet('filter')}
          accessibilityRole="button"
          testID="open-filters"
        >
          <Text style={s.toolText}>
            {t('t_filter')}
            {count ? ` (${count})` : ''}
          </Text>
        </Pressable>
        <Pressable
          style={s.toolButton}
          onPress={() => setSheet('sort')}
          accessibilityRole="button"
          testID="open-sort"
        >
          <Text style={s.toolText}>{t(SORTS.find((o) => o.value === sort)!.key)}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <FlatList
        testID={props.testID}
        data={state.kind === 'ready' ? gigs : []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GigCardView gig={item} t={t} />}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: theme.space[4] }} />}
        ListHeaderComponent={
          <>
            {props.header}
            {toolbar}
          </>
        }
        ListEmptyComponent={
          state.kind === 'loading' ? (
            <ActivityIndicator accessibilityLabel={t('t_ui_loading')} />
          ) : state.kind === 'error' ? (
            <View style={s.errorBox}>
              <Notice kind="error" text={t('t_toast_something_went_wrong')} />
              <Button label={t('t_retry')} onPress={() => void load(null)} />
            </View>
          ) : (
            <EmptyState
              title={t('t_we_couldnt_find_anthing_search_term')}
              action={
                count ? (
                  <Button label={t('t_reset_filter')} onPress={() => setFilters(NO_FILTERS)} />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={more ? <ActivityIndicator /> : null}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!cursor || more || state.kind !== 'ready') return;
          setMore(true);
          void load(cursor).finally(() => setMore(false));
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(null).finally(() => setRefreshing(false));
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      <FilterSheet
        open={sheet === 'filter'}
        value={filters}
        t={t}
        onClose={() => setSheet(null)}
        onApply={(f) => {
          setSheet(null);
          setFilters(f);
        }}
      />
      <SortSheet
        open={sheet === 'sort'}
        value={sort}
        t={t}
        onClose={() => setSheet(null)}
        onPick={(v) => {
          setSheet(null);
          setSort(v);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.bg.surface,
  },
  cardFeatured: {
    borderWidth: theme.borderWidth.strong,
    borderColor: theme.colors.border.featured,
  },
  pressed: { opacity: 0.85 },
  media: { aspectRatio: theme.size.layout.cardImageRatio, backgroundColor: theme.colors.bg.subtle },
  mediaImage: { width: '100%', height: '100%' },
  featured: {
    position: 'absolute',
    top: theme.space[2],
    left: theme.space[2],
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space['0.5'],
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.badge.featuredBg,
    color: theme.colors.badge.featuredText,
    ...theme.text.badge,
  },
  body: { gap: theme.space[2], paddingHorizontal: theme.space[4], paddingTop: theme.space[3] },
  seller: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  sellerName: { ...theme.text.bodySm, color: theme.colors.text.primary, flexShrink: 1 },
  title: { ...theme.text.title, color: theme.colors.text.primary },
  noReviews: { ...theme.text.caption, color: theme.colors.text.muted },
  rating: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
  ratingText: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[3],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.subtle,
  },
  priceLabel: { ...theme.text.caption, color: theme.colors.text.muted },
  price: { ...theme.text.price, color: theme.colors.text.primary },
  seller_card: {
    alignItems: 'center',
    gap: theme.space[2],
    padding: theme.space[4],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.subtle,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.bg.surface,
  },
  sellerHead: { alignItems: 'center', gap: theme.space[2] },
  verified: { ...theme.text.caption, color: theme.colors.text.success },
  skills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[2] },
  chip: {
    ...theme.text.caption,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg.subtle,
    color: theme.colors.text.secondary,
  },
  sheetScreen: { flex: 1, backgroundColor: theme.colors.bg.surface },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.space[4],
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.border.subtle,
  },
  sheetTitle: { ...theme.text.h3, color: theme.colors.text.primary },
  close: { ...theme.text.h3, color: theme.colors.text.secondary },
  sheetBody: { padding: theme.space[4], gap: theme.space[1] },
  legend: {
    ...theme.text.label,
    color: theme.colors.text.primary,
    marginTop: theme.space[4],
    marginBottom: theme.space[1],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.touchTarget.min,
  },
  radio: {
    width: theme.size.checkbox,
    height: theme.size.checkbox,
    borderRadius: theme.radius.full,
    borderWidth: theme.borderWidth.strong,
    borderColor: theme.colors.border.strong,
  },
  radioOn: {
    borderColor: theme.colors.action.primary,
    backgroundColor: theme.colors.action.primary,
  },
  optionText: { ...theme.text.body, color: theme.colors.text.primary },
  prices: { flexDirection: 'row', gap: theme.space[3] },
  priceField: { flex: 1, gap: theme.space[1] },
  priceFieldLabel: { ...theme.text.caption, color: theme.colors.text.secondary },
  input: {
    ...theme.text.body,
    minHeight: theme.size.control.md,
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
    color: theme.colors.text.primary,
  },
  inputError: { borderColor: theme.colors.border.danger },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[4],
    minHeight: theme.size.layout.stickyBarMinHeight,
    paddingHorizontal: theme.space[4],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.bg.surface,
  },
  stickyButton: { flex: 1 },
  link: { ...theme.text.label, color: theme.colors.text.link },
  list: { padding: theme.space[4], paddingBottom: theme.space[12] },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[2],
    marginBottom: theme.space[4],
  },
  toolbarButtons: { flexDirection: 'row', gap: theme.space[2] },
  toolButton: {
    minHeight: theme.size.touchTarget.min,
    justifyContent: 'center',
    paddingHorizontal: theme.space[3],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.surface,
  },
  toolText: { ...theme.text.label, color: theme.colors.text.primary },
  count: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  errorBox: { gap: theme.space[3] },
});
