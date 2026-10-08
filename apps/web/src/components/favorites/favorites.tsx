'use client';
// Buying → Favourites `/account/favorite` (ROADMAP 4.3.12c; spec 04 AC-35, AC-36, EC-11; legacy
// `Main/Account/Favorite/FavoriteComponent.php`, `account/favorite/favorite.blade.php`): the saved gigs that are still
// listable, newest saved first, 42 per page (`listFavorites`), as a table (cards on phones): gig (thumbnail + title,
// to its page), seller, starting price and "Remove from favorite" with the legacy confirm (`deleteFavorite`). The
// legacy "date" column is not in `GigCard`; the list is in saving order.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Dialog, EmptyState, formatMoney, ResponsiveTable, Skeleton } from '@mytask/ui/web';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import '../my-gigs/my-gigs.css';

type Card = components['schemas']['GigCard'];

/** Spec 04 AC-36: 42 per page (contract `listFavorites`). */
const PAGE_SIZE = 42;

export function Favorites() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [rows, setRows] = useState<Card[]>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirm, setConfirm] = useState<Card>();
  const [removing, setRemoving] = useState(false);
  const [ok, setOk] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (after: string | null) => {
      setFailed(false);
      const res = await api
        .GET('/favorites', {
          params: { query: { limit: PAGE_SIZE, ...(after ? { cursor: after } : {}) } },
        })
        .catch(() => undefined);
      if (!res?.data) return setFailed(true);
      const page = res.data;
      setRows((current) => {
        const list = after ? (current ?? []) : [];
        const seen = new Set(list.map((r) => r.id));
        return [...list, ...(page.data as Card[]).filter((r) => !seen.has(r.id))];
      });
      setCursor(page.nextCursor);
    },
    [api],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  async function more() {
    setLoadingMore(true);
    await load(cursor);
    setLoadingMore(false);
  }

  async function remove(card: Card) {
    setRemoving(true);
    setError(undefined);
    setOk(undefined);
    const res = await api
      .DELETE('/favorites/{gigId}', { params: { path: { gigId: card.id } } })
      .catch(() => undefined);
    setRemoving(false);
    setConfirm(undefined);
    if (!res) return setError(t('t_toast_something_went_wrong'));
    // Already gone (removed in another tab, or the gig is no longer public): drop the row all the same.
    if (res.error && res.response.status !== 404) {
      return setError((res.error as ApiErrorBody).message);
    }
    setRows((list) => list?.filter((r) => r.id !== card.id));
    setOk(t('t_gig_removed_from_ur_favorite_list'));
  }

  return (
    <div className="mt-my-gigs">
      <div className="mt-my-gigs-heading">
        <h1 className="mt-my-gigs-title">{t('t_favorite_list')}</h1>
      </div>

      {ok && <Alert kind="success">{ok}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {failed ? (
        <div className="mt-dash-error">
          <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
          <button type="button" className="mt-button" onClick={() => void load(cursor)}>
            {t('t_ui_retry')}
          </button>
        </div>
      ) : !rows ? (
        <Skeleton label={t('t_ui_loading')} rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('t_no_favorites_yet')} />
      ) : (
        <div data-testid="favorites">
          <ResponsiveTable<Card>
            caption={t('t_favorite_list')}
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'gig',
                label: t('t_gig'),
                render: (r) => (
                  // The gig page is public: a full page load (ADR-019 §2).
                  <a className="mt-my-gigs-gig" href={href(locale, `/service/${r.slug}`)}>
                    {r.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element -- media CDN variant
                      <img src={r.thumbnail.thumb} alt="" />
                    ) : (
                      <span className="mt-my-gigs-noimage" aria-hidden="true" />
                    )}
                    <span lang={r.contentLocale !== locale ? r.contentLocale : undefined}>
                      {r.title}
                    </span>
                  </a>
                ),
              },
              {
                key: 'seller',
                label: t('t_seller'),
                render: (r) => (
                  <a href={href(locale, `/profile/${r.seller.username}`)}>{r.seller.username}</a>
                ),
              },
              {
                key: 'price',
                label: t('t_starting_at'),
                numeric: true,
                render: (r) => formatMoney(r.price),
              },
              {
                key: 'options',
                label: t('t_options'),
                render: (r) => (
                  <button
                    type="button"
                    className="mt-button"
                    aria-label={`${t('t_remove_from_favorite')}: ${r.title}`}
                    onClick={() => setConfirm(r)}
                  >
                    {t('t_remove_from_favorite')}
                  </button>
                ),
              },
            ]}
          />
          {cursor && (
            <div className="mt-my-gigs-more">
              <button
                type="button"
                className="mt-button"
                disabled={loadingMore}
                onClick={() => void more()}
              >
                {t('t_load_more')}
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(undefined)}
        title={t('t_remove_from_favorite')}
        description={t('t_are_u_sure_u_want_to_remove_from_favorite_list')}
        closeLabel={t('t_ui_close')}
        testId="remove-dialog"
      >
        <div className="mt-my-gigs-buttons">
          <button type="button" className="mt-button" onClick={() => setConfirm(undefined)}>
            {t('t_cancel')}
          </button>
          <button
            type="button"
            className="mt-button mt-button-danger"
            disabled={removing}
            aria-busy={removing}
            onClick={() => confirm && void remove(confirm)}
          >
            {t('t_remove')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
