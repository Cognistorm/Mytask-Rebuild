'use client';
// Public site shell building blocks (docs/05-design/components.md Header, MegaMenu, NavDrawer, Menu, Accordion;
// screen 01-home.md; spec 03 AC-2, AC-22). Presentational only: texts arrive translated, links are rendered with
// the app's link component. Menus open on click / Enter / Space (never hover only, audit §3.1), close on Escape
// and outside click, and return the focus to their button. Styles use design tokens only (site.css).
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { categoryThemeProps } from './category';
import type { LinkComponent } from './dashboard';
import './site.css';

const PlainLink: LinkComponent = ({ children, ...props }) => <a {...props}>{children}</a>;

// ------------------------------------------------------------------ icons (Phosphor regular, 256 grid)

const ICONS = {
  menu: 'M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16Zm176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16Z',
  search:
    'm229.66 218.34-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32ZM40 112a72 72 0 1 1 72 72 72.08 72.08 0 0 1-72-72Z',
  caret:
    'm213.66 101.66-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z',
  close:
    'M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z',
  moon: 'M233.54 142.23a8 8 0 0 0-8-2 88.08 88.08 0 0 1-109.8-109.8 8 8 0 0 0-10-10 104.84 104.84 0 0 0-52.91 37A104 104 0 0 0 136 224a103.09 103.09 0 0 0 62.52-20.88 104.84 104.84 0 0 0 37-52.91 8 8 0 0 0-1.98-7.98Zm-44.64 48.11A88 88 0 0 1 65.66 67.11a89 89 0 0 1 31.4-26A106 106 0 0 0 96 56a104.11 104.11 0 0 0 104 104 106 106 0 0 0 14.92-1.06 89 89 0 0 1-26.02 31.4Z',
  sun: 'M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0Zm72 88a64 64 0 1 1-64-64 64.07 64.07 0 0 1 64 64Zm-16 0a48 48 0 1 0-48 48 48.05 48.05 0 0 0 48-48ZM58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32Zm0 116.68-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32ZM192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72Zm5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32ZM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8Zm80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8Zm112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16Z',
  images:
    'M216 40H72a16 16 0 0 0-16 16v16H40a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16ZM72 56h144v62.75l-10.07-10.06a16 16 0 0 0-22.63 0l-20 20-44-44a16 16 0 0 0-22.62 0L72 109.37ZM184 200H40V88h16v80a16 16 0 0 0 16 16h112Zm32-32H72v-36l36-36 49.66 49.66a8 8 0 0 0 11.31 0L194.63 120 216 141.38V168Zm-56-84a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z',
  briefcase:
    'M216 56h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V72a16 16 0 0 0-16-16ZM96 48a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm120 24v41.61A184 184 0 0 1 128 136a184.07 184.07 0 0 1-88-22.38V72Zm0 128H40v-68.36A200.19 200.19 0 0 0 128 152a200.25 200.25 0 0 0 88-20.37V200Zm-112-88a8 8 0 0 1 8-8h32a8 8 0 0 1 0 16h-32a8 8 0 0 1-8-8Z',
} as const;

export type SiteIconName = keyof typeof ICONS;

export function SiteIcon({ name, size = 20 }: { name: SiteIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// ------------------------------------------------------------------ shared popover behaviour

/** Escape and outside click close; Escape returns the focus to the button. */
function useDismiss(
  open: boolean,
  close: () => void,
  root: React.RefObject<HTMLElement | null>,
  button: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      button.current?.focus();
    };
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, close, root, button]);
}

