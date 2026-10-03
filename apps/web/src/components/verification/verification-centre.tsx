'use client';
// Verification centre (spec 02 AC-36…AC-39, EC-8; legacy `Account/Verification/VerificationComponent.php:129-393`
// and `account/verification/verification.blade.php`). `getMyKyc` decides the view:
// - no verification (or "Send files again" after a decline): the legacy 3 steps — document type, document
//   photos (front + back, passport front only), selfie with the document — then `createKycVerification`;
// - a verification: status, date, decline reason, and the documents with Download (owner-only signed link).
// Photos use the shared upload protocol (purpose `kyc_document`, JPG/JPEG/PNG ≤ 5 MB, fixed rule AC-36).
// All steps stay mounted (hidden) so going Back keeps the uploads.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, RadioGroup, Skeleton } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { formatBytes, formatDate } from '../../lib/format';
import { AccountNav } from '../account-settings/account-nav';
import { useDashboard } from '../dashboard/shell';
import { ImageUploader } from '../portfolio-edit/image-uploader';
import { Block } from '../profile-edit/block';
import '../profile-edit/edit.css';
import '../portfolio-edit/portfolio.css';
import './verification.css';

type Overview = components['schemas']['KycOverview'];
type Verification = components['schemas']['KycVerification'];
type DocumentType = components['schemas']['KycDocumentType'];
type Attachment = components['schemas']['Attachment'];

const EXTENSIONS = ['jpg', 'jpeg', 'png'];
const MAX_MB = 5;

/** Legacy labels of the document sides (`verification.blade.php`). */
const SIDE_LABEL: Record<DocumentType, { type: string; front: string; back: string }> = {
  national_id: {
    type: 't_government_issued_id',
    front: 't_government_issued_id_frontside',
    back: 't_government_issued_id_backside',
  },
  driver_license: {
    type: 't_driver_license',
    front: 't_driver_license_frontside',
    back: 't_driver_license_backside',
  },
  passport: { type: 't_passport', front: 't_passport', back: 't_passport' },
};

