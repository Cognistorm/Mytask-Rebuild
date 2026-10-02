// Verification centre on mobile (spec 02 AC-36…AC-39, EC-8; screens table "same 3 steps, camera first; pending /
// verified / declined (with "send again")"), the same steps, texts, rules and ops as the web `/account/verification`
// (legacy `Account/Verification/VerificationComponent.php:129-393`). `getMyKyc` decides the view:
// - no verification (or "Send files again" after a decline): document type, document photos (front + back, passport
//   front only), selfie with the document (front camera) — then `createKycVerification`;
// - a verification: status, date, decline reason, and the documents with Download (owner-only signed link, opened
//   in the browser).
// Photos use the shared upload protocol (purpose `kyc_document`, JPG/JPEG/PNG ≤ 5 MB, fixed rule AC-36). All steps
// stay mounted (hidden) so going Back keeps the uploads. Signed-in only; a restricted account goes to its notice.
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { SecondaryButton, Skeleton } from '../../components/dashboard';
import { Button, Notice, Screen } from '../../components/form';
import { ImagePickerField } from '../../components/portfolio-edit/image-picker';
import { Block, ButtonCell, ButtonRow, RadioGroup } from '../../components/profile-edit/block';
import type { ApiError } from '../../components/reauth';
import { loadSession, mobileApi } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';
import { createT } from '../../lib/i18n';

type Overview = components['schemas']['KycOverview'];
type Verification = components['schemas']['KycVerification'];
type DocumentType = components['schemas']['KycDocumentType'];
type Attachment = components['schemas']['Attachment'];
type T = ReturnType<typeof createT>;

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

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

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'restricted' }
  | { kind: 'error' }
  | { kind: 'ready'; overview: Overview };

export default function VerificationScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  // "Send files again" after a decline opens the form (the declined row stays, EC-8).
  const [again, setAgain] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const me = await api.GET('/me').catch(() => undefined);
    if (!me?.data) {
      return setState(me?.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    if (me.data.isRestricted) return setState({ kind: 'restricted' });
    const res = await api.GET('/me/kyc').catch(() => undefined);
    setState(res?.data ? { kind: 'ready', overview: res.data } : { kind: 'error' });
  }, []);

  useEffect(() => void load(), [load]);

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'restricted') return <Redirect href="/restricted" />;

  const overview = state.kind === 'ready' ? state.overview : undefined;
  const showForm = !!overview && (overview.verification === null || (again && overview.canSubmit));

  return (
    <Screen title={t('t_verification_center')} subtitle={t('t_verification_center_subtitle')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={6} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {showForm ? (
        <KycForm
          api={api}
          t={t}
          onSubmitted={(verification) => {
            setAgain(false);
            setState({
              kind: 'ready',
              overview: { status: verification.status, verification, canSubmit: false },
            });
          }}
          onConflict={() => {
            // AC-38: a verification is already pending or verified (e.g. sent from the website) → show it.
            setAgain(false);
            void load();
          }}
        />
      ) : overview?.verification ? (
        <Status
          verification={overview.verification}
          onSendAgain={overview.canSubmit ? () => setAgain(true) : undefined}
        />
      ) : null}
    </Screen>
  );
}

/** Status, date, reason and documents of the latest verification (legacy status card). */
function Status(props: { verification: Verification; onSendAgain?: () => void }) {
  const { verification: v } = props;
  const [err, setErr] = useState<string>();
  const labels = SIDE_LABEL[v.documentType];

  // The owner's own photo through a 2-minute signed link, opened in the browser (AC-39).
  async function download(file: Attachment) {
    setErr(undefined);
    const res = await api
      .GET('/files/{fileId}/download', {
        params: { path: { fileId: file.fileId }, query: { mode: 'json' } },
      })
      .catch(() => undefined);
    if (!res?.data) {
      return setErr(
        (res?.error as ApiError | undefined)?.message ?? t('t_toast_something_went_wrong'),
      );
    }
    void Linking.openURL((res.data as components['schemas']['SignedUrl']).url);
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
    <Block title={t('t_verification_status')} testID="kyc-status">
      <Fact label={t('t_verification_status')} value={status} testID="kyc-state" />
      <Fact label={date.label} value={formatDate(date.value)} />
      {v.status === 'declined' && v.declineReason ? (
        <Fact label={t('t_reason')} value={v.declineReason} testID="kyc-reason" />
      ) : null}
      {v.status === 'pending' ? <Notice kind="info" text={t('t_kyc_status_pending')} /> : null}
      <Text style={s.subtitle} accessibilityRole="header">
        {t('t_verification_documents')}
      </Text>
      {err ? <Notice kind="error" text={err} /> : null}
      {files.map(({ label, file }) => (
        <View key={file.fileId} style={s.fileRow}>
          <Text style={s.fileText}>
            <Text style={s.fileLabel}>{label}</Text> – {formatBytes(file.sizeBytes)}
          </Text>
          <Pressable
            onPress={() => void download(file)}
            accessibilityRole="button"
            accessibilityLabel={`${t('t_download')}: ${label}`}
            hitSlop={theme.space[2]}
          >
            <Text style={s.link}>{t('t_download')}</Text>
          </Pressable>
        </View>
      ))}
      {props.onSendAgain ? (
        <Button label={t('t_send_files_again')} onPress={props.onSendAgain} />
      ) : null}
    </Block>
  );
}

