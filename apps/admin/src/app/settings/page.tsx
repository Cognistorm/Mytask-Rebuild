'use client';
// Settings (spec 16 AC-51…AC-56): the register rows implemented so far, grouped by area. Booleans are
// switches, numbers and choices are inputs. Rows marked "re-login" ask for the password first (AC-7).
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { AdminShell } from '../../components/shell';
import { Alert, Field, Submit } from '@mytask/ui/web';
import { AuthCard } from '../../components/ui';
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
  const valueOf = (registerId: string) => rows.find((r) => r.registerId === registerId)?.value;
  return (
    <AdminShell>
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
                <SettingRow
                  key={row.key}
                  row={row}
                  onSave={save}
                  disabled={
                    DEPENDS_ON[row.registerId] !== undefined &&
                    valueOf(DEPENDS_ON[row.registerId]!) === false
                  }
                />
              ))}
          </ul>
        </section>
      ))}
    </AdminShell>
  );
}

type SocialValue = components['schemas']['SettingSocialProviderValue'];

/**
 * S-065…S-069 (ADR-005 §8, spec 16 AC-54): switch + client ID + write-only secret. The saved secret is never
 * shown, only "set / not set"; an empty secret field keeps it, "clear" removes it.
 */
function SocialProviderRow({
  row,
  onSave,
}: {
  row: Entry;
  onSave: (row: Entry, value: unknown) => void;
}) {
  const v = row.value as SocialValue;
  const [enabled, setEnabled] = useState(v.isEnabled);
  const [clientId, setClientId] = useState(v.clientId ?? '');
  const [secret, setSecret] = useState('');
  const [clear, setClear] = useState(false);
  const id = `setting-${row.registerId}`;

  function save() {
    onSave(row, {
      isEnabled: enabled,
      clientId: clientId.trim() || null,
      ...(clear ? { clientSecret: null } : secret ? { clientSecret: secret } : {}),
    });
    setSecret('');
    setClear(false);
  }

  return (
    <li className="admin-card" data-testid={`social-${row.registerId}`}>
      <strong>
        {row.registerId} {row.meaning.ka}
      </strong>
      <span className="auth-muted">
        {t(v.clientSecret.isSet ? 't_client_secret_set' : 't_client_secret_not_set')}
        {row.stepUpRequired ? ` · ${t('t_reauth_required')}` : ''}
      </span>
      <label className="auth-check">
        <input
          type="checkbox"
          role="switch"
          aria-checked={enabled}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        {t('t_social_login_enabled')}
      </label>
      <span className="admin-row-edit">
        <label htmlFor={`${id}-cid`}>{t('t_client_id')}</label>
        <input id={`${id}-cid`} value={clientId} onChange={(e) => setClientId(e.target.value)} />
      </span>
      <span className="admin-row-edit">
        <label htmlFor={`${id}-secret`}>{t('t_client_secret_new')}</label>
        <input
          id={`${id}-secret`}
          type="password"
          autoComplete="new-password"
          value={secret}
          disabled={clear}
          onChange={(e) => setSecret(e.target.value)}
        />
      </span>
      {v.clientSecret.isSet && (
        <label className="auth-check">
          <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} />
          {t('t_clear_client_secret')}
        </label>
      )}
      <button type="button" className="auth-button" onClick={save}>
        {t('t_save')}
      </button>
    </li>
  );
}

/** A row that only applies while another (boolean) row is ON: its field is disabled while that row is OFF. */
const DEPENDS_ON: Record<string, string> = { 'S-132': 'S-131' }; // Q-159: EV-02 hourly cap needs the switch

function SettingRow({
  row,
  onSave,
  disabled = false,
}: {
  row: Entry;
  onSave: (row: Entry, value: unknown) => void;
  disabled?: boolean;
}) {
  if (row.isSecret) return <SocialProviderRow row={row} onSave={onSave} />;
  return <PlainSettingRow row={row} onSave={onSave} disabled={disabled} />;
}

function PlainSettingRow({
  row,
  onSave,
  disabled,
}: {
  row: Entry;
  onSave: (row: Entry, value: unknown) => void;
  disabled: boolean;
}) {
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
          <input
            id={id}
            type={row.type === 'integer' ? 'number' : 'text'}
            min={row.type === 'integer' ? (row.minimum ?? undefined) : undefined}
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
          />
        )}
        <button
          type="button"
          className="auth-button"
          disabled={disabled}
          onClick={() => onSave(row, parse())}
        >
          {t('t_save')}
        </button>
      </span>
    </li>
  );
}
