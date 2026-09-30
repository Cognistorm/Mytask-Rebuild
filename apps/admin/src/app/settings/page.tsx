'use client';
// Settings (spec 16 AC-51…AC-56): the register rows implemented so far, grouped by area. Booleans are
// switches, numbers and choices are inputs. Rows marked "re-login" ask for the password first (AC-7).
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { AdminNav } from '../../components/nav';
import { Alert, AuthCard, Field, Submit } from '../../components/ui';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type Entry = components['schemas']['SettingEntry'];

const AREA_TITLE: Record<string, string> = {
  auth: 't_settings_area_auth',
  notifications: 't_settings_area_notifications',
  system: 't_settings_area_system',
};

export default function SettingsPage() {
  const api = useAdminApi();
  const router = useRouter();
  const [rows, setRows] = useState<Entry[]>([]);
  const [notice, setNotice] = useState<string>();
  const [err, setErr] = useState<ApiErrorBody>();
  const [pending, setPending] = useState<{ row: Entry; value: unknown }>();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const reauthErrors = splitErrors(err);

  const load = useCallback(async () => {
    const list = await api.GET('/admin/settings', { params: { query: {} } });
    if (list.error) return router.replace('/login');
    setRows(list.data.settings);
  }, [api, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(row: Entry, value: unknown) {
    setErr(undefined);
    setNotice(undefined);
    const res = await api.PATCH('/admin/settings/{key}', {
      params: { path: { key: row.key } },
      body: { value, expectedVersion: row.version },
    });
    if (res.error) {
      const e = res.error as ApiErrorBody;
      if (e.code === 'REAUTH_REQUIRED') return setPending({ row, value });
      setErr(e);
      return void load();
    }
    setNotice(t('t_setting_saved'));
    void load();
  }

  async function reauth(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    const res = await api.POST('/admin/auth/reauth', { body: { method: 'password', password } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setPassword('');
    const next = pending;
    setPending(undefined);
    await save(next.row, next.value);
  }

  if (pending) {
    return (
      <AuthCard
        title={t('t_reauth_required')}
        subtitle={`${pending.row.registerId} · ${pending.row.key}`}
      >
        {reauthErrors.general && <Alert kind="error">{reauthErrors.general}</Alert>}
        <form onSubmit={reauth} noValidate>
          <Field
            label={t('t_password')}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            showLabel={t('t_ui_show_password')}
            hideLabel={t('t_ui_hide_password')}
          />
          <Submit busy={busy}>{t('t_continue')}</Submit>
        </form>
        <button type="button" className="auth-link-button" onClick={() => setPending(undefined)}>
          {t('t_ui_close')}
        </button>
      </AuthCard>
    );
  }

  const areas = [...new Set(rows.map((r) => r.area))];
  return (
    <main className="admin-page">
      <AdminNav />
      <h1 className="mt-text-h2">{t('t_settings')}</h1>
      {notice && <Alert kind="success">{notice}</Alert>}
      {err && err.code !== 'REAUTH_REQUIRED' && <Alert kind="error">{err.message}</Alert>}
      {areas.map((area) => (
        <section key={area} className="admin-section" aria-labelledby={`area-${area}`}>
          <h2 id={`area-${area}`} className="mt-text-h3">
            {t(AREA_TITLE[area] ?? 't_settings')}
          </h2>
          <ul className="admin-rows">
            {rows
              .filter((r) => r.area === area)
              .map((row) => (
                <SettingRow key={row.key} row={row} onSave={save} />
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function SettingRow({ row, onSave }: { row: Entry; onSave: (row: Entry, value: unknown) => void }) {
  const [draft, setDraft] = useState(() =>
    typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value),
  );
  const id = `setting-${row.registerId}`;
  const meaning = row.meaning.ka;

  if (row.type === 'boolean') {
    return (
      <li className="admin-row">
        <label htmlFor={id} className="admin-row-text">
          <strong>{row.registerId}</strong> {meaning}
          {row.stepUpRequired && <span className="auth-muted"> · {t('t_reauth_required')}</span>}
        </label>
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={row.value === true}
          checked={row.value === true}
          onChange={(e) => onSave(row, e.target.checked)}
        />
      </li>
    );
  }

  const parse = (): unknown => {
    if (row.type === 'integer') return Number(draft);
    if (row.type === 'email_list')
      return draft
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (row.type === 'structured') {
      try {
        return JSON.parse(draft);
      } catch {
        return draft;
      }
    }
    return draft;
  };

  return (
    <li className="admin-row">
      <label htmlFor={id} className="admin-row-text">
        <strong>{row.registerId}</strong> {meaning}
        {row.unit && <span className="auth-muted"> ({row.unit})</span>}
      </label>
      <span className="admin-row-edit">
        {row.allowedValues ? (
          <select id={id} value={draft} onChange={(e) => setDraft(e.target.value)}>
            {row.allowedValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} />
        )}
        <button type="button" className="auth-button" onClick={() => onSave(row, parse())}>
          {t('t_save')}
        </button>
      </span>
    </li>
  );
}
