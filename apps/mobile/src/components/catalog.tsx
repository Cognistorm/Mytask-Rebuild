// Catalogue pieces of the app on the shared tokens (components.md §7.2 GigCard + Featured badge, FreelancerCard;
// spec 03 screens table, mobile column): gig card (full width in lists, fixed width in home rows), freelancer mini
// card, the full-screen filter sheet with a sticky "Show results" bar, the sort bottom sheet, and the gig results
// list with infinite scroll (42 per load) and pull to refresh. Same rules and keys as the web. Texts from i18n.
// 3X look (3X.17a): cards on the native `Card`, skills as `Chip`s, the brand-gradient avatar ring, radios and price
// fields in the §6.3 control look, a Secondary icon close, Secondary toolbar buttons, M-10 entrance on the first page.
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  AccessibilityInfo,
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
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
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
import { getViewerName } from '../lib/api';
import { formatMoney } from '../lib/format';
import { EmptyState } from './dashboard';
import { Button, Notice } from './form';
import { Avatar, AvatarRing, BottomSheet, OutlineButton, RatingStars } from './profile';
import { Button as UiButton, Card, Chip, enterAt, IconButton, InputFrame, Radio } from '../ui';

type SellerCard = components['schemas']['SellerCard'];

export const openProfile = (username: string) =>
  router.push({ pathname: '/profile/[username]', params: { username } });

/** The gig screen (`/service/{slug}`, ROADMAP 4.3.14). */
export const openGig = (slug: string) =>
  router.push({ pathname: '/service/[slug]', params: { slug } });

/** A gig category screen by its slug path (`design/logo-design`). */
export const openCategoryPath = (path: string) =>
  router.push({ pathname: '/categories/[...path]', params: { path: path.split('/') } });

/**
 * One gig (§7.2): image 3:2, Featured frame + badge for Premium owners (AC-18, text + icon, never colour only),
 * seller row, 2-line title, rating or a quiet "No reviews yet", starting price. The card opens the gig screen; the
 * seller row opens the profile; the heart over the image saves the gig (spec 04 AC-35, ROADMAP 4.3.20b).
 */
export function GigCardView({
  gig,
  t,
  api,
  width,
}: {
  gig: GigCard;
  t: TFunction;
  api: ApiClient;
  /** Fixed width in a horizontal row; full width when left out. */
  width?: number;
}) {
  const average =
    gig.rating.averageTenths === null ? null : (gig.rating.averageTenths / 10).toFixed(1);
  const { heart, action } = useCardHeart({ gig, t, api });
  return (
    <Card
      featured={gig.isFeatured}
      style={width ? { width } : null}
      onPress={() => openGig(gig.slug)}
      accessibilityRole="link"
      accessibilityLabel={gig.isFeatured ? `${gig.title}, ${t('t_featured')}` : gig.title}
      accessibilityActions={action ? [{ name: 'favorite', label: action.label }] : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'favorite') action?.run();
      }}
      testID="gig-card"
    >
      <View
        style={[
          s.media,
          // The image clips to the card's inner corners (inside the 1 px or Featured 2 px border).
          {
            borderTopLeftRadius: inner(gig.isFeatured),
            borderTopRightRadius: inner(gig.isFeatured),
          },
        ]}
      >
        {gig.thumbnail ? (
          <Image source={{ uri: gig.thumbnail.medium }} style={s.mediaImage} />
        ) : null}
        {gig.isFeatured ? (
          <Text style={s.featured} accessibilityElementsHidden>
            {'♛ '}
            {t('t_featured')}
          </Text>
        ) : null}
        {heart}
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
    </Card>
  );
}

// Phosphor Heart regular / fill (256 grid), as the gig screen's header (gig-actions.tsx).
const HEART = {
  off: 'M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62Zm-50 174.8C109.74 204.16 32 155.69 32 102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8Z',
  on: 'M240 102c0 70-103.79 126.66-108.21 129a8 8 0 0 1-7.58 0C119.79 228.66 16 172 16 102a62.07 62.07 0 0 1 62-62c20.65 0 38.73 8.88 50 23.89C139.27 48.88 157.35 40 178 40a62.07 62.07 0 0 1 62 62Z',
} as const;

/** How long the added / removed message stays over the image (the legacy toast). */
const NOTE_MS = 4000;

/**
 * The card's favourite heart (spec 04 AC-35 "on the gig page or a gig card"; legacy `cards/gig.blade.php:78-107`;
 * components.md §7.2 top-right over the image): `putFavorite` / `deleteFavorite` with the gig screen's legacy
 * messages, shown over the image and announced. Guests and an ended session get the login sheet. Not on the
 * visitor's own gigs (R-G10), and not until the app knows who is signed in. `action` is the same toggle as a
 * screen-reader action of the card, which groups its content (the heart inside is not reachable on its own).
 */
