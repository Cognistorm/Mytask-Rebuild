'use client';
// Shared pieces of the catalogue screens (spec 16 AC-60, AC-61; ROADMAP 4.2.13): a Georgian + English field pair,
// the category image picker (staff upload `category_image` through adminCreateFileUpload, then the file id goes
// into the save), a checkbox, and the error helpers. Texts in Georgian (staff UI language until slice 16).
import { useState } from 'react';
import type { components } from '@mytask/types';
import { declaredType, uploadFile } from '@mytask/api-client';
import { Field, TextArea } from '@mytask/ui/web';
import { t, useAdminApi, type ApiErrorBody } from '../lib/client';

type ImageVariants = components['schemas']['ImageVariants'];
export type Localized = { ka: string; en: string | null };

/** Both languages of one text; `ka` required by the API, `en` optional. Labels "· ka" / "· en". */
export function LangPair(props: {
  label: string;
  name: string;
  value: { ka: string; en: string };
  onChange: (v: { ka: string; en: string }) => void;
  errors: Record<string, string>;
  multiline?: boolean;
  rows?: number;
}) {
  const one = (lang: 'ka' | 'en') => {
    const common = {
      label: `${props.label} · ${lang}`,
      name: `${props.name}.${lang}`,
      value: props.value[lang],
      onChange: (v: string) => props.onChange({ ...props.value, [lang]: v }),
      error: props.errors[`${props.name}.${lang}`],
    };
    return props.multiline ? (
      <TextArea key={lang} {...common} rows={props.rows ?? 4} />
    ) : (
      <Field key={lang} {...common} />
    );
  };
  return (
    <div className="admin-lang-pair">
      {one('ka')}
      {one('en')}
    </div>
  );
}

/** Form value of a stored localized text (null → empty fields). */
export const formText = (v: Localized | null | undefined) => ({ ka: v?.ka ?? '', en: v?.en ?? '' });
/** Save value: trimmed, empty English → null; both empty → null for optional texts. */
export function saveText(v: { ka: string; en: string }, optional: true): Localized | null;
export function saveText(v: { ka: string; en: string }, optional?: false): Localized;
export function saveText(v: { ka: string; en: string }, optional = false): Localized | null {
  const ka = v.ka.trim();
  const en = v.en.trim() || null;
  if (optional && !ka && !en) return null;
  return { ka, en };
}

export function Checkbox(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="admin-checkbox">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

/**
 * Category icon / image: the current picture, "Remove", or a file input that uploads at once and reports the
 * new file id (`undefined` = unchanged, `null` = removed). Upload errors are shown under the field.
 */
export function ImagePicker(props: {
  label: string;
  current: ImageVariants | null;
  value: string | null | undefined;
  onChange: (fileId: string | null | undefined) => void;
  error?: string;
  testId?: string;
}) {
  const api = useAdminApi();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState<string>();
  const shown = props.value === null ? null : (preview ?? props.current?.thumb ?? null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setFailed(undefined);
    const res = await uploadFile(
      api,
      {
        purpose: 'category_image',
        fileName: file.name,
        sizeBytes: file.size,
        contentType: declaredType(file.type),
        body: file,
      },
      { staff: true },
    );
    setBusy(false);
    if (res.error) return setFailed(res.error.message ?? t('t_toast_something_went_wrong'));
    if (res.file.status !== 'ready') {
      return setFailed(res.file.rejectReason ?? t('t_toast_something_went_wrong'));
    }
    setPreview(URL.createObjectURL(file));
    props.onChange(res.file.id);
  }

  const error = failed ?? props.error;
  return (
    <div className="auth-field admin-image" data-testid={props.testId}>
      <span>{props.label}</span>
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element -- media host thumbnail
        <img src={shown} alt="" />
      )}
      <div className="admin-row-edit">
        <input
          type="file"
          accept="image/png,image/jpeg"
          aria-label={props.label}
          disabled={busy}
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        {shown && (
          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              setPreview(null);
              props.onChange(null);
            }}
          >
            {t('t_remove')}
          </button>
        )}
      </div>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** The general message of an API error, plus the 409 in-use counts in words when the API sent them. */
export function errorText(err: ApiErrorBody | undefined): string | undefined {
  return err?.message;
}
