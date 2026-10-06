'use client';
// Restrictions removal center (spec 01 AC-19, AC-46…AC-49; legacy resources/views/livewire/restricted/
// index.blade.php): each restriction with its status and date, the reason, and the appeal form while pending,
// with the file picker (S-091…S-093 from the public config; required when the restriction asks for files).
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Submit, TextArea } from '@mytask/ui/web';
import { AppealFiles } from '../../../../components/appeal-files';
import { AuthCard } from '../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../lib/client';
import { usePublicConfig } from '../../../../lib/public-config';

type Restriction = components['schemas']['Restriction'];

const STATUS_KEY: Record<Restriction['status'], string> = {
  pending: 't_pending',
  submitted: 't_restriction_submitted',
  approved: 't_restriction_resolved',
  rejected: 't_restriction_rejected',
};

function AppealForm({ restriction, onDone }: { restriction: Restriction; onDone: () => void }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const rule = usePublicConfig(locale)?.uploads.appealFile;
  const [message, setMessage] = useState('');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);
  const onFiles = useCallback((ids: string[], running: boolean) => {
    setFileIds(ids);
    setUploading(running);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/restriction-appeals', {
      body: { restrictionId: restriction.id, message, fileIds },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate>
      {general && <Alert kind="error">{general}</Alert>}
      <TextArea
        label={t('t_type_ur_response_here')}
        name="message"
        maxLength={1500}
        value={message}
        onChange={setMessage}
        error={fields.message}
      />
      {rule?.enabled && (
        <AppealFiles
          locale={locale}
          rule={rule}
          required={restriction.filesRequired}
          error={fields.fileIds}
          onChange={onFiles}
        />
      )}
      <Submit busy={busy || uploading}>{t('t_appeal_the_closure')}</Submit>
    </form>
  );
}

export default function RestrictedPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const [items, setItems] = useState<Restriction[]>();

  const load = useCallback(async () => {
    const res = await api.GET('/me/restrictions', { params: { query: {} } });
    if (res.error) {
      router.replace(`${href(locale, '/auth/login')}?next=${href(locale, '/restricted')}`);
      return;
    }
    setItems(res.data.data);
  }, [api, router, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = items?.some((r) => r.status !== 'approved');
  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-GB', {
      timeZone: 'Asia/Tbilisi',
      dateStyle: 'long',
      timeStyle: 'short',
    });

  return (
    <AuthCard title={t('t_restrictions_removal_center')}>
      {items === undefined ? (
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      ) : (
        <>
          {open && <Alert kind="info">{t('t_account_restricted_notice')}</Alert>}
          {items.length === 0 ? (
            <p className="auth-muted">{t('t_no_results_found')}</p>
          ) : (
            <ul className="restriction-list">
              {items.map((r) => (
                <li key={r.id} className="restriction-item" data-testid="restriction">
                  <p className="restriction-status" data-status={r.status}>
                    {t(STATUS_KEY[r.status])}
                  </p>
                  <time className="auth-muted" dateTime={r.createdAt}>
                    {date(r.createdAt)}
                  </time>
                  <details open={r.canAppeal}>
                    <summary>{t('t_restriction_read_reason')}</summary>
                    <h2 className="mt-text-label">{t('t_reason')}</h2>
                    <p className="restriction-message">{r.message}</p>
                  </details>
                  {r.canAppeal && <AppealForm restriction={r} onDone={load} />}
                </li>
              ))}
            </ul>
          )}
          {!open && <a href={href(locale, '/account')}>{t('t_account_settings')}</a>}
        </>
      )}
    </AuthCard>
  );
}
