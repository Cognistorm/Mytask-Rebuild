'use client';
// Shared pieces of the moderation queues (spec 16 AC-19): owner summary, status tabs, the date/owner filter
// and the cursor list loader. Used by the portfolio and KYC queues (task 4.1.21); later queues reuse them.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Avatar, Field, Pill } from '@mytask/ui/web';
import { t, type ApiErrorBody } from '../lib/client';

type S = components['schemas'];

export const adminDate = (iso: string) =>
  new Date(iso).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' });

const USER_STATUS: Record<S['UserStatus'], string> = {
  pending: 't_pending',
  active: 't_active',
  verified: 't_active',
  banned: 't_banned',
};
const KYC_STATE: Record<S['KycState'], string> = {
  none: 't_kyc_state_none',
  pending: 't_pending',
  verified: 't_verified',
  declined: 't_declined',
};

/** Owner summary next to every queue item: status, restriction, plan, KYC, open reports, earlier rejections. */
export function OwnerSummary({ owner }: { owner: S['ModerationOwnerSummary'] }) {
  const u = owner.user;
  return (
    <div className="admin-owner" data-testid="owner-summary">
      <Avatar image={u.avatar} name={u.username} size="md" />
      <strong>{u.username}</strong>
      {owner.isDeleted ? (
        <Pill tone="neutral">{t('t_deleted')}</Pill>
      ) : (
        <Pill tone={owner.status === 'banned' ? 'danger' : 'neutral'}>
          {t(USER_STATUS[owner.status])}
        </Pill>
      )}
      {owner.isRestricted && <Pill tone="warning">{t('t_restricted')}</Pill>}
      {owner.plan === 'premium' && <Pill tone="brand">{t('t_premium')}</Pill>}
      <span className="auth-muted">
        {t('t_verification_center')}: {t(KYC_STATE[owner.kycStatus])}
      </span>
      <span className="auth-muted">
        {t('t_reports')}: {owner.reportCount}
      </span>
      <span className="auth-muted">
        {t('t_admin_earlier_rejections')}: {owner.earlierRejectionCount}
      </span>
    </div>
  );
}

/** Status tabs above a queue (pending first). */
export function StatusTabs<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="admin-tabs" role="group" aria-label={t('t_status')}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="auth-link-button"
          aria-pressed={props.value === o.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface QueueFilter {
  userId: string;
  from: string;
  to: string;
}

/** The AC-19 filters shared by the queues: owner (user id) and the created-date range (Tbilisi days). */
export function QueueFilterForm(props: {
  value: QueueFilter;
  onApply: (f: QueueFilter) => void;
  children?: React.ReactNode;
}) {
  const [f, setF] = useState(props.value);
  return (
    <form
      className="admin-inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        props.onApply(f);
      }}
    >
      <Field
        label={t('t_admin_user_id')}
        name="userId"
        value={f.userId}
        onChange={(userId) => setF({ ...f, userId })}
      />
      <Field
        label={t('t_admin_date_from')}
        name="from"
        type="date"
        value={f.from}
        onChange={(from) => setF({ ...f, from })}
      />
      <Field
        label={t('t_admin_date_to')}
        name="to"
        type="date"
        value={f.to}
        onChange={(to) => setF({ ...f, to })}
      />
      {props.children}
      <button type="submit" className="auth-button">
        {t('t_filter')}
      </button>
      <button
        type="button"
        className="auth-link-button"
        onClick={() => {
          const empty = { userId: '', from: '', to: '' };
          setF(empty);
          props.onApply(empty);
        }}
      >
        {t('t_reset_filter')}
      </button>
    </form>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A `date` input day → the start of that day in Asia/Tbilisi (UTC+4, no DST) as a UTC timestamp.
const tbilisiDayStart = (day: string, plusDays = 0) =>
  new Date(Date.parse(`${day}T00:00:00+04:00`) + plusDays * 86_400_000).toISOString();

/** Filter → API query (`createdTo` is exclusive, so the "to" day is included). Bad user ids are dropped. */
export function filterQuery(f: QueueFilter) {
  const id = f.userId.trim();
  return {
    ...(UUID.test(id) ? { userId: id } : {}),
    ...(f.from ? { createdFrom: tbilisiDayStart(f.from) } : {}),
    ...(f.to ? { createdTo: tbilisiDayStart(f.to, 1) } : {}),
  };
}

interface Page<T> {
  data?: T[];
  nextCursor: string | null;
  totalCount?: number | null;
}

/** Loads a cursor list (first page on `reloadKey` change, "Load more" appends the next page). */
export function useCursorList<T>(
  fetchPage: (cursor?: string) => Promise<{ data?: Page<T>; error?: unknown }>,
  enabled: boolean,
) {
  const [items, setItems] = useState<T[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();

  const reload = useCallback(async () => {
    const res = await fetchPage();
    if (res.error || !res.data) return setErr(res.error as ApiErrorBody);
    setErr(undefined);
    setItems(res.data.data ?? []);
    setNext(res.data.nextCursor);
    setTotal(res.data.totalCount ?? null);
    setLoaded(true);
  }, [fetchPage]);

  const more = useCallback(async () => {
    if (!next) return;
    const res = await fetchPage(next);
    if (res.error || !res.data) return setErr(res.error as ApiErrorBody);
    setItems((old) => [...old, ...(res.data?.data ?? [])]);
    setNext(res.data.nextCursor);
  }, [fetchPage, next]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { items, next, total, loaded, err, reload, more };
}

/** A staff decision failed: 409 = another staff member decided first (AC-19), else the API message. */
export function decisionError(err: ApiErrorBody, status: number): ApiErrorBody {
  return status === 409 ? { ...err, message: t('t_item_already_decided') } : err;
}