export function VerificationCentre() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { me } = useDashboard();
  const [overview, setOverview] = useState<Overview>();
  const [failed, setFailed] = useState(false);
  // "Send files again" after a decline opens the form (the declined row stays, EC-8).
  const [again, setAgain] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api.GET('/me/kyc');
    // 401 / restricted are handled by the shell (redirect); anything else offers a retry.
    if (res.data) setOverview(res.data);
    else if (res.response.status !== 401 && res.response.status !== 403) setFailed(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div className="mt-dash-error">
        <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
        <button type="button" className="mt-button" onClick={() => void load()}>
          {t('t_ui_retry')}
        </button>
      </div>
    );
  }

  if (!me || !overview) return <Skeleton label={t('t_ui_loading')} rows={6} />;

  const showForm = overview.verification === null || (again && overview.canSubmit);

  return (
    <div className="mt-edit" data-testid="verification-centre">
      <div>
        <h1 className="mt-edit-title">{t('t_verification_center')}</h1>
        <p className="mt-edit-block-hint">{t('t_verification_center_subtitle')}</p>
      </div>
      <div className="mt-edit-layout">
        <div className="mt-edit-side mt-account-side">
          <AccountNav t={t} locale={locale} me={me} current="verification" />
        </div>
        <div className="mt-edit-main">
          {showForm ? (
            <KycForm
              t={t}
              onSubmitted={(verification) => {
                setAgain(false);
                setOverview({ status: verification.status, verification, canSubmit: false });
              }}
              onConflict={() => {
                setAgain(false);
                void load();
              }}
            />
          ) : (
            overview.verification && (
              <Status
                t={t}
                verification={overview.verification}
                onSendAgain={overview.canSubmit ? () => setAgain(true) : undefined}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** Status, date, reason and documents of the latest verification (legacy status card). */
function Status(props: { t: TFunction; verification: Verification; onSendAgain?: () => void }) {
  const { t, verification: v } = props;
  const locale = useLocale();
  const api = useApi(locale);
  const [err, setErr] = useState<string>();
  const labels = SIDE_LABEL[v.documentType];

  // The owner's own photo through a 2-minute signed link; it answers as an attachment, so the page stays.
  async function download(file: Attachment) {
    setErr(undefined);
    const res = await api.GET('/files/{fileId}/download', {
      params: { path: { fileId: file.fileId }, query: { mode: 'json' } },
    });
    if (res.error) return setErr((res.error as ApiErrorBody).message);
    window.location.assign((res.data as components['schemas']['SignedUrl']).url);
  }

  const status =
    v.status === 'pending'
      ? t('t_verification_pending')
      : v.status === 'verified'
        ? t('t_account_verified')
        : t('t_verification_declined');
  const date =
    v.status === 'pending'
      ? { label: t('t_verification_date'), value: v.createdAt }
      : {
          label: t(v.status === 'verified' ? 't_verified_at' : 't_declined_at'),
          value: v.reviewedAt ?? v.createdAt,
        };
  const files: { label: string; file: Attachment }[] = [
    { label: t('t_selfie_photo'), file: v.selfieFile },
    { label: t(labels.front), file: v.frontFile },
    ...(v.backFile ? [{ label: t(labels.back), file: v.backFile }] : []),
  ];

  return (
    <Block title={t('t_verification_status')} testId="kyc-status">
      <dl className="mt-kyc-facts">
        <div>
          <dt>{t('t_verification_status')}</dt>
          <dd data-testid="kyc-state" data-status={v.status}>
            {status}
          </dd>
        </div>
        <div>
          <dt>{date.label}</dt>
          <dd>{formatDate(date.value)}</dd>
        </div>
        {v.status === 'declined' && v.declineReason && (
          <div>
            <dt>{t('t_reason')}</dt>
            <dd data-testid="kyc-reason">{v.declineReason}</dd>
          </div>
        )}
      </dl>
      {v.status === 'pending' && <Alert kind="info">{t('t_kyc_status_pending')}</Alert>}
      <h3 className="mt-kyc-subtitle">{t('t_verification_documents')}</h3>
      {err && <Alert kind="error">{err}</Alert>}
      <ul className="mt-kyc-files">
        {files.map(({ label, file }) => (
          <li key={file.fileId}>
            <span>
              <strong>{label}</strong> – {formatBytes(file.sizeBytes)}
            </span>
            <button
              type="button"
              className="mt-edit-link"
              aria-label={`${t('t_download')}: ${label}`}
              onClick={() => void download(file)}
            >
              {t('t_download')}
            </button>
          </li>
        ))}
      </ul>
      {props.onSendAgain && (
        <div className="mt-edit-buttons">
          <button
            type="button"
            className="mt-button mt-button-primary"
            data-testid="kyc-send-again"
            onClick={props.onSendAgain}
          >
            {t('t_send_files_again')}
          </button>
        </div>
      )}
    </Block>
  );
}

interface Files {
  front?: string;
  back?: string;
  selfie?: string;
}

/** The legacy 3 steps; Next checks the step, Finish submits. */
function KycForm(props: {
  t: TFunction;
  onSubmitted: (v: Verification) => void;
  onConflict: () => void;
}) {
  const { t } = props;
  const locale = useLocale();
  const api = useApi(locale);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<DocumentType>();
  const [files, setFiles] = useState<Files>({});
  const [busy, setBusy] = useState<Record<keyof Files, boolean>>({
    front: false,
    back: false,
    selfie: false,
  });
  const [missing, setMissing] = useState<Partial<Record<'type' | keyof Files, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);
  const needsBack = type !== undefined && type !== 'passport';
  const required = t('t_validator_required');

  const slot = useCallback(
    (key: keyof Files) => (ids: string[], isBusy: boolean) => {
      setFiles((f) => ({ ...f, [key]: ids[0] }));
      setBusy((b) => (b[key] === isBusy ? b : { ...b, [key]: isBusy }));
    },
    [],
  );
  const onFront = slot('front');
  const onBack = slot('back');
  const onSelfie = slot('selfie');

  function next() {
    if (step === 1) {
      if (!type) return setMissing({ type: true });
      setMissing({});
      return setStep(2);
    }
    const gap = { front: !files.front, back: needsBack && !files.back };
    if (gap.front || gap.back) return setMissing(gap);
    setMissing({});
    setStep(3);
  }

  async function finish() {
    if (!type || !files.front) return;
    if (!files.selfie) return setMissing({ selfie: true });
    setMissing({});
    setSending(true);
    setErr(undefined);
    const res = await api.POST('/kyc', {
      body: {
        documentType: type,
        frontFileId: files.front,
        ...(needsBack && files.back ? { backFileId: files.back } : {}),
        selfieFileId: files.selfie,
      },
    });
    setSending(false);
    if (res.error) {
      // AC-38: a verification is already pending or verified (e.g. another tab) → show it.
      if (res.response.status === 409) return props.onConflict();
      return setErr(res.error as ApiErrorBody);
    }
    props.onSubmitted(res.data);
  }

  const uploading = busy.front || (needsBack && busy.back) || (step === 3 && busy.selfie);
  const info = t('t_verification_allowed_mimes_size');

  return (
    <Block title={t('t_verification_center')} testId="kyc-form">
      {general && <Alert kind="error">{general}</Alert>}
      <div hidden={step !== 1} data-testid="kyc-step-1">
        <RadioGroup
          label={t('t_choose_document_type')}
          name="documentType"
          options={(Object.keys(SIDE_LABEL) as DocumentType[]).map((value) => ({
            value,
            label: t(SIDE_LABEL[value].type),
          }))}
          value={type}
          onChange={setType}
          error={missing.type ? required : fields.documentType}
        />
      </div>
      <div hidden={step !== 2} className="mt-kyc-sides" data-testid="kyc-step-2">
        <ImageUploader
          locale={locale}
          label={t('t_upload_doc_front_side')}
          purpose="kyc_document"
          info={info}
          max={1}
          maxSizeMb={MAX_MB}
          extensions={EXTENSIONS}
          error={missing.front ? required : fields.frontFileId}
          testId="kyc-front"
          onChange={onFront}
        />
        {needsBack && (
          <ImageUploader
            locale={locale}
            label={t('t_upload_doc_back_side')}
            purpose="kyc_document"
            info={info}
            max={1}
            maxSizeMb={MAX_MB}
            extensions={EXTENSIONS}
            error={missing.back ? required : fields.backFileId}
            testId="kyc-back"
            onChange={onBack}
          />
        )}
      </div>
      <div hidden={step !== 3} data-testid="kyc-step-3">
        <p className="mt-edit-block-hint">{t('t_upload_selfie_with_id_msg')}</p>
        <ImageUploader
          locale={locale}
          label={t('t_upload_selfie_with_id')}
          purpose="kyc_document"
          info={info}
          max={1}
          maxSizeMb={MAX_MB}
          extensions={EXTENSIONS}
          error={missing.selfie ? required : fields.selfieFileId}
          testId="kyc-selfie"
          onChange={onSelfie}
        />
      </div>
      <div className="mt-kyc-actions">
        {step !== 1 && (
          <button
            type="button"
            className="mt-button"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
          >
            {t('t_back')}
          </button>
        )}
        {step === 3 ? (
          <button
            type="button"
            className="mt-button mt-button-primary"
            disabled={sending || uploading}
            aria-busy={sending}
            onClick={() => void finish()}
          >
            {t('t_finish')}
          </button>
        ) : (
          <button
            type="button"
            className="mt-button mt-button-primary"
            disabled={step === 2 && uploading}
            onClick={next}
          >
            {t('t_next_step')}
          </button>
        )}
      </div>
    </Block>
  );
}
