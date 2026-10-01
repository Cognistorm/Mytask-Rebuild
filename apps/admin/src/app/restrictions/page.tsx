'use client';
// User restrictions (spec 01 AC-46…AC-50; spec 16 AC-19, AC-29, AC-32; legacy
// resources/views/livewire/admin/users/options/restrict.blade.php): the appeals queue with approve/reject,
// adding a restriction, and the restrictions history of one user (`?userId=`, the EV-08 email link).
// The user list/detail pages (slice 16) will link here; appeal files arrive with F0 and Q-154.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { AdminNav } from '../../components/nav';
import { Alert, Field, TextArea } from '../../components/ui';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type S = components['schemas'];
type Me = S['AdminMe'];

const STATUS_KEY: Record<S['RestrictionStatus'], string> = {
  pending: 't_pending',
  submitted: 't_new_appeal',
  approved: 't_restriction_resolved',
  rejected: 't_rejected',
};
const date = (iso: string) => new Date(iso).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' });

function AppealCard({
  appeal,
  onDone,
}: {
  appeal: S['AdminRestrictionAppeal'];
  onDone: () => void;
}) {
  const api = useAdminApi();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  async function decide(kind: 'approve' | 'reject') {
    setErr(undefined);
    const path = { params: { path: { appealId: appeal.id } } };
    const res =
      kind === 'approve'
        ? await api.POST('/admin/restriction-appeals/{appealId}/approve', { ...path, body: {} })
        : await api.POST('/admin/restriction-appeals/{appealId}/reject', {
            ...path,
            body: { reason },
          });
    if (res.error) return setErr(res.error as ApiErrorBody);
    onDone();
  }

  return (
    <li className="admin-card" data-testid="appeal">
      <strong>
        {appeal.owner.user.username} · {date(appeal.createdAt)}
      </strong>
      <span className="auth-muted">{t('t_restriction_details')}</span>
      <p className="admin-message">{appeal.restriction.message}</p>
      <span className="auth-muted">{t('t_restriction_response')}</span>
      <p className="admin-message">{appeal.message}</p>
      {general && <Alert kind="error">{general}</Alert>}
      <TextArea
        label={t('t_reason')}
        name="reason"
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={setReason}
        error={fields.reason}
      />
      <div className="admin-inline-form">
        <button type="button" className="auth-button" onClick={() => decide('approve')}>
          {t('t_approve')}
        </button>
        <button type="button" className="auth-link-button" onClick={() => decide('reject')}>
          {t('t_reject')}
        </button>
      </div>
    </li>
  );
}

export default function RestrictionsPage() {
  const api = useAdminApi();
  const [me, setMe] = useState<Me>();
  const [userId, setUserId] = useState('');
  const [appeals, setAppeals] = useState<S['AdminRestrictionAppeal'][]>([]);
  const [history, setHistory] = useState<S['AdminRestriction'][]>([]);
  const [message, setMessage] = useState('');
  const [filesRequired, setFilesRequired] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [saved, setSaved] = useState(false);
  const { fields, general } = splitErrors(err);
  const can = (p: Me['permissions'][number]) =>
    !!me && (me.isSuperAdmin || me.permissions.includes(p));

  // The EV-08 email links here with ?userId=… (read once; no Suspense boundary needed).
  useEffect(() => {
    setUserId(new URLSearchParams(window.location.search).get('userId') ?? '');
  }, []);

  const load = useCallback(async () => {
    const queue = await api.GET('/admin/restriction-appeals', { params: { query: {} } });
    if (queue.data) setAppeals(queue.data.data);
    const id = userId.trim();
    const list = await api.GET('/admin/restrictions', {
      params: { query: /^[0-9a-f-]{36}$/i.test(id) ? { userId: id } : {} },
    });
    if (list.data) setHistory(list.data.data);
  }, [api, userId]);

  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setSaved(false);
    const res = await api.POST('/admin/restrictions', {
      body: { userId: userId.trim(), message, filesRequired },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setMessage('');
    setFilesRequired(false);
    setSaved(true);
    void load();
  }

  async function remove(id: string) {
    if (!window.confirm(t('t_are_u_sure_want_proceed'))) return;
    await api.DELETE('/admin/restrictions/{restrictionId}', {
      params: { path: { restrictionId: id } },
    });
    void load();
  }

  return (
    <main className="admin-page">
      <AdminNav onMe={setMe} />
      <h1 className="mt-text-h2">{t('t_user_restrictions')}</h1>

      {can('users.restrict') && (
        <section className="admin-section" aria-labelledby="appeals-title">
          <h2 id="appeals-title" className="mt-text-h3">
            {t('t_appeal_details')} ({appeals.length})
          </h2>
          {appeals.length === 0 ? (
            <p className="auth-muted">{t('t_admin_queue_empty')}</p>
          ) : (
            <ul className="admin-rows">
              {appeals.map((a) => (
                <AppealCard key={a.id} appeal={a} onDone={load} />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="admin-section admin-stack" aria-labelledby="add-title">
        <h2 id="add-title" className="mt-text-h3">
          {t('t_add_restriction')}
        </h2>
        <Field
          label={t('t_admin_user_id')}
          name="userId"
          value={userId}
          onChange={setUserId}
          error={fields.userId}
        />
        {can('users.restrict') && (
          <form className="admin-stack" onSubmit={add} noValidate>
            {saved && <Alert kind="success">{t('t_add_restriction')} ✓</Alert>}
            {general && <Alert kind="error">{general}</Alert>}
            <p className="auth-muted">{t('t_add_restriction_alert_explain')}</p>
            <TextArea
              label={t('t_message')}
              name="message"
              value={message}
              onChange={setMessage}
              error={fields.message}
            />
            <label className="auth-check">
              <input
                type="checkbox"
                checked={filesRequired}
                onChange={(e) => setFilesRequired(e.target.checked)}
              />
              {t('t_new_restriction_files_required_checkbox')}
            </label>
            <button type="submit" className="auth-button">
              {t('t_submit')}
            </button>
          </form>
        )}
      </section>

      <section className="admin-section" aria-labelledby="history-title">
        <h2 id="history-title" className="mt-text-h3">
          {t('t_restrictions_history')}
        </h2>
        {history.length === 0 ? (
          <p className="auth-muted">{t('t_no_data_to_show_now')}</p>
        ) : (
          <ul className="admin-rows">
            {history.map((r) => (
              <li key={r.id} className="admin-card" data-testid="restriction">
                <strong>
                  {r.user.username} · {t(STATUS_KEY[r.status])} · {date(r.createdAt)}
                </strong>
                <p className="admin-message">{r.message}</p>
                {r.appeal && (
                  <p className="admin-message">
                    {t('t_restriction_response')}: {r.appeal.message}
                  </p>
                )}
                {r.decisionReason && (
                  <p className="admin-message">
                    {t('t_reason')}: {r.decisionReason}
                  </p>
                )}
                {can('users.restrict') && (
                  <button type="button" className="auth-link-button" onClick={() => remove(r.id)}>
                    {t('t_delete')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
