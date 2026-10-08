'use client';
// Tabs (components.md §6.6) and Accordion (§7.13). Tabs follow the WAI-ARIA pattern with matching ids, Arrow/Home/End
// keys and automatic activation (light panels). `stack` = the gig page rule "tabs as sections" (spec 04, screen 02):
// below lg the tab bar is hidden and every panel shows with its heading; the switch is CSS only, so the server HTML
// is right for every width. Texts arrive translated; styles use design tokens only (tabs.css).
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SiteIcon } from './site';
import './tabs.css';

export interface TabItem {
  /** Stable id: the tab is `{id}-tab`, the panel `{id}-panel`. */
  id: string;
  label: string;
  /** Optional count badge ("Reviews 12"). */
  badge?: number;
  content: ReactNode;
}

export function Tabs(props: {
  label: string;
  items: TabItem[];
  /** Below lg: no tab bar, the panels stacked with headings. */
  stack?: boolean;
  testId?: string;
}) {
  const [active, setActive] = useState(props.items[0]?.id);
  const list = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = props.items.length;
    const to =
      e.key === 'ArrowRight'
        ? (i + 1) % n
        : e.key === 'ArrowLeft'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    setActive(props.items[to]!.id);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus();
  };

  return (
    <div className={`mt-tabs${props.stack ? ' mt-tabs-stack' : ''}`} data-testid={props.testId}>
      <div className="mt-tabs-list" role="tablist" aria-label={props.label} ref={list}>
        {props.items.map((item, i) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${item.id}-tab`}
              aria-controls={`${item.id}-panel`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="mt-tabs-tab"
              onClick={() => setActive(item.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {item.label}
              {item.badge !== undefined && <span className="mt-tabs-badge">{item.badge}</span>}
            </button>
          );
        })}
      </div>
      {props.items.map((item) => (
        <section
          key={item.id}
          role="tabpanel"
          id={`${item.id}-panel`}
          aria-labelledby={`${item.id}-tab`}
          className="mt-tabs-panel"
          data-active={item.id === active}
          tabIndex={0}
        >
          {/* The section heading on phones; read but not shown beside the tab bar. */}
          <h2 className="mt-tabs-heading">{item.label}</h2>
          {item.content}
        </section>
      ))}
    </div>
  );
}

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

/** Disclosure rows (§7.13): several may be open; the caret turns (not under reduced motion). */
export function Accordion(props: { items: AccordionItem[]; lang?: string; testId?: string }) {
  const base = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <div className="mt-accordion" data-testid={props.testId}>
      {props.items.map((item) => {
        const expanded = open.has(item.id);
        const panel = `${base}-${item.id}`;
        return (
          <div key={item.id} className="mt-accordion-item">
            <h3 className="mt-accordion-heading">
              <button
                type="button"
                className="mt-accordion-button"
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => toggle(item.id)}
              >
                <span lang={props.lang}>{item.title}</span>
                <SiteIcon name="caret" />
              </button>
            </h3>
            <div id={panel} className="mt-accordion-panel" hidden={!expanded} lang={props.lang}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
