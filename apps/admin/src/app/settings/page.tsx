'use client';
// Settings (spec 16 AC-51…AC-56): the register rows implemented so far, one area at a time (`?area=…`, the
// first area by default; admin-refresh.md §4). Booleans are switches, numbers and choices are inputs. Rows
// marked "re-login" ask for the password first (AC-7).
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { components } from '@mytask/types';
import { AdminShell } from '../../components/shell';
import { Alert, Field, Pill, Submit } from '@mytask/ui/web';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';
import { areaHref, areaTitle, areasOf } from '../../lib/settings-areas';

type Entry = components['schemas']['SettingEntry'];

// The area comes from the query string, which needs a Suspense boundary in a prerendered page.
export default function SettingsPage() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const api = useAdminApi();
  const router = useRouter();
  const query = useSearchParams().get('area');
  const [rows, setRows] = useState<Entry[]>([]);
  const [notice, setNotice] = useState<string>();
  const [err, setErr] = useState<ApiErrorBody>();
  const [pending, setPending] = useState<{ row: Entry; value: unknown }>();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const reauthErrors = splitErrors(err);
  const reauthRef = useRef<HTMLElement>(null);
  const areas = useMemo(() => areasOf(rows), [rows]);
  // An unknown or missing `?area=` opens the first area.
  const area = areas.find((a) => a === query) ?? areas[0];

  const load = useCallback(async () => {
    const list = await api.GET('/admin/settings', { params: { query: {} } });
    if (list.error) return router.replace('/login');
    setRows(list.data.settings);
  }, [api, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // The re-login card takes the focus when it opens, so keyboard and screen-reader users land on it; when it
  // closes (Close or saved), the focus goes back to the setting that asked for it (F-4X9-1).
  const opener = useRef<Entry>(undefined);
  useEffect(() => {
    if (pending) {
      opener.current = pending.row;
      return reauthRef.current?.focus();
    }
    const row = opener.current;
    if (!row) return;
    opener.current = undefined;
    const id = `setting-${row.registerId}`;
    const target = row.isSecret
      ? document.querySelector<HTMLElement>(`[data-testid="social-${row.registerId}"] .admin-save`)
      : document.getElementById(id);
    target?.focus();
  }, [pending]);

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

  const valueOf = (registerId: string) => rows.find((r) => r.registerId === registerId)?.value;
  const shell = {
    settingsAreas: rows.length ? areas : undefined,
    current: area && areaHref(area),
  };

  // AC-7 re-login step: a card in the content area, the sidebar stays (4X.7).
  if (pending) {
    return (
      <AdminShell {...shell}>
        <h1 className="mt-text-h2">{area ? areaTitle(area) : t('t_settings')}</h1>
        <section
          ref={reauthRef}
          tabIndex={-1}
          className="admin-section admin-stack admin-form-card admin-reauth"
          aria-labelledby="reauth-title"
        >
          <h2 id="reauth-title" className="mt-text-h3">
            {t('t_reauth_required')}
          </h2>
          <p className="auth-muted">
            <code className="admin-setting-id">{pending.row.registerId}</code>{' '}
            {pending.row.meaning.ka}
          </p>
          {reauthErrors.general && <Alert kind="error">{reauthErrors.general}</Alert>}
          <form className="admin-stack" onSubmit={reauth} noValidate>
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
            <div className="admin-item-actions">
              <Submit busy={busy}>{t('t_continue')}</Submit>
              <button
                type="button"
                className="auth-link-button"
                onClick={() => setPending(undefined)}
              >
                {t('t_ui_close')}
              </button>
            </div>
          </form>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell {...shell}>
      <h1 className="mt-text-h2">{area ? areaTitle(area) : t('t_settings')}</h1>
      {notice && <Alert kind="success">{notice}</Alert>}
      {err && err.code !== 'REAUTH_REQUIRED' && <Alert kind="error">{err.message}</Alert>}
      {area && (
        <section key={area} className="admin-section">
          <ul className="admin-settings">
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
      )}
    </AdminShell>
  );
}

type SocialValue = components['schemas']['SettingSocialProviderValue'];

/** The start column of a setting (admin-refresh.md §5): the meaning, then the register ID, the unit and the badge. */
function SettingText({ row, id, labelFor }: { row: Entry; id: string; labelFor?: string }) {
  const Meaning = labelFor ? 'label' : 'span';
  return (
    <div className="admin-setting-text">
      <Meaning id={`${id}-meaning`} htmlFor={labelFor} className="admin-setting-meaning">
        {row.meaning.ka}
      </Meaning>
      <span className="admin-setting-meta">
        <code id={`${id}-reg`} className="admin-setting-id">
          {row.registerId}
        </code>
        {row.unit && <span>{row.unit}</span>}
        {row.stepUpRequired && <Pill tone="warning">{t('t_settings_reauth_badge')}</Pill>}
      </span>
    </div>
  );
}

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
  const changed = enabled !== v.isEnabled || clientId !== (v.clientId ?? '') || !!secret || clear;

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
    <li className="admin-provider" data-testid={`social-${row.registerId}`}>
      <div className="admin-provider-head">
        <SettingText row={row} id={id} />
        <label className="admin-provider-switch">
          <span id={`${id}-switch`}>{t('t_social_login_enabled')}</span>
          <input
            type="checkbox"
            role="switch"
            // Named "S-065 <enabled>": every setting control starts with its register ID (F-4X9-8).
            aria-labelledby={`${id}-reg ${id}-switch`}
            aria-checked={enabled}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </label>
      </div>
      <div className="admin-provider-fields">
        <div className="auth-field">
          <label htmlFor={`${id}-cid`}>{t('t_client_id')}</label>
          <input id={`${id}-cid`} value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </div>
        <div className="auth-field">
          <label htmlFor={`${id}-secret`}>{t('t_client_secret_new')}</label>
          <input
            id={`${id}-secret`}
            type="password"
            autoComplete="new-password"
            value={secret}
            disabled={clear}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>
      </div>
      <div className="admin-provider-foot">
        <Pill tone={v.clientSecret.isSet ? 'success' : 'neutral'}>
          {t(v.clientSecret.isSet ? 't_client_secret_set' : 't_client_secret_not_set')}
        </Pill>
        {v.clientSecret.isSet && (
          <label className="admin-checkbox">
            <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} />
            {t('t_clear_client_secret')}
          </label>
        )}
        <SaveButton changed={changed} onClick={save} />
      </div>
    </li>
  );
}

