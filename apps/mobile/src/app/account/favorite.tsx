// Buying → Favourites in the app (ROADMAP 4.3.16; spec 04 AC-35, AC-36, EC-11; url-map `/account/favorite`), the same
// data, texts and ops as the web (4.3.12c, legacy `Main/Account/Favorite/FavoriteComponent.php`): the saved gigs
// that are still listable, newest saved first, 42 per page (`listFavorites`, Load more), each with its thumbnail and
// title (→ gig screen), seller (→ profile), starting price and "Remove from favorite" with the legacy confirm
// (`deleteFavorite`; a 404 also drops the row: already removed, or the gig is no longer public).
import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { openGig, openProfile } from '../../components/catalog';
import { EmptyState, SecondaryButton, Skeleton } from '../../components/dashboard';
import { Button, Notice, Screen } from '../../components/form';
import { BottomSheet } from '../../components/profile';
import type { ApiError } from '../../components/reauth';
import { loadSession, mobileApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { createT } from '../../lib/i18n';
import { Button as UiButton, Card } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type GigCard = components['schemas']['GigCard'];

/** Spec 04 AC-36: 42 per page (contract `listFavorites`). */
const PAGE_SIZE = 42;

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'ready'; rows: GigCard[]; cursor: string | null };

export default function FavoritesScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [ok, setOk] = useState<string>();
  const [error, setError] = useState<string>();
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [confirm, setConfirm] = useState<GigCard>();
  const [removing, setRemoving] = useState(false);

  const page = useCallback(
    (cursor: string | null) =>
      api
        .GET('/favorites', {
          params: { query: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) } },
        })
        .catch(() => undefined),
    [],
  );

  const load = useCallback(async () => {
    // Coming back (e.g. from a gig whose heart was cleared) re-reads quietly; only the first load shows the skeleton.
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    // `getMe` first (as the web dashboard shell): refreshes an expired token, and restricted users only reach the
    // restrictions removal center (spec 01 AC-19).
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) {
      return setState(me?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    if (me.data.isRestricted) return setState({ kind: 'restricted' });
    const res = await page(null);
    if (!res?.data) {
      return setState(res?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    setMoreFailed(false);
    setState({
      kind: 'ready',
      rows: (res.data.data ?? []) as GigCard[],
      cursor: res.data.nextCursor,
    });
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function more() {
    if (state.kind !== 'ready' || !state.cursor) return;
    setMoreBusy(true);
    setMoreFailed(false);
    const next = await page(state.cursor);
    setMoreBusy(false);
    if (!next?.data) return setMoreFailed(true);
    const seen = new Set(state.rows.map((r) => r.id));
    setState({
      ...state,
      rows: [
        ...state.rows,
        ...((next.data.data ?? []) as GigCard[]).filter((r) => !seen.has(r.id)),
      ],
      cursor: next.data.nextCursor,
    });
  }

  async function remove(card: GigCard) {
    setRemoving(true);
    setError(undefined);
    setOk(undefined);
    const res = await api
      .DELETE('/favorites/{gigId}', { params: { path: { gigId: card.id } } })
      .catch(() => undefined);
    setRemoving(false);
    setConfirm(undefined);
    if (!res) return setError(t('t_toast_something_went_wrong'));
    // Already gone (removed elsewhere, or the gig is no longer public): drop the row all the same.
    if (res.error && res.response.status !== 404) {
      return setError((res.error as ApiError).message ?? t('t_toast_something_went_wrong'));
    }
    setState((s) =>
      s.kind === 'ready' ? { ...s, rows: s.rows.filter((r) => r.id !== card.id) } : s,
    );
    setOk(t('t_gig_removed_from_ur_favorite_list'));
  }

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  return (
    <Screen title={t('t_favorite_list')}>
      {ok ? <Notice kind="success" text={ok} /> : null}
      {error ? <Notice kind="error" text={error} /> : null}

      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={3} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <>
          {state.rows.length === 0 ? <EmptyState title={t('t_no_favorites_yet')} /> : null}
          <View style={s.list} testID="favorites">
            {state.rows.map((card) => (
              <Card key={card.id} style={s.item} testID="favorites-item">
                <Pressable
                  style={({ pressed }) => [s.itemLink, pressed && s.pressed]}
                  onPress={() => openGig(card.slug)}
                  accessibilityRole="link"
                  accessibilityLabel={card.title}
                  accessibilityLanguage={
                    card.contentLocale !== locale ? card.contentLocale : undefined
                  }
                >
                  {card.thumbnail ? (
                    <Image
                      source={{ uri: card.thumbnail.medium }}
                      style={s.thumb}
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <View style={s.thumb} />
                  )}
                  <View style={s.itemText}>
                    <Text style={s.itemTitle} numberOfLines={2}>
                      {card.title}
                    </Text>
                    <Text style={s.fact}>
                      {t('t_starting_at')}{' '}
                      <Text style={s.factValue}>{formatMoney(card.price)}</Text>
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.seller, pressed && s.pressed]}
                  onPress={() => openProfile(card.seller.username)}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('t_seller')}: ${card.seller.username}`}
                  hitSlop={theme.space[2]}
                >
                  <Text style={s.fact}>
                    {t('t_seller')}: <Text style={s.sellerName}>{card.seller.username}</Text>
                  </Text>
                </Pressable>
                <View style={s.actions}>
                  <UiButton
                    variant="ghost"
                    label={t('t_remove_from_favorite')}
                    accessibilityLabel={`${t('t_remove_from_favorite')}: ${card.title}`}
                    onPress={() => setConfirm(card)}
                  />
                </View>
              </Card>
            ))}
          </View>
          {moreFailed ? <Notice kind="error" text={t('t_toast_something_went_wrong')} /> : null}
          {state.cursor ? (
            <SecondaryButton label={t('t_load_more')} onPress={() => !moreBusy && void more()} />
          ) : null}
        </>
      ) : null}

      <BottomSheet
        open={!!confirm}
        onClose={() => setConfirm(undefined)}
        title={t('t_remove_from_favorite')}
        closeLabel={t('t_ui_close')}
        testID="remove-sheet"
      >
        <Text style={s.body}>{t('t_are_u_sure_u_want_to_remove_from_favorite_list')}</Text>
        <View style={s.sheetButtons}>
          <SecondaryButton label={t('t_cancel')} onPress={() => setConfirm(undefined)} />
          <Button
            label={t('t_remove')}
            danger
            busy={removing}
            onPress={() => confirm && void remove(confirm)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { gap: theme.space[3] },
  item: { padding: theme.space[3], gap: theme.space[2] },
  itemLink: { flexDirection: 'row', gap: theme.space[3], borderRadius: theme.radius.md },
  pressed: { backgroundColor: theme.colors.action.ghostPressed },
  thumb: {
    width: theme.size.avatar.xl,
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  itemText: { flex: 1, gap: theme.space[1] },
  itemTitle: { ...theme.text.label, color: theme.colors.text.primary },
  fact: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  factValue: { ...theme.text.label, color: theme.colors.text.primary },
  seller: { alignSelf: 'flex-start', borderRadius: theme.radius.md },
  sellerName: { ...theme.text.label, color: theme.colors.text.link },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  sheetButtons: { gap: theme.space[2] },
});