function useCardHeart({ gig, t, api }: { gig: GigCard; t: TFunction; api: ApiClient }): {
  heart: ReactElement | null;
  action: { label: string; run: () => void } | null;
} {
  const [viewer, setViewer] = useState<string | null>();
  const [favorite, setFavorite] = useState(gig.isFavorite ?? false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let live = true;
    void getViewerName(api).then((name) => {
      if (live) setViewer(name);
    });
    return () => {
      live = false;
    };
  }, [api]);
  useEffect(() => setFavorite(gig.isFavorite ?? false), [gig.isFavorite]);
  useEffect(() => {
    if (!note) return;
    AccessibilityInfo.announceForAccessibility(note.text);
    const timer = setTimeout(() => setNote(undefined), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  if (viewer === undefined) return { heart: null, action: null };
  if (viewer !== null && viewer.toLowerCase() === gig.seller.username.toLowerCase())
    return { heart: null, action: null };

  async function toggle() {
    if (viewer === null) return setLoginOpen(true);
    setBusy(true);
    const path = { params: { path: { gigId: gig.id } } };
    const res = await (
      favorite ? api.DELETE('/favorites/{gigId}', path) : api.PUT('/favorites/{gigId}', path)
    ).catch(() => undefined);
    setBusy(false);
    if (res?.response.status === 401) return setLoginOpen(true);
    if (!res || res.error) {
      const message = (res?.error as { message?: string } | undefined)?.message;
      return setNote({ text: message || t('t_toast_something_went_wrong'), error: true });
    }
    setFavorite(!favorite);
    setNote({
      text: t(
        favorite ? 't_gig_removed_from_ur_favorite_list' : 't_gig_has_been_added_to_favorite_list',
      ),
    });
  }

  const px = theme.size.icon.md;
  const label = t(favorite ? 't_remove_from_favorite' : 't_add_to_favorite');
  const run = () => {
    if (!busy) void toggle();
  };
  const heart = (
    <>
      <View style={s.heart}>
        <IconButton
          accessibilityLabel={label}
          accessibilityState={{ busy, selected: favorite }}
          onPress={run}
          testID="card-favorite"
        >
          <Svg width={px} height={px} viewBox="0 0 256 256" accessible={false}>
            <Path
              d={favorite ? HEART.on : HEART.off}
              fill={favorite ? theme.colors.feedback.dangerIcon : theme.colors.text.secondary}
            />
          </Svg>
        </IconButton>
      </View>
      {note ? (
        <Text
          style={[s.heartNote, note.error ? s.heartNoteError : null]}
          numberOfLines={3}
          testID="card-favorite-note"
        >
          {note.text}
        </Text>
      ) : null}
      <BottomSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title={t('t_add_to_favorite')}
        closeLabel={t('t_ui_close')}
        testID="card-favorite-login"
      >
        <Notice kind="info" text={t('t_pls_login_or_register_to_add_to_favovorite')} />
        <OutlineButton
          label={t('t_login')}
          onPress={() => {
            setLoginOpen(false);
            router.push('/login');
          }}
        />
      </BottomSheet>
    </>
  );
  return { heart, action: { label, run } };
}

const inner = (featured: boolean) =>
  theme.radius.card - (featured ? theme.borderWidth.strong : theme.borderWidth.hairline);

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
    <Card style={[s.sellerCard, width ? { width } : null]} testID="freelancer-card">
      <Pressable
        style={s.sellerHead}
        onPress={() => openProfile(user.username)}
        accessibilityRole="link"
      >
        {/* The avatar sits in a ring of the brand gradient (visual-refresh.md §12, as the web best sellers). */}
        <AvatarRing>
          <Avatar image={user.avatar} name={user.username} size="lg" online={user.isOnline} />
        </AvatarRing>
        <Text style={s.title}>{user.username}</Text>
        {user.isIdVerified ? <Text style={s.verified}>{t('t_account_verified')}</Text> : null}
      </Pressable>
      <View style={s.skills}>
        {skills.map((k) => (
          <Chip
            key={k.slug}
            label={k.name}
            onPress={onSkill ? () => onSkill(k.slug) : undefined}
            accessibilityRole="link"
          />
        ))}
      </View>
    </Card>
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
  const [focused, setFocused] = useState<'minPrice' | 'maxPrice' | null>(null);
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
      <Radio checked={selected} />
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
          <IconButton onPress={props.onClose} accessibilityLabel={t('t_ui_close')}>
            <Text style={s.close}>{'✕'}</Text>
          </IconButton>
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
                <InputFrame focused={focused === k} invalid={error}>
                  <TextInput
                    style={s.input}
                    value={draft[k]}
                    onChangeText={(v) => {
                      setError(false);
                      setDraft({ ...draft, [k]: v });
                    }}
                    onFocus={() => setFocused(k)}
                    onBlur={() => setFocused((f) => (f === k ? null : f))}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t(k === 'minPrice' ? 't_min_price' : 't_max_price')}
                  />
                </InputFrame>
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
          <Radio checked={o.value === props.value} />
          <Text style={s.optionText}>{t(o.key)}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready' };

/** M-10 for the first items of a list (the first view); later pages appear without an entrance. */
const firstView = (index: number) =>
  index < theme.motion.stagger.max ? enterAt(index) : undefined;

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
        <UiButton
          variant="secondary"
          label={count ? `${t('t_filter')} (${count})` : t('t_filter')}
          onPress={() => setSheet('filter')}
          testID="open-filters"
        />
        <UiButton
          variant="secondary"
          label={t(SORTS.find((o) => o.value === sort)!.key)}
          onPress={() => setSheet('sort')}
          testID="open-sort"
        />
      </View>
    </View>
  );

  return (
    <>
      <FlatList
        testID={props.testID}
        data={state.kind === 'ready' ? gigs : []}
        keyExtractor={(g) => g.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={firstView(index)}>
            <GigCardView gig={item} t={t} api={api} />
          </Animated.View>
        )}
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

