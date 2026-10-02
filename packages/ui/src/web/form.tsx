'use client';
// Form building blocks (docs/05-design/components.md: TextField, PasswordInput, Button, Alert, CodeInput).
// Labels are visible, errors are announced (aria-live). Styles use design tokens only (form.css); the
// apps load the token variables. Moved here from apps/web and apps/admin in task 4.1.2.
import { useId, useRef, useState, type ReactNode } from 'react';
import './form.css';

export function Field(props: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  showLabel?: string;
  hideLabel?: string;
  /** Earliest value of a `date` field (`YYYY-MM-DD`). */
  min?: string;
  maxLength?: number;
  placeholder?: string;
  /** Id of a `<datalist>` with suggestions. */
  list?: string;
  /** Help text under the field (linked with aria-describedby). */
  hint?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy =
    [props.hint && `${id}-hint`, props.error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const isPassword = props.type === 'password';
  return (
    <div className="auth-field">
      <label htmlFor={id}>{props.label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          name={props.name}
          type={isPassword && shown ? 'text' : (props.type ?? 'text')}
          autoComplete={props.autoComplete}
          required={props.required}
          min={props.min}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          list={props.list}
          value={props.value}
          aria-invalid={!!props.error}
          aria-describedby={describedBy}
          onChange={(e) => props.onChange(e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-eye"
            aria-pressed={shown}
            aria-label={shown ? props.hideLabel : props.showLabel}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? '◡' : '◉'}
          </button>
        )}
      </div>
      {props.hint && (
        <p id={`${id}-hint`} className="auth-hint">
          {props.hint}
        </p>
      )}
      {props.error && (
        <p id={`${id}-err`} className="auth-error" role="alert">
          {props.error}
        </p>
      )}
    </div>
  );
}

/** Radio group (components.md §5.8): fieldset + visible legend, native radios (arrow keys move the choice). */
export function RadioGroup<V extends string>(props: {
  label: string;
  name: string;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (v: V) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset
      className="auth-radios"
      aria-invalid={!!props.error}
      aria-describedby={props.error ? `${id}-err` : undefined}
    >
      <legend>{props.label}</legend>
      <div className="auth-radios-options">
        {props.options.map((o) => (
          <label key={o.value} className="auth-radio">
            <input
              type="radio"
              name={props.name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      {props.error && (
        <p id={`${id}-err`} className="auth-error" role="alert">
          {props.error}
        </p>
      )}
    </fieldset>
  );
}

export function TextArea(props: {
  label: string;
  name: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="auth-field">
      <label htmlFor={id}>{props.label}</label>
      <textarea
        id={id}
        name={props.name}
        rows={props.rows ?? 5}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        value={props.value}
        aria-invalid={!!props.error}
        aria-describedby={props.error ? `${id}-err` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.error && (
        <p id={`${id}-err`} className="auth-error" role="alert">
          {props.error}
        </p>
      )}
    </div>
  );
}

export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="auth-button" disabled={busy} aria-busy={busy}>
      {children}
    </button>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return (
    <div
      className={`auth-alert auth-alert-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/** 6 boxes, paste fills all, auto-advance, numeric keyboard, one-time-code autofill (components.md CodeInput). */
export function CodeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');
  const set = (i: number, d: string) => {
    const next = digits
      .map((c, j) => (j === i ? d : c))
      .join('')
      .replace(/ /g, '');
    onChange(next.slice(0, 6));
  };
  return (
    <fieldset className="auth-code" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`${label} ${i + 1}`}
          maxLength={1}
          value={d.trim()}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (text) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, 5)]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            set(i, v || ' ');
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
        />
      ))}
    </fieldset>
  );
}
