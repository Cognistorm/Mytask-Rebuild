'use client';
// Gig moderation queue and gig list (spec 16 AC-19, AC-20; spec 04 AC-17, AC-18; legacy
// resources/views/livewire/admin/gigs/gigs.blade.php, Admin/Gigs/GigsComponent.php:158-324, Trash/TrashComponent.php:113).
// Pending gigs oldest submission first, 50 per page, with filters (owner, dates, category, title or uid). "Details"
// loads the gig as the public would see it (both languages) plus the owner summary. Pending: Approve → active +
// EV-20; Reject (reason shown to the owner) → rejected + EV-21. Active: "Delete gig" (internal reason; refused
// while orders are in queue). Removed by staff: Restore within 30 days (plan limit checked, EV-130). Staff never
// edit the gig's content (P-117). First decision wins (409 STATE_CONFLICT → `t_item_already_decided`).
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  Avatar,
  EmptyState,
  Field,
  Pill,
  Select,
  TextArea,
  formatMoney,
} from '@mytask/ui/web';
import { AdminShell } from '../../components/shell';
import {
  adminDate,
  filterQuery,
  ItemCard,
  OwnerSummary,
  QueueFilterForm,
  StatusTabs,
  useCursorList,
  type QueueFilter,
} from '../../components/moderation';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type S = components['schemas'];
type Me = S['AdminMe'];
type Status = S['GigStatus'];
type Decision = 'publish' | 'reject' | 'remove' | 'restore';

const STATUS_KEY: Record<Status, string> = {
  pending: 't_pending',
  active: 't_active',
  rejected: 't_rejected',
  deleted: 't_deleted',
};

// The wizard's delivery list (spec 04 AC-8; legacy labels).
const DELIVERY: Record<number, string> = {
  0: 't_none',
  1: 't_1_day',
  2: 't_2_days',
  3: 't_3_days',
  4: 't_4_days',
  5: 't_5_days',
  6: 't_6_days',
  7: 't_1_week',
  14: 't_2_weeks',
  21: 't_3_weeks',
  30: 't_1_month',
};
const delivery = (days: number) => (DELIVERY[days] ? t(DELIVERY[days]) : String(days));

const revisions = (n: number | null) =>
  n === null
    ? t('t_revisions_not_specified')
    : n === 0
      ? t('t_no_revisions')
      : t('t_revisions_included', { count: n });

/** A decision failed: 409 STATE_CONFLICT = another staff member decided first (AC-19), else the API message. */
function decisionError(err: ApiErrorBody, status: number): ApiErrorBody {
  return status === 409 && err.code === 'STATE_CONFLICT'
    ? { ...err, message: t('t_item_already_decided') }
    : err;
}