/** A button with a dropdown panel (Explore menu, "More ▾", the search pill's category list). */
export function MenuButton(props: {
  label: ReactNode;
  /** Accessible name when `label` is an icon. */
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  align?: 'start' | 'end';
  testId?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root, button);
  return (
    <div className={`mt-menu ${props.className ?? ''}`} ref={root}>
      <button
        ref={button}
        type="button"
        className="mt-menu-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={props.ariaLabel}
        data-testid={props.testId}
        onClick={() => setOpen((v) => !v)}
      >
        {props.label}
        <SiteIcon name="caret" size={14} />
      </button>
      <div
        id={id}
        className={`mt-menu-panel mt-menu-${props.align ?? 'start'} ${props.panelClassName ?? ''}`}
        hidden={!open}
      >
        {open && props.children(close)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ category tree

/** Space kept for the "More ▾" button (its label is one short word in both languages). */
const MORE_WIDTH = 120;

export interface NavNode {
  id: string;
  label: string;
  href: string;
  children: NavNode[];
  /** The API's resolved category colour (`#RRGGBB`, ADR-023); null → brand teal. Painted on the top level only. */
  color?: string | null;
}

/**
 * The header's second row (spec 03 AC-2): top-level categories; items that do not fit go into "More ▾" (never
 * truncated, 01-home.md "Georgian length"). Clicking a category (or Enter/Space on it) opens its panel with the
 * sub-categories and their child categories; pointer hover opens it too. Each item is a pill in its category colour
 * (visual-refresh.md §8.4); `currentId` (the category whose pages are shown) gets the filled look.
 */
export function CategoryBar(props: {
  label: string;
  moreLabel: string;
  browseLabel: (category: string) => string;
  items: NavNode[];
  currentId?: string | null;
  Link?: LinkComponent;
}) {
  const Link = props.Link ?? PlainLink;
  const [openId, setOpenId] = useState<string | null>(null);
  const [visible, setVisible] = useState(props.items.length);
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const widths = useRef<number[]>([]);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const close = useCallback(() => setOpenId(null), []);
  const openButton = useMemo(
    () => ({
      get current() {
        return openId ? (buttons.current.get(openId) ?? null) : null;
      },
    }),
    [openId],
  );
  useDismiss(openId !== null, close, root, openButton);

  // Measure every item once (all rendered), then keep as many as fit next to "More".
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    widths.current = Array.from(ul.children, (li) => (li as HTMLElement).offsetWidth);
    const fit = () => {
      const total = widths.current.length;
      const avail = ul.clientWidth;
      // The pills sit `gap` apart (3X.10): one gap after every item but the last shown, and one before "More".
      const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
      let n = total;
      let used = widths.current.reduce((a, b) => a + b, 0);
      // Room for the "More ▾" button whenever at least one item moves into it.
      while (n > 0 && used + gap * (n - 1) + (n < total ? MORE_WIDTH + gap : 0) > avail) {
        n -= 1;
        used -= widths.current[n]!;
      }
      setVisible(n);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [props.items]);

  const shown = props.items.slice(0, visible);
  const hidden = props.items.slice(visible);
  const open = props.items.find((i) => i.id === openId);

  return (
    <nav
      className="mt-category-bar"
      aria-label={props.label}
      ref={root}
      onMouseLeave={() => setOpenId(null)}
    >
      <ul className="mt-category-bar-list" ref={list}>
        {shown.map((item) => (
          <li
            key={item.id}
            {...categoryThemeProps(item.color)}
            onMouseEnter={() => item.children.length && setOpenId(item.id)}
          >
            {item.children.length ? (
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(item.id, el);
                }}
                className="mt-category-bar-item"
                data-current={item.id === props.currentId ? '' : undefined}
                aria-expanded={openId === item.id}
                onClick={() => setOpenId((v) => (v === item.id ? null : item.id))}
              >
                <span className="mt-cat-dot" aria-hidden="true" />
                {item.label}
              </button>
            ) : (
              <Link
                href={item.href}
                className="mt-category-bar-item"
                data-current={item.id === props.currentId ? '' : undefined}
              >
                <span className="mt-cat-dot" aria-hidden="true" />
                {item.label}
              </Link>
            )}
          </li>
        ))}
        {hidden.length > 0 && (
          <li onMouseEnter={() => setOpenId(null)}>
            <MenuButton label={props.moreLabel} align="end" testId="category-more">
              {(closeMore) =>
                hidden.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={closeMore}
                    className="mt-category-more-item"
                    {...categoryThemeProps(item.color)}
                  >
                    <span className="mt-cat-dot" aria-hidden="true" />
                    {item.label}
                  </Link>
                ))
              }
            </MenuButton>
          </li>
        )}
      </ul>
      {open && (
        <div className="mt-mega-menu" data-testid="mega-menu" {...categoryThemeProps(open.color)}>
          <Link href={open.href} className="mt-mega-menu-browse" onClick={close}>
            {props.browseLabel(open.label)}
          </Link>
          <div className="mt-mega-menu-columns">
            {open.children.map((sub) => (
              <div key={sub.id} className="mt-mega-menu-group">
                <Link href={sub.href} className="mt-mega-menu-heading" onClick={close}>
                  {sub.label}
                </Link>
                {sub.children.length > 0 && (
                  <ul>
                    {sub.children.map((child) => (
                      <li key={child.id}>
                        <Link href={child.href} onClick={close}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

/** The phone menu's category tree (spec 03 AC-2 "accordion in the menu") with a filter box (audit §3.1). */
export function CategoryAccordion(props: {
  items: NavNode[];
  searchLabel: string;
  emptyLabel: string;
  browseLabel: (category: string) => string;
  Link?: LinkComponent;
  onNavigate?: () => void;
}) {
  const Link = props.Link ?? PlainLink;
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase();
  // A node stays when its name or any name below it matches; matching branches open by themselves.
  const filter = useCallback(
    (nodes: NavNode[]): NavNode[] =>
      nodes.flatMap((n) => {
        if (!q || n.label.toLocaleLowerCase().includes(q)) return [n];
        const children = filter(n.children);
        return children.length ? [{ ...n, children }] : [];
      }),
    [q],
  );
  const items = useMemo(() => filter(props.items), [filter, props.items]);
  // Top-level rows carry their category colour (dot, start-edge bar when open; visual-refresh.md §8.4).
  const theme = (n: NavNode, depth: number) => (depth === 1 ? categoryThemeProps(n.color) : {});
  const dot = (depth: number) =>
    depth === 1 ? <span className="mt-cat-dot" aria-hidden="true" /> : null;
  const render = (nodes: NavNode[], depth: number): ReactNode => (
    <ul className={`mt-accordion-level mt-accordion-level-${depth}`}>
      {nodes.map((n) =>
        n.children.length ? (
          <li key={n.id} {...theme(n, depth)}>
            <details open={q !== ''}>
              <summary>
                <span className="mt-accordion-label">
                  {dot(depth)}
                  {n.label}
                </span>
                <SiteIcon name="caret" size={14} />
              </summary>
              <Link href={n.href} className="mt-accordion-browse" onClick={props.onNavigate}>
                {props.browseLabel(n.label)}
              </Link>
              {render(n.children, depth + 1)}
            </details>
          </li>
        ) : (
          <li key={n.id} {...theme(n, depth)}>
            <Link href={n.href} onClick={props.onNavigate}>
              <span className="mt-accordion-label">
                {dot(depth)}
                {n.label}
              </span>
            </Link>
          </li>
        ),
      )}
    </ul>
  );
  return (
    <div className="mt-accordion" data-testid="category-accordion">
      <label className="mt-accordion-search">
        <span className="mt-visually-hidden">{props.searchLabel}</span>
        <SiteIcon name="search" size={16} />
        <input
          type="search"
          value={query}
          placeholder={props.searchLabel}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {items.length ? render(items, 1) : <p className="mt-accordion-empty">{props.emptyLabel}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ drawer

/**
 * Slide-over menu from the start edge (NavDrawer): modal, focus moves into it and back to the opener, Escape and
 * the scrim close it, the page behind does not scroll.
 */
export function NavDrawer(props: {
  open: boolean;
  onClose: () => void;
  label: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const { open, onClose } = props;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button, a, input')?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep Tab inside the drawer.
      const items = Array.from(
        panel.current.querySelectorAll<HTMLElement>('a, button, input, summary'),
      ).filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      opener?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mt-drawer-root">
      <div className="mt-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="mt-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        ref={panel}
        data-testid="nav-drawer"
      >
        <button
          type="button"
          className="mt-icon-button mt-drawer-close"
          aria-label={props.closeLabel}
          onClick={onClose}
        >
          <SiteIcon name="close" />
        </button>
        {props.children}
      </div>
    </div>
  );
}
