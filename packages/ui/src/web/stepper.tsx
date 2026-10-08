'use client';
// Stepper, vertical summary form (docs/05-design/components.md §6.12; gig wizard desktop, screen 03): the blocks
// of a one-page form with their status, a progress bar and an action slot. Each step links to its block. The
// status is written in words in each link's name, never by the icon alone. Tokens only (stepper.css).
import { useId, type ReactNode } from 'react';
import './stepper.css';

export type StepStatus = 'not_started' | 'in_progress' | 'complete' | 'error';

export interface StepItem {
  /** Id of the block element the step links to. */
  id: string;
  label: string;
  status: StepStatus;
  /** Shown after the label, e.g. "(optional)". */
  note?: string;
}

export function Stepper(props: {
  /** Accessible name of the navigation, e.g. "Form progress". */
  label: string;
  steps: StepItem[];
  current?: string;
  statusLabels: Record<StepStatus, string>;
  progress?: { done: number; total: number; text: string };
  onSelect?: (id: string) => void;
  children?: ReactNode;
}) {
  const progressId = useId();
  return (
    <nav className="mt-stepper" aria-label={props.label}>
      <ol className="mt-stepper-list">
        {props.steps.map((step) => (
          <li key={step.id} className="mt-stepper-item" data-status={step.status}>
            <a
              href={`#${step.id}`}
              // Name = label + status in words ("Overview, completed"), so the icon is never the only signal.
              aria-label={`${step.label}${step.note ? ` ${step.note}` : ''}, ${props.statusLabels[step.status]}`}
              aria-current={props.current === step.id ? 'step' : undefined}
              onClick={(e) => {
                if (!props.onSelect) return;
                e.preventDefault();
                props.onSelect(step.id);
              }}
            >
              <StepIcon status={step.status} />
              <span className="mt-stepper-label">
                {step.label}
                {step.note && <span className="mt-stepper-note"> {step.note}</span>}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {props.progress && (
        <div className="mt-stepper-progress">
          <div
            className="mt-progress"
            role="progressbar"
            aria-labelledby={progressId}
            aria-valuemin={0}
            aria-valuemax={props.progress.total}
            aria-valuenow={props.progress.done}
            aria-valuetext={props.progress.text}
          >
            <span
              className="mt-progress-fill"
              style={{
                inlineSize: `${props.progress.total ? (100 * props.progress.done) / props.progress.total : 0}%`,
              }}
            />
          </div>
          <p id={progressId} className="mt-stepper-progress-text">
            {props.progress.text}
          </p>
        </div>
      )}
      {props.children}
    </nav>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  return (
    <svg
      className="mt-stepper-icon"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {status === 'complete' ? (
        <>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path
            d="m6 10.5 2.6 2.5L14 7.5"
            fill="none"
            stroke="var(--mt-bg-surface)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : status === 'error' ? (
        <>
          <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="14.25" r="1.2" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {status === 'in_progress' && <circle cx="10" cy="10" r="4" fill="currentColor" />}
        </>
      )}
    </svg>
  );
}

/**
 * Stepper, compact (§6.12; the phone step mode of a long form, screen 03 "Step 2 / 5 ▰▰▱▱▱"): where the user is and
 * how far it is. The step's own heading stays in the page; this only states the position, in words and as a bar.
 */
export function CompactStepper(props: {
  /** e.g. "Step 2 of 5". */
  text: string;
  /** 0-based. */
  index: number;
  total: number;
}) {
  const textId = useId();
  return (
    <div className="mt-stepper-compact">
      <p id={textId} className="mt-stepper-progress-text">
        {props.text}
      </p>
      <div
        className="mt-progress"
        role="progressbar"
        aria-labelledby={textId}
        aria-valuemin={1}
        aria-valuemax={props.total}
        aria-valuenow={props.index + 1}
      >
        <span
          className="mt-progress-fill"
          style={{ inlineSize: `${(100 * (props.index + 1)) / props.total}%` }}
        />
      </div>
    </div>
  );
}
