'use client';
// Profile building blocks (docs/05-design/components.md §7.7 Avatar + OnlineStatus, §7.8 RatingStars +
// RatingSummary, §5.14 Chip, §7.6 Pill, §8.1 Dialog, §7.4 "More/Less" of About me). Presentational only: texts
// arrive translated, links are rendered with the app's own link component. Styles use design tokens only
// (profile.css).
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { LinkComponent } from './dashboard';
import './profile.css';

const PlainLink: LinkComponent = ({ children, ...props }) => <a {...props}>{children}</a>;

export interface AvatarImage {
  thumb: string;
  medium: string;
}

/**
 * Round avatar (§7.7): the image, or the first letter of the name on `bg.brandSoft` when there is none or it
 * fails to load. `online` adds the status dot; the status itself is always given as text by the caller.
 */
export function Avatar(props: {
  image: AvatarImage | null;
  name: string;
  size: 'md' | 'lg' | 'xl';
  online?: boolean;
  /** Empty when the name is shown next to the avatar (decorative image). */
  alt?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = props.image ? (props.size === 'md' ? props.image.thumb : props.image.medium) : null;
  return (
    <span className={`mt-avatar mt-avatar-${props.size}`}>
      {src && !broken ? (
        <img src={src} alt={props.alt ?? ''} onError={() => setBroken(true)} />
      ) : (
        <span className="mt-avatar-initial" aria-hidden="true">
          {[...props.name.trim()][0]?.toUpperCase() ?? '?'}
        </span>
      )}
      {props.online !== undefined && (
        <span className="mt-avatar-dot" data-online={props.online} aria-hidden="true" />
      )}
    </span>
  );
}

/** Online / offline as text with its dot (§7.7: never colour only). */
export function OnlineStatus(props: { online: boolean; label: string }) {
  return (
    <span className="mt-online" data-online={props.online}>
      <span className="mt-online-dot" aria-hidden="true" />
      {props.label}
    </span>
  );
}

const STAR =
  'M234.29 114.85l-45 38.83L203 211.75a16.4 16.4 0 0 1-24.5 17.82L128 198.49l-50.53 31.08A16.4 16.4 0 0 1 53 211.75l13.76-58.07-45-38.83A16.46 16.46 0 0 1 31.08 86l59-4.76 22.76-55.08a16.36 16.36 0 0 1 30.27 0l22.75 55.08 59 4.76a16.46 16.46 0 0 1 9.37 28.86Z';

/** Five stars for an average in tenths (43 = 4.3); the graphic is hidden, `label` names the rating. */
export function RatingStars(props: { tenths: number; label: string }) {
  const id = useId();
  return (
    <span className="mt-stars" role="img" aria-label={props.label}>
      {[0, 1, 2, 3, 4].map((i) => {
        // Share of this star that is filled, in percent (0, partial or 100).
        const fill = Math.max(0, Math.min(10, props.tenths - i * 10)) * 10;
        return (
          <svg key={i} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={`${id}-${i}`}>
                <stop offset={`${fill}%`} stopColor="var(--mt-rating-star)" />
                <stop offset={`${fill}%`} stopColor="var(--mt-rating-star-empty)" />
              </linearGradient>
            </defs>
            <path d={STAR} fill={`url(#${id}-${i})`} />
          </svg>
        );
      })}
    </span>
  );
}

export interface RatingBlockData {
  count: number;
  averageTenths: number | null;
  starCounts: { five: number; four: number; three: number; two: number; one: number };
}

/**
 * One rating block (§7.8 RatingSummary): big average, stars, "based on N reviews" and the 5→1 breakdown; with
 * no reviews only the quiet empty text.
 */
export function RatingSummary(props: {
  title: string;
  data: RatingBlockData;
  labels: {
    empty: string;
    outOf5: string;
    /** "Rating 4.3 out of 5, 12 reviews" (the stars' accessible name) */
    stars: string;
    basedOn: string;
    /** "5 stars" … "1 star" */
    rows: [string, string, string, string, string];
  };
  testId?: string;
}) {
  const id = useId();
  const { data, labels } = props;
  const average = data.averageTenths === null ? null : (data.averageTenths / 10).toFixed(1);
  const counts = [
    data.starCounts.five,
    data.starCounts.four,
    data.starCounts.three,
    data.starCounts.two,
    data.starCounts.one,
  ];
  return (
    <section className="mt-rating" aria-labelledby={id} data-testid={props.testId}>
      <h3 id={id} className="mt-rating-title">
        {props.title}
      </h3>
      {data.count === 0 || average === null ? (
        <p className="mt-rating-empty">{labels.empty}</p>
      ) : (
        <>
          <p className="mt-rating-head">
            <span className="mt-rating-average">{average}</span>
            <span className="mt-rating-out-of">{labels.outOf5}</span>
          </p>
          <RatingStars tenths={data.averageTenths ?? 0} label={labels.stars} />
          <p className="mt-rating-based">{labels.basedOn}</p>
          <ul className="mt-rating-rows">
            {counts.map((n, i) => (
              <li key={i}>
                <span className="mt-rating-row-label">{labels.rows[i]}</span>
                <span className="mt-rating-bar" aria-hidden="true">
                  <span style={{ inlineSize: `${data.count ? (n / data.count) * 100 : 0}%` }} />
                </span>
                <span className="mt-rating-row-count">{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Link chip (§5.14 `link` variant): skills on the profile → `/hire/{slug}`. */
export function ChipLink(props: {
  href: string;
  children: ReactNode;
  title?: string;
  Link?: LinkComponent;
}) {
  const L = props.Link ?? PlainLink;
  return (
    <L className="mt-chip" href={props.href}>
      {props.title ? <span title={props.title}>{props.children}</span> : props.children}
    </L>
  );
}

/** Status pill (§7.6): the text is always visible, the tone only supports it. */
export function Pill(props: {
  tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  testId?: string;
}) {
  return (
    <span className={`mt-pill mt-pill-${props.tone}`} data-testid={props.testId}>
      {props.children}
    </span>
  );
}

/**
 * Long text folded to a few lines with a More/Less toggle (About me, spec 02 AC-18). The toggle only appears
 * when the text is actually cut.
 */
export function ExpandableText(props: { text: string; more: string; less: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  const id = useId();
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setCut(el.scrollHeight > el.clientHeight + 1);
  }, [props.text, open]);
  return (
    <div className="mt-expandable">
      <p id={id} ref={ref} className="mt-expandable-text" data-open={open}>
        {props.text}
      </p>
      {(cut || open) && (
        <button
          type="button"
          className="mt-link-button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? props.less : props.more}
        </button>
      )}
    </div>
  );
}

/**
 * Modal dialog (§8.1) on the native `<dialog>`: focus is kept inside, the page behind is inert, Esc and the
 * close button close it, and focus returns to the trigger.
 */
export function Dialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  testId?: string;
  /** `full`: the whole viewport (lightbox, §8.1 sizes); default `md`. */
  size?: 'md' | 'full';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (props.open && !el.open) el.showModal();
    if (!props.open && el.open) el.close();
  }, [props.open]);
  return (
    <dialog
      ref={ref}
      className={props.size === 'full' ? 'mt-dialog mt-dialog-full' : 'mt-dialog'}
      aria-labelledby={titleId}
      aria-describedby={props.description ? descId : undefined}
      onClose={props.onClose}
      onClick={(e) => {
        // A click on the backdrop (the dialog box itself, outside its content) closes it.
        if (e.target === e.currentTarget) props.onClose();
      }}
      data-testid={props.testId}
    >
      <div className="mt-dialog-body">
        <div className="mt-dialog-head">
          <h2 id={titleId} className="mt-dialog-title">
            {props.title}
          </h2>
          <button
            type="button"
            className="mt-dialog-close"
            aria-label={props.closeLabel}
            onClick={props.onClose}
          >
            <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" fill="currentColor">
              <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
            </svg>
          </button>
        </div>
        {props.description && (
          <p id={descId} className="mt-dialog-description">
            {props.description}
          </p>
        )}
        {props.children}
      </div>
    </dialog>
  );
}
