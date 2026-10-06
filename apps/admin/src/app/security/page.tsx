'use client';
// Banned IPs of the staff login (spec 01 AC-52, P-20): list, add by hand, remove (resets the counter).
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { AdminShell } from '../../components/shell';
import { Alert, Field } from '@mytask/ui/web';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type Ban = components['schemas']['IpBan'];

export default function SecurityPage() {
  const api = useAdminApi();
  const [bans, setBans] = useState<Ban[]>([]);
  const [ip, setIp] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  const load = useCallback(async () => {
    const res = await api.GET('/admin/ip-bans', { params: { query: {} } });
    if (res.data) setBans(res.data.data);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    const res = await api.POST('/admin/ip-bans', { body: { ip, note: note || null } });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setIp('');
    setNote('');
    void load();
  }

  async function remove(target: string) {
    await api.DELETE('/admin/ip-bans/{ip}', { params: { path: { ip: target } } });
    void load();
  }

  return (
    <AdminShell>
      <h1 className="mt-text-h2">{t('t_banned_ips')}</h1>
      {general && <Alert kind="error">{general}</Alert>}
      <form className="admin-section admin-inline-form" onSubmit={add} noValidate>
        <Field label={t('t_ip_address')} name="ip" value={ip} onChange={setIp} error={fields.ip} />
        <Field label={t('t_note')} name="note" value={note} onChange={setNote} />
        <button type="submit" className="auth-button">
          {t('t_add')}
        </button>
      </form>
      <section className="admin-section">
        {bans.length === 0 ? (
          <p className="auth-muted">{t('t_no_results_found')}</p>
        ) : (
          <ul className="admin-rows">
            {bans.map((b) => (
              <li key={b.ip} className="admin-row" data-testid="ip-ban">
                <span className="admin-row-text">
                  <strong>{b.ip}</strong> · {t('t_failed_attempts')}: {b.failedAttempts} ·{' '}
                  {t(b.source === 'manual' ? 't_ip_ban_source_manual' : 't_ip_ban_source_auto')} ·{' '}
                  {new Date(b.bannedAt).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
                  {b.note ? ` · ${b.note}` : ''}
                </span>
                <button type="button" className="auth-link-button" onClick={() => remove(b.ip)}>
                  {t('t_unban_ip')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
