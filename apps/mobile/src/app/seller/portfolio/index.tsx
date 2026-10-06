// Selling → Portfolio in the app (spec 02 AC-27, AC-28, AC-42; screens table "Selling → Portfolio → +"), the same
// data, order, texts and ops as the web `/seller/portfolio` (legacy `Seller/Portfolio/PortfolioComponent.php`): the
// owner's works newest first with their status (Pending / Active / Rejected + reason), Edit and Delete (with a
// confirm), "Add a new work", Load more (24). Reads `listPortfolioItems` with the own username (the owner also gets
// pending and rejected items); the reason of a rejected item comes from `getPortfolioItem` (cards do not carry it).
// A work opens the item viewer (the web opens the public page in a new tab).
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { EmptyState, SecondaryButton, Skeleton } from '../../../components/dashboard';
import { Button, Notice, Screen } from '../../../components/form';
import { openPortfolioItem } from '../../../components/portfolio';
import { BottomSheet, Pill } from '../../../components/profile';
import type { ApiError } from '../../../components/reauth';
import { loadSession, mobileApi } from '../../../lib/api';
import { takeFlash } from '../../../lib/flash';
import { createT } from '../../../lib/i18n';
import { PORTFOLIO_PAGE_SIZE, type PortfolioItemCard } from '../../../lib/profile';
import { inSentence } from '@mytask/i18n';
import { Button as UiButton, Card } from '../../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

const STATUS = {
  pending: { key: 't_pending', tone: 'warning' },
  active: { key: 't_active', tone: 'success' },
  rejected: { key: 't_portfolio_status_rejected', tone: 'danger' },
} as const;

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'ready'; username: string; items: PortfolioItemCard[]; cursor: string | null };

export default function MyPortfolioScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [confirm, setConfirm] = useState<PortfolioItemCard>();
  const [deleting, setDeleting] = useState(false);

  const page = useCallback(async (username: string, cursor: string | null) => {
    const res = await api
      .GET('/portfolio-items', {
        params: {
          query: { username, limit: PORTFOLIO_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        },
      })
      .catch(() => undefined);
    if (!res?.data) return undefined;
    // AC-42: the owner sees why a work was rejected.
    for (const card of res.data.data.filter((i) => i.status === 'rejected')) {
      void api
        .GET('/portfolio-items/{portfolioItemId}', {
          params: { path: { portfolioItemId: card.id } },
        })
        .then((r) => {
          const reason = r.data?.rejectionReason;
          if (reason) setReasons((all) => ({ ...all, [card.id]: reason }));
        });
    }
    return res.data;
  }, []);

  const load = useCallback(async () => {
    // Coming back (e.g. from the form) re-reads quietly; only the first load shows the skeleton.
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) {
      return setState(me?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    if (me.data.isRestricted) return setState({ kind: 'restricted' });
    const first = await page(me.data.username, null);
    if (!first) return setState({ kind: 'error' });
    setMoreFailed(false);
    setState({
      kind: 'ready',
      username: me.data.username,
      items: first.data,
      cursor: first.nextCursor,
    });
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      // The success message of the create/edit form (legacy redirect `with('success', …)`), shown once.
      const flash = takeFlash();
      if (flash.length) {
        setOk(flash);
        setError(undefined);
      }
      void load();
    }, [load]),
  );

  async function more() {
    if (state.kind !== 'ready' || !state.cursor) return;
    setMoreBusy(true);
    setMoreFailed(false);
    const next = await page(state.username, state.cursor);
    setMoreBusy(false);
    if (!next) return setMoreFailed(true);
    const seen = new Set(state.items.map((i) => i.id));
    setState({
      ...state,
      items: [...state.items, ...next.data.filter((i) => !seen.has(i.id))],
      cursor: next.nextCursor,
    });
  }

  async function remove(card: PortfolioItemCard) {
    setDeleting(true);
    setError(undefined);
    const res = await api
      .DELETE('/portfolio-items/{portfolioItemId}', {
        params: { path: { portfolioItemId: card.id } },
      })
      .catch(() => undefined);
    setDeleting(false);
    setConfirm(undefined);
    if (!res || res.error) {
      setOk([]);
      return setError(
        (res?.error as ApiError | undefined)?.message ?? t('t_toast_something_went_wrong'),
      );
    }
    setState((s) =>
      s.kind === 'ready' ? { ...s, items: s.items.filter((i) => i.id !== card.id) } : s,
    );
    setOk([t('t_project_deleted_success')]);
  }

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  const create = () => router.push('/seller/portfolio/create');

  return (
    <Screen title={t('my_portfolio')}>
      <Button label={t('t_add_new_work')} onPress={create} />
      {ok.length > 0 ? <Notice kind="success" text={ok.join('\n')} /> : null}
      {error ? <Notice kind="error" text={error} /> : null}

      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={2} rows={2} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <>
          {state.items.length === 0 ? <EmptyState title={t('t_no_portfolio_yet')} /> : null}
          <View style={s.list} testID="my-portfolio">
            {state.items.map((card) => (
              <Card key={card.id} style={s.item} testID="my-portfolio-item">
                <Pressable
                  style={({ pressed }) => [s.itemLink, pressed && s.pressed]}
                  onPress={() => openPortfolioItem(state.username, card.slug)}
                  accessibilityRole="link"
                  accessibilityLabel={`${card.title}, ${t(STATUS[card.status].key)}`}
                >
                  <Image
                    source={{ uri: card.thumbnail.medium }}
                    style={s.thumb}
                    accessibilityIgnoresInvertColors
                  />
                  <View style={s.itemText}>
                    <Text style={s.itemTitle} numberOfLines={2}>
                      {card.title}
                    </Text>
                    <Pill tone={STATUS[card.status].tone} label={t(STATUS[card.status].key)} />
                  </View>
                </Pressable>
                {reasons[card.id] ? (
                  <Text style={s.reason} testID="rejection-reason">
                    {t('t_portfolio_rejected_reason', { reason: inSentence(reasons[card.id]) })}
                  </Text>
                ) : null}
                {/* Edit / Delete as compact Ghost buttons (as the web edit actions, 3X.14c). */}
                <View style={s.actions}>
                  <UiButton
                    variant="ghost"
                    label={t('t_edit')}
                    onPress={() =>
                      router.push({
                        pathname: '/seller/portfolio/[uid]/edit',
                        params: { uid: card.uid },
                      })
                    }
                  />
                  <UiButton
                    variant="ghost"
                    label={t('t_delete')}
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
        title={t('t_delete')}
        closeLabel={t('t_ui_close')}
        testID="delete-sheet"
      >
        <Text style={s.body}>{t('t_are_u_sure_u_want_to_delete_project')}</Text>
        <View style={s.sheetButtons}>
          <SecondaryButton label={t('t_cancel')} onPress={() => setConfirm(undefined)} />
          <Button
            label={t('t_delete')}
            danger
            busy={deleting}
            onPress={() => confirm && void remove(confirm)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { gap: theme.space[3] },
  item: {
    padding: theme.space[3],
    gap: theme.space[2],
  },
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
  reason: { ...theme.text.bodySm, color: theme.colors.feedback.dangerText },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  sheetButtons: { gap: theme.space[2] },
});
