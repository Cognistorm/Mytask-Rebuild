// Selling → Gigs in the app (ROADMAP 4.3.16; spec 04 AC-18, AC-20, AC-24; url-map §5), the same data, texts and ops
// as the web `/seller/gigs` (4.3.12a, legacy `Seller/Gigs/GigsComponent.php`): the owner's non-deleted gigs, newest
// first (`listMyGigs`, 20 per page, Load more), each with its thumbnail, title, price, orders in queue and status
// (Active / Pending / "Needs changes" with the reason), and the options View (gig screen), Edit (the app's wizard),
// Analytics (the website's page until the app has its own) and Delete (confirm; 409 GIG_HAS_ORDERS_IN_QUEUE refused).
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { openGig } from '../../../components/catalog';
import { EmptyState, SecondaryButton, Skeleton } from '../../../components/dashboard';
import { Button, Notice, Screen } from '../../../components/form';
import { BottomSheet, Pill } from '../../../components/profile';
import type { ApiError } from '../../../components/reauth';
import { loadSession, mobileApi } from '../../../lib/api';
import { formatMoney } from '../../../lib/format';
import { createT } from '../../../lib/i18n';
import { gigAnalyticsUrl, openWebPage } from '../../../lib/web-pages';
import { Button as UiButton, Card } from '../../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Row = components['schemas']['GigOwnerListItem'];

/** As the web list (4.3.12a). */
const PAGE_SIZE = 20;

const STATUS: Record<string, { key: string; tone: 'success' | 'warning' | 'danger' }> = {
  active: { key: 't_active', tone: 'success' },
  pending: { key: 't_pending', tone: 'warning' },
  rejected: { key: 't_needs_changes', tone: 'danger' },
};

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'ready'; rows: Row[]; cursor: string | null };

export default function MyGigsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [ok, setOk] = useState<string>();
  const [error, setError] = useState<string>();
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [confirm, setConfirm] = useState<Row>();
  const [deleting, setDeleting] = useState(false);

  const page = useCallback(
    (cursor: string | null) =>
      api
        .GET('/gigs/mine', {
          params: { query: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) } },
        })
        .catch(() => undefined),
    [],
  );

  const load = useCallback(async () => {
    // Coming back (e.g. from the wizard) re-reads quietly; only the first load shows the skeleton.
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
    setState({ kind: 'ready', rows: res.data.data ?? [], cursor: res.data.nextCursor });
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
      rows: [...state.rows, ...(next.data.data ?? []).filter((r) => !seen.has(r.id))],
      cursor: next.data.nextCursor,
    });
  }

  async function remove(row: Row) {
    setDeleting(true);
    setError(undefined);
    setOk(undefined);
    const res = await api
      .DELETE('/gigs/{gigId}', { params: { path: { gigId: row.id } } })
      .catch(() => undefined);
    setDeleting(false);
    setConfirm(undefined);
    if (!res) return setError(t('t_toast_something_went_wrong'));
    // AC-24: paid orders not finished yet.
    if (res.response.status === 409) return setError(t('t_this_gig_has_orders_in_queue_delete'));
    if (res.error) {
      return setError((res.error as ApiError).message ?? t('t_toast_something_went_wrong'));
    }
    setState((s) =>
      s.kind === 'ready' ? { ...s, rows: s.rows.filter((r) => r.id !== row.id) } : s,
    );
    setOk(t('t_gig_deleted_successfull'));
  }

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  const create = () => router.push('/create');

  return (
    <Screen title={t('t_my_gigs')}>
      <Button label={t('t_create_a_new_gig')} onPress={create} />
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
          {state.rows.length === 0 ? <EmptyState title={t('t_no_gigs_yet')} /> : null}
          <View style={s.list} testID="my-gigs">
            {state.rows.map((row) => {
              const status = STATUS[row.status];
              const lang = row.contentLocale !== locale ? row.contentLocale : undefined;
              return (
                <Card key={row.id} style={s.item} testID="my-gigs-item">
                  <Pressable
                    style={({ pressed }) => [s.itemLink, pressed && s.pressed]}
                    onPress={() => openGig(row.slug)}
                    accessibilityRole="link"
                    accessibilityLabel={status ? `${row.title}, ${t(status.key)}` : row.title}
                    accessibilityLanguage={lang}
                  >
                    {row.thumbnail ? (
                      <Image
                        source={{ uri: row.thumbnail.medium }}
                        style={s.thumb}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <View style={s.thumb} />
                    )}
                    <View style={s.itemText}>
                      <Text style={s.itemTitle} numberOfLines={2}>
                        {row.title}
                      </Text>
                      {status ? (
                        <View testID="status">
                          <Pill tone={status.tone} label={t(status.key)} />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                  <View style={s.facts}>
                    <Text style={s.fact}>
                      {t('t_price')}: <Text style={s.factValue}>{formatMoney(row.price)}</Text>
                    </Text>
                    <Text style={s.fact}>
                      {t('t_orders_in_queue')}:{' '}
                      <Text style={s.factValue}>{row.ordersInQueueCount}</Text>
                    </Text>
                  </View>
                  {row.status === 'rejected' && row.rejectionReason ? (
                    <Text style={s.reason} testID="rejection-reason">
                      {t('t_rejection_reason')}: {row.rejectionReason}
                    </Text>
                  ) : null}
                  {/* View / Edit / Analytics / Delete as compact Ghost buttons, each named with the gig. */}
                  <View style={s.actions}>
                    <UiButton
                      variant="ghost"
                      label={t('t_view')}
                      accessibilityLabel={`${t('t_view')}: ${row.title}`}
                      onPress={() => openGig(row.slug)}
                    />
                    <UiButton
                      variant="ghost"
                      label={t('t_edit')}
                      accessibilityLabel={`${t('t_edit')}: ${row.title}`}
                      onPress={() =>
                        router.push({
                          pathname: '/seller/gigs/[uid]/edit',
                          params: { uid: row.uid },
                        })
                      }
                    />
                    <UiButton
                      variant="ghost"
                      label={t('t_analytics')}
                      accessibilityLabel={`${t('t_analytics')}: ${row.title}`}
                      onPress={() => openWebPage(gigAnalyticsUrl(row.uid))}
                    />
                    <UiButton
                      variant="ghost"
                      label={t('t_delete')}
                      accessibilityLabel={`${t('t_delete')}: ${row.title}`}
                      onPress={() => setConfirm(row)}
                    />
                  </View>
                </Card>
              );
            })}
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
        title={t('t_delete_gig')}
        closeLabel={t('t_ui_close')}
        testID="delete-sheet"
      >
        <Text style={s.body}>{t('t_are_u_sure_u_want_to_delete_gig')}</Text>
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
  item: { padding: theme.space[3], gap: theme.space[2] },
  itemLink: { flexDirection: 'row', gap: theme.space[3], borderRadius: theme.radius.md },
  pressed: { backgroundColor: theme.colors.action.ghostPressed },
  thumb: {
    width: theme.size.avatar.xl,
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  itemText: { flex: 1, gap: theme.space[1], alignItems: 'flex-start' },
  itemTitle: { ...theme.text.label, color: theme.colors.text.primary },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.space[4],
    rowGap: theme.space[1],
  },
  fact: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  factValue: { ...theme.text.label, color: theme.colors.text.primary },
  reason: { ...theme.text.bodySm, color: theme.colors.feedback.dangerText },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  sheetButtons: { gap: theme.space[2] },
});
