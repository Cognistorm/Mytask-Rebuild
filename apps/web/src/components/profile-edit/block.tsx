'use client';
// One block of the edit-profile page (spec 02 AC-15: each part saves on its own and shows its own message;
// legacy `account/profile/profile.blade.php` section cards: title, one-line hint, action on the right).
import { useCallback, useId, useState, type ReactNode } from 'react';
import { Alert } from '@mytask/ui/web';
import { splitErrors, type ApiErrorBody } from '../../lib/client';

export function Block(props: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  const id = useId();
  return (
    <section className="mt-edit-block" aria-labelledby={id} data-testid={props.testId}>
      <div className="mt-edit-block-head">
        <div>
          <h2 id={id} className="mt-edit-block-title">
            {props.title}
          </h2>
          {props.hint && <p className="mt-edit-block-hint">{props.hint}</p>}
        </div>
        {props.action}
      </div>
      <div className="mt-edit-block-body">{props.children}</div>
    </section>
  );
}

/** Saving state of one block: busy flag, the success text and the API error (field errors + general text). */
export function useBlockState() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string>();
  const [err, setErr] = useState<ApiErrorBody>();
  const start = useCallback(() => {
    setBusy(true);
    setOk(undefined);
    setErr(undefined);
  }, []);
  const done = useCallback((result: { ok?: string; err?: ApiErrorBody }) => {
    setBusy(false);
    setOk(result.ok);
    setErr(result.err);
  }, []);
  const reset = useCallback(() => {
    setOk(undefined);
    setErr(undefined);
  }, []);
  return { busy, ok, err, ...splitErrors(err), start, done, reset };
}

/** The block's success message or its general error (field errors sit under their fields). */
export function BlockMessage({ ok, general }: { ok?: string; general?: string }) {
  if (ok) return <Alert kind="success">{ok}</Alert>;
  if (general) return <Alert kind="error">{general}</Alert>;
  return null;
}

/** Small text button with a pencil (legacy "Edit" / "Set availability" links in the block head). */
export function EditButton(props: {
  label: string;
  onClick: () => void;
  testId?: string;
  /** Accessible name when the visible label alone is not enough ("Edit" → "Edit headline"). */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className="mt-edit-link"
      onClick={props.onClick}
      aria-label={props.ariaLabel}
      data-testid={props.testId}
    >
      <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="m227.31 73.37-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63ZM92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68 147.31 64l24-24L216 84.68Z" />
      </svg>
      {props.label}
    </button>
  );
}
