'use client';
// Shared pieces of the catalogue screens (spec 16 AC-60, AC-61; ROADMAP 4.2.13): a Georgian + English field pair,
// the category image picker (staff upload `category_image` through adminCreateFileUpload, then the file id goes
// into the save), a checkbox, the category colour picker / dot / inherited line (3X.15, ADR-023), and the error
// helpers. Texts in Georgian (staff UI language until slice 16).
import { useId, useState, type CSSProperties } from 'react';
import type { components } from '@mytask/types';
import { declaredType, uploadFile } from '@mytask/api-client';
import {
  categoryStarter,
  deriveCategoryColor,
  findDuplicate,
  findReserved,
  findSimilar,
  normalizeCategoryColor,
  type CategoryColorMode,
} from '@mytask/tokens/color';
import { categoryThemeProps, Field, TextArea } from '@mytask/ui/web';
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

/** A category's colour dot (its indicator shade for the current theme; `null` → brand teal). Decorative. */
export function ColorDot({ color }: { color: string | null | undefined }) {
  return <span {...categoryThemeProps(color)} className="mt-cat-dot" aria-hidden="true" />;
}

/** Sub-category and project category forms: "Colour inherited from {top-level category}", or the brand fallback. */
export function ColorInherited(props: { from: { name: string; color: string | null } | null }) {
  return (
    <p className="admin-color-inherited" data-testid="color-inherited">
      <ColorDot color={props.from?.color} />
      {props.from
        ? t('t_category_color_inherited', { category: props.from.name })
        : t('t_category_color_none')}
    </p>
  );
}

/** What the colour form needs from the other top-level categories. */
export interface ColorHolder {
  id: string;
  name: string;
  color: string | null;
}

/** Client-side checks of a typed colour (ADR-023 §6): format, exact duplicate (blocks), similar + reserved (warn). */
export function checkColor(value: string, others: readonly ColorHolder[]) {
  const hex = normalizeCategoryColor(value);
  if (!hex) return { hex: null, error: t('t_category_color_invalid'), warnings: [] as string[] };
  const taken = findDuplicate(hex, others);
  const warnings = [
    ...findSimilar(hex, others).map((o) => t('t_category_color_similar', { category: o.name })),
    ...[...new Set(findReserved(hex).map((r) => r.meaning))].map((meaning) =>
      t('t_category_color_reserved', { meaning: t(`t_category_color_meaning_${meaning}`) }),
    ),
  ];
  return {
    hex,
    error: taken ? t('t_category_color_taken', { category: taken.name }) : undefined,
    warnings,
  };
}

/** The --mt-cat-* set of one mode, set inline so a light and a dark panel can sit side by side. */
function previewVars(hex: string, mode: CategoryColorMode): CSSProperties {
  const c = deriveCategoryColor(hex)[mode];
  return {
    '--mt-cat-solid': c.solid,
    '--mt-cat-on-solid': c.onSolid,
    '--mt-cat-gradient-start': c.gradientStart,
    '--mt-cat-gradient-end': c.gradientEnd,
    '--mt-cat-tint': c.tint,
    '--mt-cat-tint-strong': c.tintStrong,
    '--mt-cat-ink': c.ink,
    '--mt-cat-indicator': c.indicator,
    '--mt-cat-glow': c.glow,
  } as CSSProperties;
}

/**
 * Top-level category colour (spec 3X R-1.8, visual-refresh.md §9): a native colour input and a `#RRGGBB` field kept
 * in sync (upper-cased on blur), the 12 starter swatches (one used by another category is crossed out and cannot
 * be chosen), live messages (duplicate = error, similar / reserved = warnings) and a light + dark preview of the
 * header pill at rest and on hover, a tile label band and a breadcrumb chip with the category's name.
 */
export function ColorPicker(props: {
  value: string;
  onChange: (v: string) => void;
  others: readonly ColorHolder[];
  name: string;
  /** The API's message for `color` (format, level or 409 duplicate). */
  error?: string;
  /** The form was submitted: show a format error even if the field was never left. */
  submitted: boolean;
}) {
  const id = useId();
  const [blurred, setBlurred] = useState(false);
  const check = checkColor(props.value, props.others);
  const formatError = check.hex ? undefined : blurred || props.submitted ? check.error : undefined;
  const error = (check.hex ? check.error : formatError) ?? props.error;
  const usedBy = new Map(
    props.others.flatMap((o) => (o.color ? [[o.color.toUpperCase(), o.name] as const] : [])),
  );
  return (
    <div className="auth-field admin-color" data-testid="color-picker">
      <label htmlFor={id}>{t('t_category_color')}</label>
      <div className="admin-color-inputs">
        <input
          type="color"
          aria-label={t('t_category_color')}
          value={(check.hex ?? '#000000').toLowerCase()}
          onChange={(e) => props.onChange(e.target.value.toUpperCase())}
        />
        <input
          id={id}
          name="color"
          className="admin-color-hex"
          value={props.value}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          placeholder="#7C3AED"
          aria-invalid={!!error}
          aria-describedby={`${id}-hint ${id}-msgs`}
          onChange={(e) => props.onChange(e.target.value.trim())}
          onBlur={() => {
            setBlurred(true);
            props.onChange(props.value.trim().toUpperCase());
          }}
        />
      </div>
      <p id={`${id}-hint`} className="auth-hint">
        {t('t_category_color_help')}
      </p>
      <div
        className="admin-color-swatches"
        role="group"
        aria-label={t('t_category_color_suggested')}
      >
        {categoryStarter.map((s) => {
          const holder = usedBy.get(s.color);
          const label = holder ? t('t_category_color_used_by', { category: holder }) : s.color;
          return (
            <button
              key={s.id}
              type="button"
              className="admin-color-swatch"
              style={{ background: s.color }}
              aria-label={label}
              title={label}
              aria-pressed={check.hex === s.color}
              disabled={!!holder}
              onClick={() => props.onChange(s.color)}
            />
          );
        })}
      </div>
      <div id={`${id}-msgs`} className="admin-color-messages" aria-live="polite">
        {error && <p className="auth-error">{error}</p>}
        {check.hex &&
          check.warnings.map((w) => (
            <p key={w} className="admin-color-warning">
              {w}
            </p>
          ))}
      </div>
      {check.hex && (
        <div className="admin-color-preview" data-testid="color-preview">
          <span className="admin-color-preview-title">{t('t_category_color_preview')}</span>
          {(['light', 'dark'] as const).map((mode) => (
            <div
              key={mode}
              className="admin-color-mode"
              data-theme={mode}
              style={previewVars(check.hex!, mode)}
            >
              <span className="admin-color-mode-name">
                {t(mode === 'light' ? 't_light' : 't_dark')}
              </span>
              <span className="admin-color-pill">
                <span className="mt-cat-dot" aria-hidden="true" />
                {props.name}
              </span>
              <span className="admin-color-pill admin-color-pill-on">
                <span className="mt-cat-dot" aria-hidden="true" />
                {props.name}
              </span>
              <span className="admin-color-band">{props.name}</span>
              <span className="admin-color-crumb">{props.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The general message of an API error, plus the 409 in-use counts in words when the API sent them. */
export function errorText(err: ApiErrorBody | undefined): string | undefined {
  return err?.message;
}