/** "Save": Secondary at rest, the Primary look once the value differs from the saved one (still clickable). */
function SaveButton({
  changed,
  disabled,
  onClick,
}: {
  changed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mt-button admin-save${changed ? ' mt-button-primary' : ''}`}
      data-changed={changed || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {t('t_save')}
    </button>
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

const asDraft = (value: unknown) =>
  typeof value === 'object' ? JSON.stringify(value) : String(value);

function PlainSettingRow({
  row,
  onSave,
  disabled,
}: {
  row: Entry;
  onSave: (row: Entry, value: unknown) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(() => asDraft(row.value));
  const id = `setting-${row.registerId}`;
  // The control's name starts with the register ID ("S-056 …"), as the rows always read.
  const named = { 'aria-labelledby': `${id}-reg ${id}-meaning` };

  if (row.type === 'boolean') {
    return (
      <li className="admin-setting admin-setting-switch">
        <SettingText row={row} id={id} labelFor={id} />
        <div className="admin-setting-control">
          <input
            id={id}
            {...named}
            type="checkbox"
            role="switch"
            aria-checked={row.value === true}
            checked={row.value === true}
            onChange={(e) => onSave(row, e.target.checked)}
          />
        </div>
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
    <li className="admin-setting">
      <SettingText row={row} id={id} labelFor={id} />
      <div className="admin-setting-control">
        {row.allowedValues ? (
          <select id={id} {...named} value={draft} onChange={(e) => setDraft(e.target.value)}>
            {row.allowedValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <span className="admin-input-unit">
            <input
              id={id}
              {...named}
              type={row.type === 'integer' ? 'number' : 'text'}
              min={row.type === 'integer' ? (row.minimum ?? undefined) : undefined}
              value={draft}
              disabled={disabled}
              onChange={(e) => setDraft(e.target.value)}
            />
            {row.unit && <span aria-hidden="true">{row.unit}</span>}
          </span>
        )}
        <SaveButton
          changed={draft !== asDraft(row.value)}
          disabled={disabled}
          onClick={() => onSave(row, parse())}
        />
      </div>
    </li>
  );
}