/**
 * Freelancer list of `/sellers` (40 per load) and `/hire/{keyword}` (42 per load) with infinite scroll and pull to
 * refresh (spec 03 AC-27, AC-28, R-S6). `fetchPage` answers one page (`null` = failed).
 */
export function SellerResults(props: {
  t: TFunction;
  fetchPage: (
    cursor: string | null,
  ) => Promise<{ data: SellerCard[]; nextCursor: string | null } | null>;
  header?: ReactElement;
  testID?: string;
}) {
  const { t, fetchPage } = props;
  const [sellers, setSellers] = useState<SellerCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (after: string | null) => {
      const page = await fetchPage(after);
      if (!page) return setState({ kind: 'error' });
      setSellers((prev) =>
        after
          ? [...prev, ...page.data.filter((x) => !prev.some((p) => p.user.id === x.user.id))]
          : page.data,
      );
      setCursor(page.nextCursor);
      setState({ kind: 'ready' });
    },
    [fetchPage],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  return (
    <FlatList
      testID={props.testID}
      data={state.kind === 'ready' ? sellers : []}
      keyExtractor={(x) => x.user.id}
      renderItem={({ item, index }) => (
        <Animated.View entering={firstView(index)}>
          <SellerMini
            seller={item}
            t={t}
            onSkill={(slug) =>
              router.push({ pathname: '/hire/[keyword]', params: { keyword: slug } })
            }
          />
        </Animated.View>
      )}
      contentContainerStyle={s.list}
      ItemSeparatorComponent={() => <View style={{ height: theme.space[4] }} />}
      ListHeaderComponent={props.header}
      ListEmptyComponent={
        state.kind === 'loading' ? (
          <ActivityIndicator accessibilityLabel={t('t_ui_loading')} />
        ) : state.kind === 'error' ? (
          <View style={s.errorBox}>
            <Notice kind="error" text={t('t_toast_something_went_wrong')} />
            <Button label={t('t_retry')} onPress={() => void load(null)} />
          </View>
        ) : (
          <EmptyState title={t('no_results_found')} />
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
    />
  );
}

const s = StyleSheet.create({
  media: {
    overflow: 'hidden',
    aspectRatio: theme.size.layout.cardImageRatio,
    backgroundColor: theme.colors.bg.subtle,
  },
  mediaImage: { width: '100%', height: '100%' },
  heart: { position: 'absolute', top: theme.space[1], right: theme.space[1] },
  heartNote: {
    position: 'absolute',
    left: theme.space[2],
    right: theme.space[2],
    bottom: theme.space[2],
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.bg.inverse,
    color: theme.colors.text.inverse,
    textAlign: 'center',
    ...theme.text.caption,
  },
  heartNoteError: {
    backgroundColor: theme.colors.feedback.dangerBg,
    color: theme.colors.feedback.dangerText,
  },
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
  sellerCard: { alignItems: 'center', gap: theme.space[2], padding: theme.space[4] },
  sellerHead: { alignItems: 'center', gap: theme.space[2] },
  verified: { ...theme.text.caption, color: theme.colors.text.success },
  skills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[2] },
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
  close: { ...theme.text.label, color: theme.colors.text.primary },
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
  optionText: { ...theme.text.body, color: theme.colors.text.primary },
  prices: { flexDirection: 'row', gap: theme.space[3] },
  priceField: { flex: 1, gap: theme.space[1] },
  priceFieldLabel: { ...theme.text.caption, color: theme.colors.text.secondary },
  input: {
    ...theme.text.body,
    minHeight: theme.size.control.md,
    paddingHorizontal: theme.space[3],
    color: theme.colors.text.primary,
  },
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
  count: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  errorBox: { gap: theme.space[3] },
});