function Fact(props: { label: string; value: string; testID?: string }) {
  return (
    <View style={s.fact} accessible>
      <Text style={s.factLabel}>{props.label}</Text>
      <Text style={s.factValue} testID={props.testID}>
        {props.value}
      </Text>
    </View>
  );
}

interface Files {
  front?: string;
  back?: string;
  selfie?: string;
}

/** The legacy 3 steps; Next checks the step, Finish submits. */
function KycForm(props: {
  api: ApiClient;
  t: T;
  onSubmitted: (v: Verification) => void;
  onConflict: () => void;
}) {
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
  const [err, setErr] = useState<ApiError>();
  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;
  const needsBack = type !== undefined && type !== 'passport';
  const required = t('t_validator_required');

  const slot = useCallback(
    (key: keyof Files) => (ids: string[], isBusy: boolean) => {
      setFiles((f) => ({ ...f, [key]: ids[0] }));
      setBusy((b) => (b[key] === isBusy ? b : { ...b, [key]: isBusy }));
    },
    [],
  );
  const [onFront] = useState(() => slot('front'));
  const [onBack] = useState(() => slot('back'));
  const [onSelfie] = useState(() => slot('selfie'));

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
    const res = await props.api
      .POST('/kyc', {
        body: {
          documentType: type,
          frontFileId: files.front,
          ...(needsBack && files.back ? { backFileId: files.back } : {}),
          selfieFileId: files.selfie,
        },
      })
      .catch(() => undefined);
    setSending(false);
    if (!res?.data) {
      if (res?.response.status === 409) return props.onConflict();
      return setErr((res?.error as ApiError) ?? { message: t('t_toast_something_went_wrong') });
    }
    props.onSubmitted(res.data);
  }

  const uploading = busy.front || (needsBack && busy.back) || (step === 3 && busy.selfie);
  const info = t('t_verification_allowed_mimes_size');
  const picker = {
    api: props.api,
    t: props.t,
    purpose: 'kyc_document' as const,
    info,
    max: 1,
    maxSizeMb: MAX_MB,
    extensions: EXTENSIONS,
  };

  return (
    <Block title={t('t_verification_center')} testID="kyc-form">
      {general ? <Notice kind="error" text={general} /> : null}
      <View style={step === 1 ? s.step : s.hidden} testID="kyc-step-1">
        <RadioGroup
          label={t('t_choose_document_type')}
          options={(Object.keys(SIDE_LABEL) as DocumentType[]).map((value) => ({
            value,
            label: t(SIDE_LABEL[value].type),
          }))}
          value={type}
          onChange={setType}
          error={missing.type ? required : fields.documentType}
        />
      </View>
      <View style={step === 2 ? s.step : s.hidden} testID="kyc-step-2">
        <ImagePickerField
          {...picker}
          label={t('t_upload_doc_front_side')}
          error={missing.front ? required : fields.frontFileId}
          testID="kyc-front"
          onChange={onFront}
        />
        {needsBack ? (
          <ImagePickerField
            {...picker}
            label={t('t_upload_doc_back_side')}
            error={missing.back ? required : fields.backFileId}
            testID="kyc-back"
            onChange={onBack}
          />
        ) : null}
      </View>
      <View style={step === 3 ? s.step : s.hidden} testID="kyc-step-3">
        <Text style={s.hint}>{t('t_upload_selfie_with_id_msg')}</Text>
        <ImagePickerField
          {...picker}
          camera="front"
          label={t('t_upload_selfie_with_id')}
          error={missing.selfie ? required : fields.selfieFileId}
          testID="kyc-selfie"
          onChange={onSelfie}
        />
      </View>
      <ButtonRow>
        {step !== 1 ? (
          <ButtonCell>
            <SecondaryButton
              label={t('t_back')}
              onPress={() => setStep((n) => (n === 3 ? 2 : 1))}
            />
          </ButtonCell>
        ) : null}
        <ButtonCell>
          {step === 3 ? (
            <Button
              label={t('t_finish')}
              busy={sending}
              disabled={uploading}
              onPress={() => void finish()}
            />
          ) : (
            <Button label={t('t_next_step')} disabled={step === 2 && uploading} onPress={next} />
          )}
        </ButtonCell>
      </ButtonRow>
    </Block>
  );
}

const s = StyleSheet.create({
  step: { gap: theme.space[4] },
  hidden: { display: 'none' },
  hint: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  fact: { gap: theme.space[1] },
  factLabel: { ...theme.text.bodySm, color: theme.colors.text.muted },
  factValue: { ...theme.text.body, color: theme.colors.text.primary },
  subtitle: { ...theme.text.title, color: theme.colors.text.primary },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.space[3],
  },
  fileText: { ...theme.text.bodySm, color: theme.colors.text.primary, flex: 1 },
  fileLabel: { ...theme.text.label },
  link: { ...theme.text.label, color: theme.colors.text.link, textDecorationLine: 'underline' },
});
