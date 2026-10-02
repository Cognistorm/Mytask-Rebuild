'use client';
// Selling → Portfolio `/seller/portfolio` (spec 02 AC-27, AC-28, AC-42; legacy
// `Seller/Portfolio/PortfolioComponent.php`, `livewire/main/seller/portfolio/portfolio.blade.php`): the owner's
// works newest first with their status (Pending / Active / Rejected + reason), Edit and Delete (with a confirm),
// then the "Add a new work" tile. Reads `listPortfolioItems` with the own username (the owner also gets pending
// and rejected items); the reason of a rejected item comes from `getPortfolioItem` (cards do not carry it).
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Dialog, Pill, Skeleton } from '@mytask/ui/web';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { useDashboard } from '../dashboard/shell';
import './portfolio.css';

type Card = components['schemas']['PortfolioItemCard'];

const PAGE_SIZE = 24;

const STATUS: Record<Card['status'], { key: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { key: 't_pending', tone: 'warning' },
  active: { key: 't_active', tone: 'success' },
  rejected: { key: 't_portfolio_status_rejected', tone: 'danger' },
};

export function MyPortfolio() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { me } = useDashboard();
  const search = useSearchParams();
  const [items, setItems] = useState<Card[]>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ok, setOk] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<Card>();
  const [deleting, setDeleting] = useState(false);
  const username = me?.username;

  // Success message of the create/edit page (legacy redirect `with('success', …)`), shown once.
  useEffect(() => {
    const saved = search.get('saved');
    if (!saved) return;
    const texts = [
      t(
        saved === 'updated'
          ? 't_ur_project_updated_successfully'
          : 't_ur_project_created_successfully',
      ),
    ];
    if (search.get('pending')) texts.push(t('t_portfolio_pending_review'));
    setOk(texts);
    window.history.replaceState(null, '', window.location.pathname);
  }, [search, t]);

  const load = useCallback(
    async (after: string | null) => {
      if (!username) return;
      setFailed(false);
      const res = await api
        .GET('/portfolio-items', {
          params: { query: { username, limit: PAGE_SIZE, ...(after ? { cursor: after } : {}) } },
        })
        .catch(() => undefined);
      if (!res?.data) return setFailed(true);
      const page = res.data;
      setItems((current) => {
        const list = after ? (current ?? []) : [];
        const seen = new Set(list.map((i) => i.id));
        return [...list, ...page.data.filter((i) => !seen.has(i.id))];
      });
      setCursor(page.nextCursor);
      // AC-42: the owner sees why a work was rejected.
      for (const card of page.data.filter((i) => i.status === 'rejected')) {
        void api
          .GET('/portfolio-items/{portfolioItemId}', {
            params: { path: { portfolioItemId: card.id } },
          })
          .then((r) => {
            const reason = r.data?.rejectionReason;
            if (reason) setReasons((all) => ({ ...all, [card.id]: reason }));
          });
      }
    },
    [api, username],
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
    setDeleting(true);
    setError(undefined);
    const res = await api.DELETE('/portfolio-items/{portfolioItemId}', {
      params: { path: { portfolioItemId: card.id } },
    });
    setDeleting(false);
    setConfirm(undefined);
    if (res.error) {
      setOk([]);
      return setError((res.error as ApiErrorBody).message);
    }
    setItems((list) => list?.filter((i) => i.id !== card.id));
    setOk([t('t_project_deleted_success')]);
  }

  return (
    <div className="mt-pf">
      <div className="mt-pf-heading">
        <h1 className="mt-pf-title">{t('my_portfolio')}</h1>
        <Link
          className="mt-button mt-button-primary"
          href={href(locale, '/seller/portfolio/create')}
        >
          {t('t_add_new_work')}
        </Link>
      </div>

      {ok.length > 0 && (
        <Alert kind="success">
          {ok.map((text) => (
            <span key={text} className="mt-pf-line">
              {text}
            </span>
          ))}
        </Alert>
      )}
      {error && <Alert kind="error">{error}</Alert>}

      {failed ? (
        <div className="mt-dash-error">
          <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
          <button type="button" className="mt-button" onClick={() => void load(cursor)}>
            {t('t_ui_retry')}
          </button>
        </div>
      ) : !items ? (
        <Skeleton label={t('t_ui_loading')} rows={3} />
      ) : (
        <>
          {items.length === 0 && <p className="mt-pf-muted">{t('t_no_portfolio_yet')}</p>}
          <ul className="mt-pf-grid" data-testid="my-portfolio">
            {items.map((card) => (
              <li key={card.id} className="mt-pf-item" data-testid="my-portfolio-item">
                {/* Plain link with a new tab (legacy): the item page is in the public layout. */}
                <a
                  className="mt-pf-item-link"
                  href={href(locale, `/profile/${username}/portfolio/${card.slug}`)}
                  target="_blank"
                  rel="noopener"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- media CDN variant */}
                  <img src={card.thumbnail.medium} alt="" />
                  <span className="mt-pf-item-title">{card.title}</span>
                </a>
                <div className="mt-pf-item-foot">
                  <Pill tone={STATUS[card.status].tone} testId="status">
                    {t(STATUS[card.status].key)}
                  </Pill>
                  <div className="mt-pf-item-actions">
                    <Link
                      className="mt-button"
                      href={href(locale, `/seller/portfolio/${card.uid}/edit`)}
                      aria-label={`${t('t_edit')}: ${card.title}`}
                    >
                      {t('t_edit')}
                    </Link>
                    <button
                      type="button"
                      className="mt-button"
                      aria-label={`${t('t_delete')}: ${card.title}`}
                      onClick={() => setConfirm(card)}
                    >
                      {t('t_delete')}
                    </button>
                  </div>
                </div>
                {reasons[card.id] && (
                  <p className="mt-pf-reason" data-testid="rejection-reason">
                    {t('t_portfolio_rejected_reason', { reason: reasons[card.id] })}
                  </p>
                )}
              </li>
            ))}
            <li className="mt-pf-add">
              <Link href={href(locale, '/seller/portfolio/create')} data-testid="add-work-tile">
                <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" fill="currentColor">
                  <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z" />
                </svg>
                <span>{t('t_add_new_work')}</span>
              </Link>
            </li>
          </ul>
          {cursor && (
            <div className="mt-pf-more">
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
        </>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(undefined)}
        title={t('t_delete')}
        description={t('t_are_u_sure_u_want_to_delete_project')}
        closeLabel={t('t_ui_close')}
        testId="delete-dialog"
      >
        <div className="mt-pf-buttons">
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
