'use client';
// Admin frame (docs/05-design/admin-refresh.md §3, task 4X.2): fixed left sidebar with the sections grouped in the
// legacy order (legacy/APP/app/Livewire/Admin/Includes/Sidebar.php), the screen on the right. Below 1024 px the
// sidebar is a drawer opened from the top bar. Links are hidden when the permission is missing (cosmetic, AC-9).
// Built on the shared dashboard frame classes (@mytask/ui/web dashboard.css, components.md §6.8).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { components } from '@mytask/types';
import { t, useAdminApi } from '../lib/client';

type Me = components['schemas']['AdminMe'];
type Permission = Me['permissions'][number];

const svg = {
  width: 20,
  height: 20,
  viewBox: '0 0 256 256',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Phosphor regular icons (components.md: Phosphor), as the legacy sidebar used. */
const ICONS = {
  users:
    'M117.25 157.92a60 60 0 1 0-66.5 0 95.83 95.83 0 0 0-47.22 37.71 8 8 0 1 0 13.4 8.74 80 80 0 0 1 134.14 0 8 8 0 0 0 13.4-8.74 95.83 95.83 0 0 0-47.22-37.71ZM40 108a44 44 0 1 1 44 44 44.05 44.05 0 0 1-44-44Zm210.14 98.7a8 8 0 0 1-11.07-2.33A79.83 79.83 0 0 0 172 168a8 8 0 0 1 0-16 44 44 0 1 0-16.34-84.87 8 8 0 1 1-5.94-14.85 60 60 0 0 1 55.53 105.64 95.83 95.83 0 0 1 47.22 37.71 8 8 0 0 1-2.33 11.07Z',
  paintBrush:
    'M232 32a8 8 0 0 0-8-8c-44.08 0-89.31 49.71-114.43 82.63A60 60 0 0 0 32 164c0 30.88-19.54 44.73-20.47 45.37A8 8 0 0 0 16 224h76a60 60 0 0 0 57.37-77.57C182.3 121.31 232 76.08 232 32ZM92 208H34.63C41.38 198.41 48 183.92 48 164a44 44 0 1 1 44 44Zm32.42-94.45q5.14-6.66 10.09-12.55A76.23 76.23 0 0 1 155 121.49q-5.9 4.94-12.55 10.09a60.54 60.54 0 0 0-18.03-18.03Zm42.7-2.68a92.57 92.57 0 0 0-22-22c31.78-34.53 55.75-45 69.9-47.91-2.85 14.21-13.37 38.18-47.9 69.91Z',
  briefcase:
    'M216 56h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V72a16 16 0 0 0-16-16ZM40 112h176v48H40ZM96 48a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm120 24v24H40V72Zm0 128H40v-24h176v24Z',
  listDashes:
    'M88 64a8 8 0 0 1 8-8h120a8 8 0 0 1 0 16H96a8 8 0 0 1-8-8Zm128 56H96a8 8 0 0 0 0 16h120a8 8 0 0 0 0-16Zm0 64H96a8 8 0 0 0 0 16h120a8 8 0 0 0 0-16ZM56 56H40a8 8 0 0 0 0 16h16a8 8 0 0 0 0-16Zm0 64H40a8 8 0 0 0 0 16h16a8 8 0 0 0 0-16Zm0 64H40a8 8 0 0 0 0 16h16a8 8 0 0 0 0-16Z',
  gear: 'M128 80a48 48 0 1 0 48 48 48.05 48.05 0 0 0-48-48Zm0 80a32 32 0 1 1 32-32 32 32 0 0 1-32 32Zm88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06 107.21 107.21 0 0 0-10.88-26.25 8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6 107.71 107.71 0 0 0-26.25-10.87 8 8 0 0 0-7.06 1.49L130.16 40q-2.16-.06-4.32 0L107.2 25.11a8 8 0 0 0-7.06-1.48 107.6 107.6 0 0 0-26.25 10.88 8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94 107.71 107.71 0 0 0-10.87 26.25 8 8 0 0 0 1.49 7.06L40 125.84q-.06 2.16 0 4.32L25.11 148.8a8 8 0 0 0-1.48 7.06 107.21 107.21 0 0 0 10.88 26.25 8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6 107.71 107.71 0 0 0 26.25 10.87 8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48 107.21 107.21 0 0 0 26.25-10.88 8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3L215.46 186a8 8 0 0 0 6-3.94 107.71 107.71 0 0 0 10.87-26.25 8 8 0 0 0-1.49-7.06Zm-16.1-6.5a73.93 73.93 0 0 1 0 8.68 8 8 0 0 0 1.74 5.48l14.19 17.73a91.57 91.57 0 0 1-6.23 15L187 173.11a8 8 0 0 0-5.1 2.64 74.11 74.11 0 0 1-6.14 6.14 8 8 0 0 0-2.64 5.1l-2.51 22.58a91.32 91.32 0 0 1-15 6.23l-17.74-14.19a8 8 0 0 0-5-1.75h-.48a73.93 73.93 0 0 1-8.68 0 8 8 0 0 0-5.48 1.74l-17.78 14.2a91.57 91.57 0 0 1-15-6.23L82.89 187a8 8 0 0 0-2.64-5.1 74.11 74.11 0 0 1-6.14-6.14 8 8 0 0 0-5.1-2.64l-22.58-2.52a91.32 91.32 0 0 1-6.23-15l14.19-17.74a8 8 0 0 0 1.74-5.48 73.93 73.93 0 0 1 0-8.68 8 8 0 0 0-1.74-5.48L40.2 100.45a91.57 91.57 0 0 1 6.23-15L69 82.89a8 8 0 0 0 5.1-2.64 74.11 74.11 0 0 1 6.14-6.14A8 8 0 0 0 82.89 69l2.51-22.57a91.32 91.32 0 0 1 15-6.23l17.74 14.19a8 8 0 0 0 5.48 1.74 73.93 73.93 0 0 1 8.68 0 8 8 0 0 0 5.48-1.74l17.77-14.19a91.57 91.57 0 0 1 15 6.23L173.11 69a8 8 0 0 0 2.64 5.1 74.11 74.11 0 0 1 6.14 6.14 8 8 0 0 0 5.1 2.64l22.58 2.51a91.32 91.32 0 0 1 6.23 15l-14.19 17.74a8 8 0 0 0-1.74 5.53Z',
  key: 'M216.57 39.43a80 80 0 0 0-132.66 81.35L28.69 176A15.86 15.86 0 0 0 24 187.31V216a16 16 0 0 0 16 16h32a8 8 0 0 0 8-8v-16h16a8 8 0 0 0 8-8v-16h16a8 8 0 0 0 5.66-2.34l9.56-9.57A79.73 79.73 0 0 0 160 176h.1a80 80 0 0 0 56.47-136.57ZM224 98.1c-1.09 34.09-29.75 61.86-63.89 61.9H160a63.7 63.7 0 0 1-23.65-4.51 8 8 0 0 0-8.84 1.68L116.69 168H96a8 8 0 0 0-8 8v16H72a8 8 0 0 0-8 8v16H40v-28.69l58.83-58.82a8 8 0 0 0 1.68-8.84A63.72 63.72 0 0 1 96 95.92c0-34.14 27.81-62.8 61.9-63.89A64 64 0 0 1 224 98.1ZM192 76a12 12 0 1 1-12-12 12 12 0 0 1 12 12Z',
  signOut:
    'M120 216a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16H56v160h56a8 8 0 0 1 8 8Zm109.66-93.66-40-40a8 8 0 0 0-11.32 11.32L204.69 120H112a8 8 0 0 0 0 16h92.69l-26.35 26.34a8 8 0 0 0 11.32 11.32l40-40a8 8 0 0 0 0-11.32Z',
  caretDown:
    'M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z',
  list: 'M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16Zm176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16Z',
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg {...svg} className="admin-icon">
      <path d={ICONS[name]} />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  show: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: keyof typeof ICONS;
  items: NavItem[];
}

/** The screen's group: its link's path is the current path (query strings are not part of a route here). */
const isCurrent = (path: string, href: string) => path === href.split('?')[0];

export function AdminShell({ onMe, children }: { onMe?: (me: Me) => void; children: ReactNode }) {
  const api = useAdminApi();
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me>();
  const [drawer, setDrawer] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const navId = useId();

  useEffect(() => {
    void api.GET('/admin/me').then((res) => {
      if (res.error) return router.replace('/login');
      setMe(res.data);
      onMe?.(res.data);
    });
    // Load once per page.
  }, []);

  // The drawer (below 1024 px): Escape closes it; focus moves into it and back to the menu button.
  useEffect(() => {
    if (!drawer) return;
    // Next frame: the drawer is still `visibility: hidden` (not focusable) until its open style applies.
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [drawer]);

  function closeDrawer() {
    setDrawer(false);
    burgerRef.current?.focus();
  }

  const can = (p: Permission) => !!me && (me.isSuperAdmin || me.permissions.includes(p));
  // Legacy sidebar order (admin-refresh.md §3); later slices add their screens in the same order.
  const groups: NavGroup[] = [
    {
      key: 'users',
      label: t('t_users'),
      icon: 'users',
      items: [
        { href: '/kyc', label: t('t_verifications'), show: can('kyc.review') },
        { href: '/restrictions', label: t('t_user_restrictions'), show: can('users.read') },
      ],
    },
    {
      key: 'portfolios',
      label: t('t_portfolios'),
      icon: 'paintBrush',
      items: [{ href: '/portfolio', label: t('t_portfolios'), show: can('portfolio.moderate') }],
    },
    {
      key: 'projects',
      label: t('t_projects'),
      icon: 'briefcase',
      items: [
        {
          href: '/project-categories',
          label: t('t_project_categories'),
          show: can('catalog.write'),
        },
        { href: '/skills', label: t('t_skills'), show: can('catalog.write') },
      ],
    },
    {
      key: 'categories',
      label: t('t_categories'),
      icon: 'listDashes',
      items: [{ href: '/categories', label: t('t_categories'), show: can('catalog.write') }],
    },
    {
      key: 'settings',
      label: t('t_settings'),
      icon: 'gear',
      items: [
        { href: '/settings', label: t('t_settings'), show: can('settings.read') },
        { href: '/security', label: t('t_banned_ips'), show: can('security.ip_bans') },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }) as NavGroup)
    .filter((g) => g.items.length > 0);

  const currentGroup = groups.find((g) => g.items.some((i) => isCurrent(path, i.href)));
  const isOpen = (g: NavGroup) => openGroups[g.key] ?? g === currentGroup;

  async function logout() {
    await api.POST('/admin/auth/logout');
    router.replace('/login');
  }

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset
    <img src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
  );

  return (
    <div className="mt-dashboard admin-shell">
      <aside className="mt-dashboard-sidebar admin-sidebar" data-open={drawer}>
        <div className="mt-dashboard-sidebar-head">
          <span className="admin-brand">
            {logo}
            <span className="admin-brand-label">{t('t_dashboard')}</span>
          </span>
          <button ref={closeRef} type="button" className="mt-dashboard-close" onClick={closeDrawer}>
            {t('t_ui_close')}
          </button>
        </div>
        <nav aria-label={t('t_admin_navigation')} className="mt-sidebar-nav admin-sidebar-nav">
          <ul>
            {groups.map((g) => {
              // A group with one (permitted) item is a plain link: no expand step.
              if (g.items.length === 1) {
                const item = g.items[0]!;
                return (
                  <li key={g.key}>
                    <Link
                      href={item.href}
                      className="mt-sidebar-link admin-sidebar-top"
                      aria-current={isCurrent(path, item.href) ? 'page' : undefined}
                      onClick={() => setDrawer(false)}
                    >
                      <Icon name={g.icon} />
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const listId = `${navId}-${g.key}`;
              const open = isOpen(g);
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    className="mt-sidebar-link admin-sidebar-top admin-sidebar-group"
                    aria-expanded={open}
                    aria-controls={listId}
                    data-current={g === currentGroup || undefined}
                    onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !open }))}
                  >
                    <Icon name={g.icon} />
                    <span className="admin-sidebar-group-label">{g.label}</span>
                    <span className="admin-caret">
                      <Icon name="caretDown" />
                    </span>
                  </button>
                  <ul id={listId} className="admin-sidebar-sub" hidden={!open}>
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="mt-sidebar-link"
                          aria-current={isCurrent(path, item.href) ? 'page' : undefined}
                          onClick={() => setDrawer(false)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
        {me && (
          <div className="admin-sidebar-account">
            <span className="admin-sidebar-name">{me.fullName}</span>
            <Link
              href="/account"
              className="mt-sidebar-link admin-sidebar-top"
              aria-current={path === '/account' ? 'page' : undefined}
              onClick={() => setDrawer(false)}
            >
              <Icon name="key" />
              {t('t_change_password')}
            </Link>
            <button type="button" className="mt-sidebar-link admin-sidebar-top" onClick={logout}>
              <Icon name="signOut" />
              {t('t_logout')}
            </button>
          </div>
        )}
      </aside>
      {drawer && <div className="mt-dashboard-scrim" onClick={closeDrawer} aria-hidden="true" />}
      <div className="mt-dashboard-body">
        <header className="mt-dashboard-topbar admin-topbar">
          <button
            ref={burgerRef}
            type="button"
            className="mt-dashboard-burger"
            aria-label={t('t_ui_open_menu')}
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Icon name="list" />
          </button>
          <span className="admin-brand">{logo}</span>
        </header>
        <main className="admin-page">
          {currentGroup && currentGroup.items.length > 1 && (
            <p className="admin-eyebrow">{currentGroup.label}</p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
