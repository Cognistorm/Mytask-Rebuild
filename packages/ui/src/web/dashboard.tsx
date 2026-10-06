'use client';
// Dashboard building blocks (docs/05-design/components.md §6.7 RoleSwitcher, §6.8 DashboardShell + SidebarNav,
// §7.5 StatTile, §7.9 Price, §7.15 InfoButton, §8.5 EmptyState, §8.6 Skeleton). Presentational only: texts
// arrive translated, links are rendered with the app's own link component (Next.js `Link` on the web).
// Styles use design tokens only (dashboard.css).
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { formatMoney } from './money';
import './dashboard.css';

export type DashboardSide = 'buying' | 'selling';

export type LinkComponent = ComponentType<{
  href: string;
  className?: string;
  'aria-current'?: 'page';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  'data-testid'?: string;
  children: ReactNode;
}>;

const PlainLink: LinkComponent = ({ children, ...props }) => <a {...props}>{children}</a>;

const svg = {
  width: 20,
  height: 20,
  viewBox: '0 0 256 256',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Phosphor `ShoppingBag` / `Storefront` (regular), components.md §6.7. */
function RoleIcon({ side }: { side: DashboardSide }) {
  return side === 'buying' ? (
    <svg {...svg} fill="currentColor">
      <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 160H40V56h176v144ZM176 88a48 48 0 0 1-96 0 8 8 0 0 1 16 0 32 32 0 0 0 64 0 8 8 0 0 1 16 0Z" />
    </svg>
  ) : (
    <svg {...svg} fill="currentColor">
      <path d="M232 96a7.89 7.89 0 0 0-.3-2.2l-14.35-50.2A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.8A7.89 7.89 0 0 0 24 96v16a40 40 0 0 0 16 32v64a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16v-64a40 40 0 0 0 16-32ZM54 48h148l11.42 40H42.61Zm50 56h48v8a24 24 0 0 1-48 0Zm-16 0v8a24 24 0 0 1-48 0v-8Zm112 104H56v-56.8a40.57 40.57 0 0 0 8 .8 40 40 0 0 0 32-16 40 40 0 0 0 64 0 40 40 0 0 0 32 16 40.57 40.57 0 0 0 8-.8Zm-8-72a24 24 0 0 1-24-24v-8h48v8a24 24 0 0 1-24 24Z" />
    </svg>
  );
}

/**
 * Buying / Selling switch (spec 02 AC-2): a nav of two links, labels always visible, the current one with
 * `aria-current="page"` and the role colours (audit §3.9).
 */
export function RoleSwitcher(props: {
  label: string;
  current: DashboardSide;
  items: { side: DashboardSide; label: string; href: string; onSelect?: () => void }[];
  Link?: LinkComponent;
}) {
  const Link = props.Link ?? PlainLink;
  return (
    <nav className="mt-role-switcher" aria-label={props.label}>
      {props.items.map((item) => {
        const current = item.side === props.current;
        return (
          <Link
            key={item.side}
            href={item.href}
            className={`mt-role-switcher-item mt-role-${item.side}`}
            aria-current={current ? 'page' : undefined}
            onClick={current ? undefined : item.onSelect}
            data-testid={`switch-${item.side}`}
          >
            <RoleIcon side={item.side} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export interface SidebarItem {
  key: string;
  label: string;
  href: string;
}

/** Sidebar navigation (§6.8): role badge on top, active item = `aria-current` + indicator bar. */
export function SidebarNav(props: {
  label: string;
  side: DashboardSide;
  badge: string;
  items: SidebarItem[];
  activeKey?: string;
  Link?: LinkComponent;
  onNavigate?: () => void;
}) {
  const Link = props.Link ?? PlainLink;
  return (
    <nav className="mt-sidebar-nav" aria-label={props.label}>
      <span className={`mt-role-badge mt-role-${props.side}`}>{props.badge}</span>
      <ul>
        {props.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="mt-sidebar-link"
              aria-current={item.key === props.activeKey ? 'page' : undefined}
              onClick={props.onNavigate}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Dashboard frame (§6.8): fixed 240 px sidebar, 64 px top bar with the switcher in the centre and the account
 * menu on the right. Below `lg` the sidebar becomes a drawer opened from the hamburger.
 */
export function DashboardLayout(props: {
  side: DashboardSide;
  logo: ReactNode;
  sidebar: (close: () => void) => ReactNode;
  switcher: ReactNode;
  accountMenu: ReactNode;
  openMenuLabel: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className={`mt-dashboard mt-role-${props.side}`} data-side={props.side}>
      <aside className="mt-dashboard-sidebar" data-open={open}>
        <div className="mt-dashboard-sidebar-head">
          {props.logo}
          <button type="button" className="mt-dashboard-close" onClick={close}>
            {props.closeLabel}
          </button>
        </div>
        {props.sidebar(close)}
      </aside>
      {open && <div className="mt-dashboard-scrim" onClick={close} aria-hidden="true" />}
      <div className="mt-dashboard-body">
        <header className="mt-dashboard-topbar">
          <button
            type="button"
            className="mt-dashboard-burger"
            aria-label={props.openMenuLabel}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <svg {...svg} fill="currentColor">
              <path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16Zm176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16Z" />
            </svg>
          </button>
          <div className="mt-dashboard-switcher">{props.switcher}</div>
          <div className="mt-dashboard-account">{props.accountMenu}</div>
        </header>
        <main className="mt-dashboard-main">{props.children}</main>
      </div>
    </div>
  );
}

/** Account menu (§6.10 disclosure + list of links): opens on click, Esc and outside click close it. */
export function AccountMenu(props: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);
  return (
    <div className="mt-account-menu" ref={ref}>
      <button
        type="button"
        className="mt-account-menu-trigger"
        aria-label={props.label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {props.trigger}
      </button>
      <div id={id} className="mt-account-menu-panel" hidden={!open} onClick={() => setOpen(false)}>
        {props.children}
      </div>
    </div>
  );
}

export function Price({ money }: { money: { amount: number; currency: string } }) {
  return (
    <span className={`mt-price${money.amount < 0 ? ' mt-price-negative' : ''}`}>
      {formatMoney(money)}
    </span>
  );
}

/** A 44 px info toggle with its explanation in a popover (works on touch and keyboard, §7.15). */
export function InfoButton({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="mt-info">
      <button
        type="button"
        className="mt-info-button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <svg {...svg} fill="currentColor">
          <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm16-40a8 8 0 0 1-8 8 16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16 16 16 0 0 1 16 16v40a8 8 0 0 1 8 8Zm-32-92a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z" />
        </svg>
      </button>
      <span id={id} role="note" className="mt-info-popover" hidden={!open}>
        {children}
      </span>
    </span>
  );
}

/** KPI tile (§7.5): a group named by its label; the label wraps, the value is tabular. */
export function StatTile(props: {
  label: string;
  value: ReactNode;
  info?: ReactNode;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="mt-stat-tile" role="group" aria-labelledby={id} data-testid={props.testId}>
      <div className="mt-stat-tile-head">
        <span id={id} className="mt-stat-tile-label">
          {props.label}
        </span>
        {props.info}
      </div>
      <span className="mt-stat-tile-value">{props.value}</span>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mt-stat-grid">{children}</div>;
}

/** `noData` empty state (§8.5): title, optional message and one action. */
export function EmptyState(props: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="mt-empty">
      <p className="mt-empty-title">{props.title}</p>
      {props.message && <p className="mt-empty-message">{props.message}</p>}
      {props.action}
    </div>
  );
}

/** Loading region (§8.6): one hidden status text, shapes are decorative. */
export function Skeleton(props: { label: string; tiles?: number; rows?: number }) {
  return (
    <div className="mt-skeleton" aria-busy="true">
      <span role="status" className="mt-visually-hidden">
        {props.label}
      </span>
      {props.tiles ? (
        <div className="mt-stat-grid" aria-hidden="true">
          {Array.from({ length: props.tiles }, (_, i) => (
            <div key={i} className="mt-skeleton-box mt-skeleton-tile" />
          ))}
        </div>
      ) : null}
      {Array.from({ length: props.rows ?? 0 }, (_, i) => (
        <div key={i} className="mt-skeleton-box mt-skeleton-row" aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * Table on wide screens, stacked cards below `md` (§7.10): each cell carries its column label for the card
 * layout. Money columns are right-aligned.
 */
export function ResponsiveTable<Row>(props: {
  caption: string;
  columns: { key: string; label: string; numeric?: boolean; render: (row: Row) => ReactNode }[];
  rows: Row[];
  rowKey: (row: Row) => string;
}) {
  return (
    <table className="mt-table">
      <caption className="mt-visually-hidden">{props.caption}</caption>
      <thead>
        <tr>
          {props.columns.map((c) => (
            <th key={c.key} scope="col" data-numeric={c.numeric || undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => (
          <tr key={props.rowKey(row)}>
            {props.columns.map((c) => (
              <td key={c.key} data-label={c.label} data-numeric={c.numeric || undefined}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Titled block of a dashboard page (lists, tables). */
export function Panel(props: { title: string; children: ReactNode; testId?: string }) {
  const id = useId();
  return (
    <section className="mt-panel" aria-labelledby={id} data-testid={props.testId}>
      <h2 id={id} className="mt-panel-title">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}
