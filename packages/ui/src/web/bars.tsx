// BarList (components.md §7.8 bar rows, dataviz "magnitude → bar, one hue"): a ranked list of labels with their count
// and a thin horizontal bar scaled to the largest value. One series, so no legend; the value is printed at the bar's
// end in text colour and the bar itself is decorative, so the list reads the same without it (screen readers, forced
// colours). Server-safe (no state). Styles use design tokens only (bars.css).
import type { ReactNode } from 'react';
import './bars.css';

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  /** The value as shown (grouped digits); defaults to the number. */
  valueText?: string;
  lang?: string;
}

export function BarList(props: { label: string; items: BarItem[]; testId?: string }) {
  const max = Math.max(0, ...props.items.map((i) => i.value));
  return (
    <ul className="mt-bars" aria-label={props.label} data-testid={props.testId}>
      {props.items.map((item) => (
        <li key={item.key} className="mt-bars-row">
          <span className="mt-bars-label" lang={item.lang}>
            {item.label}
          </span>
          <span className="mt-bars-value">{item.valueText ?? item.value}</span>
          <span className="mt-bars-track" aria-hidden="true">
            <span style={{ inlineSize: `${max > 0 ? (item.value / max) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
