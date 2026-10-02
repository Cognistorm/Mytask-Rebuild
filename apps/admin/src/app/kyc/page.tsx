'use client';
// KYC queue (spec 16 AC-19, AC-27; spec 02 AC-36, AC-37, AC-39; legacy
// resources/views/livewire/admin/verifications/verifications.blade.php, Admin/Verifications/VerificationsComponent.php:67-155).
// Pending verifications oldest first, 50 per page, with the owner summary. The ID and selfie images open only
// on request through adminGetKycFileDownload (audited, 1–2 minute signed link; R-A8) and show inline.
// Approve → verified + EV-17; Decline (reason required, shown to the user) → declined + EV-18. First decision wins.
import { useCallback, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Select, TextArea } from '@mytask/ui/web';
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
type Status = S['KycStatus'];
type DocType = S['KycDocumentType'];

const STATUS_KEY: Record<Status, string> = {
  pending: 't_pending',
  verified: 't_verified',
  declined: 't_declined',
};
const DOC_KEY: Record<DocType, string> = {
  national_id: 't_kyc_document_id',
  driver_license: 't_kyc_document_driver_license',
  passport: 't_kyc_document_passport',
};

function KycCard({ entry, onDone }: { entry: S['AdminKycVerification']; onDone: () => void }) {
  const api = useAdminApi();
  const v = entry.verification;
  const [reason, setReason] = useState('');
  const [shown, setShown] = useState<Record<string, string>>({});
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);
  const files = [
    { key: 't_front_side', file: v.frontFile },
    ...(v.backFile ? [{ key: 't_back_side', file: v.backFile }] : []),
    { key: 't_selfie_photo', file: v.selfieFile },
  ];

  // Every open is a fresh audited signed link; the image is shown inline (no copy is kept).
  async function view(fileId: string) {
    setErr(undefined);
    const res = await api.GET('/admin/kyc/{kycId}/files/{fileId}/download', {
      params: { path: { kycId: v.id, fileId }, query: { mode: 'json' } },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setShown((old) => ({ ...old, [fileId]: (res.data as S['SignedUrl']).url }));
  }

  async function decide(kind: 'approve' | 'decline') {
    setErr(undefined);
    if (kind === 'decline' && !reason.trim()) {
      return setErr({
        code: 'VALIDATION',
        message: '',
        details: { fields: [{ field: 'reason', message: t('t_required') }] },
      });
    }
    const ask =
      kind === 'approve'
        ? 't_are_u_sure_u_want_to_approve_this_verification'
        : 't_are_u_sure_u_want_to_decline_this_verification';
    if (!window.confirm(t(ask))) return;
    const path = { params: { path: { kycId: v.id } } };
    const res =
      kind === 'approve'
        ? await api.POST('/admin/kyc/{kycId}/approve', { ...path, body: {} })
        : await api.POST('/admin/kyc/{kycId}/decline', {
            ...path,
            body: { reason: reason.trim() },
          });
    if (res.error) {
      setErr(decisionError(res.error as ApiErrorBody, res.response.status));
      if (res.response.status === 409) onDone();
      return;
    }
    onDone();
  }

  return (
    <li className="admin-card" data-testid="kyc-item">
      <OwnerSummary owner={entry.owner} />
      <strong>
        {t('t_document_type')}: {t(DOC_KEY[v.documentType])} · {t(STATUS_KEY[v.status])} ·{' '}
        {adminDate(v.createdAt)}
      </strong>
      <ul className="admin-kyc-files">
        {files.map(({ key, file }) => (
          <li key={file.fileId} data-testid="kyc-file">
            <span className="auth-muted">{t(key)}</span>
            {shown[file.fileId] ? (
              <a href={shown[file.fileId]} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private signed URL */}
                <img src={shown[file.fileId]} alt={t(key)} />
              </a>
            ) : (
              <button type="button" className="auth-link-button" onClick={() => view(file.fileId)}>
                {t('t_view')}
              </button>
            )}
          </li>
        ))}
      </ul>
      {v.declineReason && (
        <p className="admin-message">
          {t('t_reason')}: {v.declineReason}
        </p>
      )}
      {entry.reviewedBy && v.reviewedAt && (
        <span className="auth-muted">
          {entry.reviewedBy.fullName} · {adminDate(v.reviewedAt)}
        </span>
      )}
      {general && <Alert kind="error">{general}</Alert>}
      {v.status === 'pending' && (
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
            <button type="button" className="auth-button" onClick={() => decide('approve')}>
              {t('t_approve_files')}
            </button>
            <button type="button" className="auth-link-button" onClick={() => decide('decline')}>
              {t('t_decline_files')}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default function KycQueuePage() {
  const api = useAdminApi();
  const [me, setMe] = useState<Me>();
  const [status, setStatus] = useState<Status>('pending');
  const [docType, setDocType] = useState<DocType | ''>('');
  const [filter, setFilter] = useState<QueueFilter>({ userId: '', from: '', to: '' });
  const can = !!me && (me.isSuperAdmin || me.permissions.includes('kyc.review'));

  const fetchPage = useCallback(
    (cursor?: string) =>
      api.GET('/admin/kyc', {
        params: {
          query: {
            status,
            ...(docType ? { documentType: docType } : {}),
            ...filterQuery(filter),
            ...(cursor ? { cursor } : {}),
          },
        },
      }),
    [api, status, docType, filter],
  );
  const list = useCursorList(fetchPage, can);
  const { general } = splitErrors(list.err);

  return (
    <main className="admin-page">
      <AdminNav onMe={setMe} />
      <h1 className="mt-text-h2">
        {t('t_verifications')}
        {list.total !== null && ` (${list.total})`}
      </h1>
      {me && !can && <Alert kind="error">{t('t_u_dont_have_permissions_to_access_page')}</Alert>}
      {can && (
        <section className="admin-section admin-queue" aria-label={t('t_verifications')}>
          <StatusTabs
            value={status}
            onChange={setStatus}
            options={(['pending', 'verified', 'declined'] as const).map((s) => ({
              value: s,
              label: t(STATUS_KEY[s]),
            }))}
          />
          <QueueFilterForm value={filter} onApply={setFilter}>
            <Select
              label={t('t_document_type')}
              name="documentType"
              placeholder="—"
              value={docType}
              onChange={(d) => setDocType(d as DocType | '')}
              options={(['national_id', 'driver_license', 'passport'] as const).map((d) => ({
                value: d,
                label: t(DOC_KEY[d]),
              }))}
            />
          </QueueFilterForm>
          {general && <Alert kind="error">{general}</Alert>}
          {list.loaded && list.items.length === 0 ? (
            <p className="auth-muted">
              {t(status === 'pending' ? 't_admin_queue_empty' : 't_no_data_to_show_now')}
            </p>
          ) : (
            <ul className="admin-rows">
              {list.items.map((e) => (
                <KycCard key={e.verification.id} entry={e} onDone={list.reload} />
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