/** Both languages of one text, Georgian first; a missing English text is left out. */
function LangTexts(props: { label: string; value: S['LocalizedString']; html?: boolean }) {
  return (
    <>
      {(['ka', 'en'] as const).map((lang) => {
        const text = props.value[lang];
        if (!text) return null;
        return (
          <div key={lang} className="admin-gig-text">
            <span className="auth-muted">
              {props.label} · {lang}
            </span>
            {props.html ? (
              <div
                className="admin-gig-html"
                lang={lang}
                // Sanitised `user_text` HTML from the API (CONVENTIONS §19), as the gig page shows it.
                dangerouslySetInnerHTML={{ __html: text }}
              />
            ) : (
              <p className="admin-message" lang={lang}>
                {text}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

/** The gig as the public would see it, plus the moderation and removal history (AC-19, AC-20). */
function GigDetail({ gig }: { gig: S['AdminGig'] }) {
  const images = gig.images.length > 0 ? gig.images : [gig.thumbnail];
  return (
    <div className="admin-gig-detail" data-testid="gig-detail">
      <OwnerSummary owner={gig.ownerSummary} />
      {gig.rejectionReason && (
        <p className="admin-message">
          {t('t_rejection_reason')}: {gig.rejectionReason}
        </p>
      )}
      {gig.status === 'deleted' &&
        (gig.deletedBy === 'staff' && gig.removedAt && gig.restoreDeadlineAt ? (
          <>
            <p className="admin-message">
              {t('t_admin_gig_removed_by_staff', {
                date: adminDate(gig.removedAt),
                until: adminDate(gig.restoreDeadlineAt),
              })}
            </p>
            {gig.removalReason && (
              <p className="admin-message">
                {t('t_admin_internal_reason')}: {gig.removalReason}
              </p>
            )}
          </>
        ) : (
          <p className="admin-message">{t('t_admin_gig_deleted_by_owner')}</p>
        ))}
      <LangTexts label={t('t_title')} value={gig.title} />
      <p className="admin-item-meta">
        {[gig.category, gig.subcategory, gig.childCategory].map((c) => c.name).join(' › ')}
      </p>
      <div className="admin-gallery">
        {images.map((img, i) => (
          <a key={img.fileId} href={img.large} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- public CDN variants */}
            <img
              src={img.thumb}
              alt={`${gig.title.ka} · ${t('t_ui_image_of', { n: i + 1, total: images.length })}`}
            />
          </a>
        ))}
      </div>
      <dl className="admin-gig-facts">
        <dt>{t('t_starting_at')}</dt>
        <dd>{formatMoney(gig.price)}</dd>
        <dt>{t('t_delivery_time')}</dt>
        <dd>{delivery(gig.deliveryDays)}</dd>
        <dt>{t('t_orders_in_queue')}</dt>
        <dd>{gig.ordersInQueueCount}</dd>
        <dt>{t('t_rating')}</dt>
        <dd>
          {gig.rating.averageTenths === null ? 'N/A' : (gig.rating.averageTenths / 10).toFixed(1)} ·{' '}
          {t('t_number_reviews', { number: gig.rating.count })}
        </dd>
      </dl>
      <p className="admin-message">{revisions(gig.revisionsAllowed)}</p>
      <LangTexts label={t('t_description')} value={gig.description} html />
      {gig.upgrades.length > 0 && (
        <>
          <h3 className="mt-text-h3">{t('t_upgrades')}</h3>
          <ul className="admin-files">
            {gig.upgrades.map((u) => (
              <li key={u.id}>
                {u.title} · +{formatMoney(u.price)} ·{' '}
                {u.extraDays === 0
                  ? t('t_no_changes_delivery_time')
                  : t('t_delivery_time_will_be_increased_by_extra', {
                      time: delivery(u.extraDays),
                    })}
              </li>
            ))}
          </ul>
        </>
      )}
      {gig.faqs.length > 0 && (
        <>
          <h3 className="mt-text-h3">{t('t_faq')}</h3>
          {gig.faqs.map((f) => (
            <div key={f.id} className="admin-gig-text">
              <strong>{f.question}</strong>
              <p className="admin-message">{f.answer}</p>
            </div>
          ))}
        </>
      )}
      {gig.documents.length > 0 && (
        <>
          <h3 className="mt-text-h3">{t('t_documents')}</h3>
          <ul className="admin-files">
            {gig.documents.map((d) => (
              <li key={d.fileId}>
                <a className="admin-file-name" href={d.url} target="_blank" rel="noreferrer">
                  {d.fileName}
                </a>{' '}
                <span className="auth-muted">({Math.ceil(d.sizeBytes / 1024)} KB)</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {gig.seo && (
        <>
          <h3 className="mt-text-h3">{t('t_seo_meta_tags')}</h3>
          <p className="admin-message">
            {t('t_seo_title')}: {gig.seo.title}
          </p>
          <p className="admin-message">
            {t('t_seo_description')}: {gig.seo.description}
          </p>
        </>
      )}
    </div>
  );
}

function GigItem({ item, onDone }: { item: S['AdminGigListItem']; onDone: () => void }) {
  const api = useAdminApi();
  const [detail, setDetail] = useState<S['AdminGig']>();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);
  const path = { params: { path: { gigId: item.id } } };

  async function toggle() {
    setOpen(!open);
    if (open || detail) return;
    const res = await api.GET('/admin/gigs/{gigId}', path);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setDetail(res.data);
  }

  async function decide(kind: Decision) {
    setErr(undefined);
    if ((kind === 'reject' || kind === 'remove') && !reason.trim()) {
      return setErr({
        code: 'VALIDATION',
        message: '',
        details: { fields: [{ field: 'reason', message: t('t_required') }] },
      });
    }
    if (kind === 'remove' && !window.confirm(t('t_are_u_sure_u_want_to_delete_gig'))) return;
    const body = { reason: reason.trim() };
    const res =
      kind === 'publish'
        ? await api.POST('/admin/gigs/{gigId}/publish', { ...path, body: {} })
        : kind === 'reject'
          ? await api.POST('/admin/gigs/{gigId}/reject', { ...path, body })
          : kind === 'remove'
            ? await api.POST('/admin/gigs/{gigId}/remove', { ...path, body })
            : await api.POST('/admin/gigs/{gigId}/restore', { ...path, body: {} });
    if (res.error) {
      const e = res.error as ApiErrorBody;
      setErr(decisionError(e, res.response.status));
      if (res.response.status === 409 && e.code === 'STATE_CONFLICT') onDone();
      return;
    }
    onDone();
  }

  const reasonLabel =
    item.status === 'pending'
      ? t('t_admin_reject_reason')
      : item.status === 'active'
        ? t('t_admin_internal_reason')
        : null;
  const canRestore = item.status === 'deleted' && item.deletedBy === 'staff';
  return (
    <ItemCard
      testId="gig-item"
      head={
        <div className="admin-owner">
          <Avatar image={item.owner.avatar} name={item.owner.username} size="md" />
          <strong>{item.owner.username}</strong>
          {item.status === 'deleted' && item.deletedBy && (
            <Pill tone="neutral">
              {t(
                item.deletedBy === 'staff' ? 't_admin_gig_removed' : 't_admin_gig_deleted_by_owner',
              )}
            </Pill>
          )}
        </div>
      }
      meta={
        <>
          <strong lang={item.contentLocale}>{item.title}</strong> · {item.category.name} ·{' '}
          {formatMoney(item.price)} · {t(STATUS_KEY[item.status])} · #{item.uid} ·{' '}
          {adminDate(item.status === 'pending' ? item.submittedAt : item.createdAt)}
        </>
      }
      decision={
        <>
          {general && <Alert kind="error">{general}</Alert>}
          {reasonLabel && (
            <TextArea
              label={reasonLabel}
              name="reason"
              rows={2}
              maxLength={1000}
              value={reason}
              onChange={setReason}
              error={fields.reason}
            />
          )}
        </>
      }
      actions={
        <>
          <button type="button" className="auth-link-button" aria-expanded={open} onClick={toggle}>
            {t('t_details')}
          </button>
          {item.status === 'pending' && (
            <>
              <button
                type="button"
                className="mt-button mt-button-primary"
                onClick={() => decide('publish')}
              >
                {t('t_approve')}
              </button>
              <button
                type="button"
                className="mt-button mt-button-danger"
                onClick={() => decide('reject')}
              >
                {t('t_reject')}
              </button>
            </>
          )}
          {item.status === 'active' && (
            <button type="button" className="mt-button" onClick={() => decide('remove')}>
              {t('t_delete_gig')}
            </button>
          )}
          {canRestore && (
            <button type="button" className="mt-button" onClick={() => decide('restore')}>
              {t('t_restore')}
            </button>
          )}
        </>
      }
    >
      {/* No body band while there is nothing to show in it. */}
      {(item.thumbnail || (open && detail)) && (
        <>
          {item.thumbnail && (
            <div className="admin-gallery">
              {/* eslint-disable-next-line @next/next/no-img-element -- public CDN variants */}
              <img src={item.thumbnail.thumb} alt="" />
            </div>
          )}
          {open && detail && <GigDetail gig={detail} />}
        </>
      )}
    </ItemCard>
  );
}

interface Extra {
  q: string;
  categoryId: string;
}
const NO_EXTRA: Extra = { q: '', categoryId: '' };

/** The public category tree as one indented list (any level filters, AC-19). */
function useCategoryOptions() {
  const api = useAdminApi();
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let live = true;
    void api.GET('/categories').then((res) => {
      if (!live || !res.data) return;
      const out: { value: string; label: string }[] = [];
      const walk = (nodes: S['CategoryNode'][]) => {
        for (const n of nodes) {
          out.push({ value: n.id, label: `${'— '.repeat(n.depth - 1)}${n.name}` });
          walk(n.children);
        }
      };
      walk(res.data.categories);
      setOptions(out);
    });
    return () => {
      live = false;
    };
  }, [api]);
  return options;
}

export default function GigQueuePage() {
  const api = useAdminApi();
  const [me, setMe] = useState<Me>();
  const [status, setStatus] = useState<Status>('pending');
  const [filter, setFilter] = useState<QueueFilter & Extra>({
    userId: '',
    from: '',
    to: '',
    ...NO_EXTRA,
  });
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const can = !!me && (me.isSuperAdmin || me.permissions.includes('gigs.moderate'));
  const categories = useCategoryOptions();

  const fetchPage = useCallback(
    (cursor?: string) =>
      api.GET('/admin/gigs', {
        params: {
          query: {
            status: [status],
            ...filterQuery(filter),
            ...(filter.q.trim() ? { q: filter.q.trim() } : {}),
            ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
            limit: 50,
            ...(cursor ? { cursor } : {}),
          },
        },
      }),
    [api, status, filter],
  );
  const list = useCursorList(fetchPage, can);
  const { general } = splitErrors(list.err);

  return (
    <AdminShell onMe={setMe}>
      <h1 className="mt-text-h2">
        {t('t_gigs')}
        {list.total !== null && ` (${list.total})`}
      </h1>
      {me && !can && <Alert kind="error">{t('t_u_dont_have_permissions_to_access_page')}</Alert>}
      {can && (
        <section className="admin-section admin-queue" aria-label={t('t_gigs')}>
          <StatusTabs
            value={status}
            onChange={setStatus}
            options={(['pending', 'active', 'rejected', 'deleted'] as const).map((s) => ({
              value: s,
              label: t(STATUS_KEY[s]),
            }))}
          />
          <QueueFilterForm
            value={filter}
            onApply={(f) => setFilter({ ...f, ...extra })}
            onReset={(empty) => {
              setExtra(NO_EXTRA);
              setFilter({ ...empty, ...NO_EXTRA });
            }}
          >
            <Field
              label={t('t_admin_gig_search')}
              name="q"
              value={extra.q}
              maxLength={200}
              onChange={(q) => setExtra({ ...extra, q })}
            />
            <Select
              label={t('t_category')}
              name="categoryId"
              placeholder={t('t_all_categories')}
              options={categories}
              value={extra.categoryId}
              onChange={(categoryId) => setExtra({ ...extra, categoryId })}
            />
          </QueueFilterForm>
          {general && <Alert kind="error">{general}</Alert>}
          {list.loaded && list.items.length === 0 ? (
            <EmptyState
              title={t(status === 'pending' ? 't_admin_queue_empty' : 't_no_data_to_show_now')}
            />
          ) : (
            <ul className="admin-items">
              {list.items.map((g) => (
                <GigItem key={g.id} item={g} onDone={list.reload} />
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
    </AdminShell>
  );
}
