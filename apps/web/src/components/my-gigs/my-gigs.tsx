'use client';
// Selling → Gigs `/seller/gigs` (ROADMAP 4.3.12a; spec 04 AC-20, AC-24; url-map §5; legacy
// `Seller/Gigs/GigsComponent.php`, `livewire/main/seller/gigs/gigs.blade.php`): the owner's non-deleted gigs, newest
// first (`listMyGigs`), as a table (cards on phones): gig (thumbnail + title), price, orders in queue, status
// (Active / Pending / "Needs changes" with the reason) and the options View, Edit, Analytics, Delete (with the
// confirm; 409 GIG_HAS_ORDERS_IN_QUEUE refused). The legacy rating, sales, clicks and impressions columns live on
// the gig's Analytics page in the new contract (`GigOwnerListItem` does not carry them).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  Dialog,
  EmptyState,
  formatMoney,
  Pill,
  ResponsiveTable,
  Skeleton,
} from '@mytask/ui/web';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import './my-gigs.css';

type Row = components['schemas']['GigOwnerListItem'];

const PAGE_SIZE = 20;

const STATUS: Record<
  'active' | 'pending' | 'rejected',
  { key: string; tone: 'success' | 'warning' | 'danger' }
> = {
  active: { key: 't_active', tone: 'success' },
  pending: { key: 't_pending', tone: 'warning' },
  rejected: { key: 't_needs_changes', tone: 'danger' },
};

export function MyGigs() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [rows, setRows] = useState<Row[]>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirm, setConfirm] = useState<Row>();
  const [deleting, setDeleting] = useState(false);
  const [ok, setOk] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (after: string | null) => {
      setFailed(false);
      const res = await api
        .GET('/gigs/mine', {
          params: { query: { limit: PAGE_SIZE, ...(after ? { cursor: after } : {}) } },
        })
        .catch(() => undefined);
      if (!res?.data) return setFailed(true);
      const page = res.data;
      setRows((current) => {
        const list = after ? (current ?? []) : [];
        const seen = new Set(list.map((r) => r.id));
        return [...list, ...page.data.filter((r) => !seen.has(r.id))];
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
    if (res.error) return setError((res.error as ApiErrorBody).message);
    setRows((list) => list?.filter((r) => r.id !== row.id));
    setOk(t('t_gig_deleted_successfull'));
  }

  const create = (
    <Link className="mt-button mt-button-primary" href={href(locale, '/create')}>
      {t('t_create_a_new_gig')}
    </Link>
  );

  return (
    <div className="mt-my-gigs">
      <div className="mt-my-gigs-heading">
        <h1 className="mt-my-gigs-title">{t('t_my_gigs')}</h1>
        {create}
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
        <EmptyState title={t('t_no_gigs_yet')} action={create} />
      ) : (
        <div data-testid="my-gigs">
          <ResponsiveTable<Row>
            caption={t('t_my_gigs')}
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'gig',
                label: t('t_gig'),
                render: (r) => (
                  <span className="mt-my-gigs-gig">
                    {r.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element -- media CDN variant
                      <img src={r.thumbnail.thumb} alt="" />
                    ) : (
                      <span className="mt-my-gigs-noimage" aria-hidden="true" />
                    )}
                    <span lang={r.contentLocale !== locale ? r.contentLocale : undefined}>
                      {r.title}
                    </span>
                  </span>
                ),
              },
              {
                key: 'price',
                label: t('t_price'),
                numeric: true,
                render: (r) => formatMoney(r.price),
              },
              {
                key: 'queue',
                label: t('t_orders_in_queue'),
                numeric: true,
                render: (r) => r.ordersInQueueCount,
              },
              {
                key: 'status',
                label: t('t_status'),
                render: (r) => {
                  const s = STATUS[r.status as keyof typeof STATUS];
                  return (
                    <span className="mt-my-gigs-status">
                      {s && (
                        <Pill tone={s.tone} testId="status">
                          {t(s.key)}
                        </Pill>
                      )}
                      {r.status === 'rejected' && r.rejectionReason && (
                        <span className="mt-my-gigs-reason" data-testid="rejection-reason">
                          {t('t_rejection_reason')}: {r.rejectionReason}
                        </span>
                      )}
                    </span>
                  );
                },
              },
              {
                key: 'options',
                label: t('t_options'),
                render: (r) => (
                  <span className="mt-my-gigs-options">
                    {/* The gig page is public (full page load, ADR-019 §2); only active gigs are public, the owner
                        also sees the pending and rejected ones there. */}
                    <a
                      className="mt-button"
                      href={href(locale, `/service/${r.slug}`)}
                      aria-label={`${t('t_view')}: ${r.title}`}
                    >
                      {t('t_view')}
                    </a>
                    <a
                      className="mt-button"
                      href={href(locale, `/seller/gigs/${r.uid}/edit`)}
                      aria-label={`${t('t_edit')}: ${r.title}`}
                    >
                      {t('t_edit')}
                    </a>
                    <Link
                      className="mt-button"
                      href={href(locale, `/seller/gigs/${r.uid}/analytics`)}
                      aria-label={`${t('t_analytics')}: ${r.title}`}
                    >
                      {t('t_analytics')}
                    </Link>
                    <button
                      type="button"
                      className="mt-button"
                      aria-label={`${t('t_delete')}: ${r.title}`}
                      onClick={() => setConfirm(r)}
                    >
                      {t('t_delete')}
                    </button>
                  </span>
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
        title={t('t_delete_gig')}
        description={t('t_are_u_sure_u_want_to_delete_gig')}
        closeLabel={t('t_ui_close')}
        testId="delete-dialog"
      >
        <div className="mt-my-gigs-buttons">
          <button type="button" className="mt-button" onClick={() => setConfirm(undefined)}>
            {t('t_cancel')}
          </button>
          <button
            type="button"
            className="mt-button mt-button-danger"
            disabled={deleting}
            aria-busy={deleting}
            onClick={() => confirm && void remove(confirm)}
          >
            {t('t_delete')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
