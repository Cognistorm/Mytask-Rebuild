'use client';
// Portfolio queue (spec 16 AC-19, AC-21; spec 02 AC-25, AC-26, AC-42; legacy
// resources/views/livewire/admin/portfolios/portfolios.blade.php, Admin/Portfolios/PortfoliosComponent.php:65-135).
// Pending items oldest first, 50 per page, with the owner summary and the item as the public would see it.
// Approve → public + EV-15; Reject (reason shown to the owner) → `rejected` + EV-126; Remove (pending or
// published, reason kept in the audit log) deletes the item — legacy "Delete portfolio". First decision wins (409).
import { useCallback, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, TextArea } from '@mytask/ui/web';
import { AdminNav } from '../../components/nav';
import {
  adminDate,
  decisionError,
  filterQuery,
  OwnerSummary,
  QueueFilterForm,
  StatusTabs,
  useCursorList,
  type QueueFilter,
} from '../../components/moderation';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type S = components['schemas'];
type Me = S['AdminMe'];
type Status = S['PortfolioStatus'];

const STATUS_KEY: Record<Status, string> = {
  pending: 't_pending',
  active: 't_active',
  rejected: 't_rejected',
};

function PortfolioCard({ entry, onDone }: { entry: S['AdminPortfolioItem']; onDone: () => void }) {
  const api = useAdminApi();
  const item = entry.item;
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  async function decide(kind: 'approve' | 'reject' | 'remove') {
    setErr(undefined);
    if (kind !== 'approve' && !reason.trim()) {
      return setErr({
        code: 'VALIDATION',
        message: '',
        details: { fields: [{ field: 'reason', message: t('t_required') }] },
      });
    }
    if (kind === 'remove' && !window.confirm(t('t_are_u_sure_u_want_to_delete_this'))) return;
    const path = { params: { path: { portfolioItemId: item.id } } };
    const body = { reason: reason.trim() };
    const res =
      kind === 'approve'
        ? await api.POST('/admin/portfolio-items/{portfolioItemId}/approve', { ...path, body: {} })
        : kind === 'reject'
          ? await api.POST('/admin/portfolio-items/{portfolioItemId}/reject', { ...path, body })
          : await api.POST('/admin/portfolio-items/{portfolioItemId}/remove', { ...path, body });
    if (res.error) {
      setErr(decisionError(res.error as ApiErrorBody, res.response.status));
      if (res.response.status === 409) onDone();
      return;
    }
    onDone();
  }

  return (
    <li className="admin-card" data-testid="portfolio-item">
      <OwnerSummary owner={entry.owner} />
      <strong>
        {item.title} · {t(STATUS_KEY[item.status])} · {adminDate(item.createdAt)}
      </strong>
      <div className="admin-gallery">
        {[item.thumbnail, ...item.images].map((img) => (
          <a key={img.fileId} href={img.large} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- public CDN variants */}
            <img src={img.thumb} alt="" />
          </a>
        ))}
      </div>
      <span className="auth-muted">{t('t_description')}</span>
      <p className="admin-message">{item.description}</p>
      {item.projectUrl && (
        <a href={item.projectUrl} target="_blank" rel="noreferrer nofollow">
          {t('t_live_preview')}
        </a>
      )}
      {item.videoUrl && (
        <a href={item.videoUrl} target="_blank" rel="noreferrer nofollow">
          {t('t_watch_video')}
        </a>
      )}
      {item.rejectionReason && (
        <p className="admin-message">
          {t('t_reason')}: {item.rejectionReason}
        </p>
      )}
      {entry.decidedBy && entry.decidedAt && (
        <span className="auth-muted">
          {entry.decidedBy.fullName} · {adminDate(entry.decidedAt)}
        </span>
      )}
      {general && <Alert kind="error">{general}</Alert>}
      {item.status !== 'rejected' && (
        <>
          <TextArea
            label={t('t_admin_reject_reason')}
            name="reason"
            rows={2}
            maxLength={1000}
            value={reason}
            onChange={setReason}
            error={fields.reason}
          />
          <div className="admin-inline-form">
            {item.status === 'pending' && (
              <>
                <button type="button" className="auth-button" onClick={() => decide('approve')}>
                  {t('t_approve')}
                </button>
                <button type="button" className="auth-link-button" onClick={() => decide('reject')}>
                  {t('t_reject')}
                </button>
              </>
            )}
            <button type="button" className="auth-link-button" onClick={() => decide('remove')}>
              {t('t_delete_portfolio')}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default function PortfolioQueuePage() {
  const api = useAdminApi();
  const [me, setMe] = useState<Me>();
  const [status, setStatus] = useState<Status>('pending');
  const [filter, setFilter] = useState<QueueFilter>({ userId: '', from: '', to: '' });
  const can = !!me && (me.isSuperAdmin || me.permissions.includes('portfolio.moderate'));

  const fetchPage = useCallback(
    (cursor?: string) =>
      api.GET('/admin/portfolio-items', {
        params: { query: { status, ...filterQuery(filter), ...(cursor ? { cursor } : {}) } },
      }),
    [api, status, filter],
  );
  const list = useCursorList(fetchPage, can);
  const { general } = splitErrors(list.err);

  return (
    <main className="admin-page">
      <AdminNav onMe={setMe} />
      <h1 className="mt-text-h2">
        {t('t_portfolios')}
        {list.total !== null && ` (${list.total})`}
      </h1>
      {me && !can && <Alert kind="error">{t('t_u_dont_have_permissions_to_access_page')}</Alert>}
      {can && (
        <section className="admin-section admin-queue" aria-label={t('t_portfolios')}>
          <StatusTabs
            value={status}
            onChange={setStatus}
            options={(['pending', 'active', 'rejected'] as const).map((s) => ({
              value: s,
              label: t(STATUS_KEY[s]),
            }))}
          />
          <QueueFilterForm value={filter} onApply={setFilter} />
          {general && <Alert kind="error">{general}</Alert>}
          {list.loaded && list.items.length === 0 ? (
            <p className="auth-muted">
              {t(status === 'pending' ? 't_admin_queue_empty' : 't_no_data_to_show_now')}
            </p>
          ) : (
            <ul className="admin-rows">
              {list.items.map((e) => (
                <PortfolioCard key={e.item.id} entry={e} onDone={list.reload} />
              ))}
            </ul>
          )}
          {list.next && (
            <button type="button" className="auth-link-button" onClick={list.more}>
              {t('t_load_more')}
            </button>
          )}
        </section>
      )}
    </main>
  );
}
