'use client';
// Public site header (ROADMAP 4.2.9a; design 01-home.md; spec 03 AC-2, AC-22, spec 00 AC-11): logo, pill search
// with the category menu, theme toggle, Explore menu, Login/Join or the account menu, and the category bar with
// "More ▾" and the mega-menu. Below lg: hamburger → drawer (auth, Gigs/Projects, category accordion with search,
// language, theme) and a search icon that opens a full-width search field. Cart, bell, Subscription and the
// invite banner join with their slices (5, 14, 9). Links into the private zone are plain <a> (full page load,
// ADR-019 §2).
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@mytask/i18n';
import {
  AccountMenu,
  Avatar,
  CategoryAccordion,
  CategoryBar,
  MenuButton,
  NavDrawer,
  SiteIcon,
  type NavNode,
} from '@mytask/ui/web';
import { localePath } from '../../lib/category-nav';
import { href, useApi, useT } from '../../lib/client';
import type { PublicConfig, Viewer } from '../../lib/site-data';
import type { ThemeChoice } from '../../lib/theme';
import { applyTheme } from '../../lib/theme-client';
import { dashboardHome } from '../dashboard/nav';

export interface HeaderProps {
  locale: Locale;
  categories: NavNode[];
  viewer: Viewer | null;
  mayHaveSession: boolean;
  config: PublicConfig | null;
  /** The theme the server rendered (cookie or S-106). */
  theme: ThemeChoice;
}

export function SiteHeaderClient(props: HeaderProps) {
  const { locale, categories, config } = props;
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const viewer = props.viewer;
  const [drawer, setDrawer] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState(false);
  const phoneInput = useRef<HTMLInputElement>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const projectsOn = config?.projects.enabled ?? false;
  const themeOn = config?.appearance.themeSwitcherEnabled ?? true;
  const languageOn = config?.i18n.languageSwitcherEnabled ?? true;

  // Rendered without an access cookie, but this browser signed in before (the token may just have expired):
  // one getMe lets the browser client refresh the session; when that works the server renders the page again
  // as the signed-in visitor (header account menu, owner views). Guests cost one 401. One place for every public
  // page (was the profile pages' own SessionRefresh, 4.1.23).
  const tried = useRef(false);
  useEffect(() => {
    if (!props.mayHaveSession || tried.current) return;
    tried.current = true;
    void api.GET('/me').then(
      (res) => {
        if (res.data) router.refresh();
      },
      () => undefined,
    );
  }, [api, router, props.mayHaveSession]);

  useEffect(() => {
    if (phoneSearch) phoneInput.current?.focus();
  }, [phoneSearch]);

  // On the results page the header field shows the keyword searched for.
  const pathname = usePathname();
  const desktopInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const q = /\/search$/.test(pathname ?? '')
      ? (new URLSearchParams(window.location.search).get('q') ?? '')
      : '';
    for (const input of [desktopInput.current, phoneInput.current]) if (input) input.value = q;
  }, [pathname, phoneSearch]);

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    window.location.reload();
  }

  const searchAction = href(locale, '/search');
  const searchField = (id: string, ref?: React.Ref<HTMLInputElement>) => (
    <>
      <label htmlFor={id} className="mt-visually-hidden">
        {t('t_search')}
      </label>
      <input
        id={id}
        ref={ref}
        type="search"
        name="q"
        maxLength={100}
        placeholder={t('t_what_service_are_u_looking_for_today')}
        autoComplete="off"
      />
      <button type="submit" className="mt-icon-button" aria-label={t('t_search')}>
        <SiteIcon name="search" />
      </button>
    </>
  );

  const explore = [
    { key: 'gigs', label: t('t_gigs'), href: href(locale, '/search') },
    ...(projectsOn
      ? [{ key: 'projects', label: t('t_projects'), href: href(locale, '/explore/projects') }]
      : []),
  ];

  const accountLinks = viewer
    ? [
        {
          key: 'dashboard',
          label: t('t_dashboard'),
          href: href(locale, dashboardHome(viewer.lastDashboard, config ?? undefined)),
        },
        {
          key: 'profile',
          label: t('t_view_profile'),
          href: href(locale, `/profile/${viewer.username}`),
        },
        {
          key: 'settings',
          label: t('t_account_settings'),
          href: href(locale, '/account/settings'),
        },
      ]
    : [];

  return (
    <header className="mt-site-header" data-testid="site-header">
      <div className="mt-site-header-row">
        <button
          type="button"
          className="mt-icon-button mt-site-phone"
          aria-label={t('t_ui_open_menu')}
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
          data-testid="open-drawer"
        >
          <SiteIcon name="menu" size={24} />
        </button>
        <Link href={href(locale, '/')} className="mt-site-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
        </Link>

        <form className="mt-site-search" role="search" action={searchAction} method="get">
          {categories.length > 0 && (
            <MenuButton label={t('t_categories')} testId="search-categories">
              {(close) =>
                categories.map((c) => (
                  <Link key={c.id} href={c.href} onClick={close}>
                    {c.label}
                  </Link>
                ))
              }
            </MenuButton>
          )}
          {searchField('site-search', desktopInput)}
        </form>

        <div className="mt-site-actions">
          <button
            type="button"
            className="mt-icon-button mt-site-phone"
            aria-label={t('t_search')}
            aria-expanded={phoneSearch}
            onClick={() => setPhoneSearch((v) => !v)}
            data-testid="open-phone-search"
          >
            <SiteIcon name={phoneSearch ? 'close' : 'search'} />
          </button>
          {themeOn && <ThemeToggle {...props} loggedIn={viewer !== null} />}
          <div className="mt-site-desktop">
            <MenuButton label={t('t_explore')} align="end" testId="explore-menu">
              {(close) =>
                explore.map((e) => (
                  <a key={e.key} href={e.href} onClick={close}>
                    {e.label}
                  </a>
                ))
              }
            </MenuButton>
          </div>
          {viewer ? (
            <AccountMenu
              label={t('t_account_menu')}
              trigger={
                // ADR-019 §5 (security review 08 SEC-78): session-recording code (S-110) never sees who is signed in.
                <span
                  className="mt-site-account-trigger"
                  data-testid="header-account"
                  data-clarity-mask="true"
                >
                  <Avatar image={viewer.avatar} name={viewer.username} size="md" />
                  <span className="mt-site-desktop">{viewer.username}</span>
                </span>
              }
            >
              {accountLinks.map((l) => (
                <a key={l.key} href={l.href}>
                  {l.label}
                </a>
              ))}
              <button type="button" onClick={() => void logout()}>
                {t('t_logout')}
              </button>
            </AccountMenu>
          ) : (
            <div className="mt-site-desktop">
              <a className="mt-site-link" href={href(locale, '/auth/login')}>
                {t('t_login')}
              </a>
              <a className="mt-site-join" href={href(locale, '/auth/register')}>
                {t('t_join')}
              </a>
            </div>
          )}
        </div>
      </div>

      {phoneSearch && (
        <form
          className="mt-site-search mt-site-search-full"
          role="search"
          action={searchAction}
          method="get"
          data-testid="phone-search"
        >
          {searchField('site-search-phone', phoneInput)}
        </form>
      )}

      {categories.length > 0 && (
        <CategoryBar
          label={t('t_categories')}
          moreLabel={t('t_more')}
          browseLabel={(category) => t('t_browse_parent_category', { category })}
          items={categories}
          Link={Link}
        />
      )}

      <NavDrawer
        open={drawer}
        onClose={closeDrawer}
        label={t('t_ui_open_menu')}
        closeLabel={t('t_ui_close')}
      >
        <div className="mt-drawer-section">
          {viewer ? (
            <>
              <p className="mt-site-account-trigger" data-clarity-mask="true">
                <Avatar image={viewer.avatar} name={viewer.username} size="md" />
                <strong>{viewer.username}</strong>
              </p>
              {accountLinks.map((l) => (
                <a key={l.key} className="mt-site-link" href={l.href}>
                  {l.label}
                </a>
              ))}
              <button type="button" className="mt-menu-button" onClick={() => void logout()}>
                {t('t_logout')}
              </button>
            </>
          ) : (
            <div className="mt-drawer-auth">
              <a className="mt-site-join" href={href(locale, '/auth/register')}>
                {t('t_join')}
              </a>
              <a className="mt-site-link" href={href(locale, '/auth/login')}>
                {t('t_login')}
              </a>
            </div>
          )}
        </div>
        <nav className="mt-drawer-section" aria-label={t('t_explore')}>
          {explore.map((e) => (
            <a key={e.key} className="mt-site-link" href={e.href} onClick={closeDrawer}>
              {e.label}
            </a>
          ))}
        </nav>
        {categories.length > 0 && (
          <div className="mt-drawer-section">
            <CategoryAccordion
              items={categories}
              searchLabel={t('t_search_categories')}
              emptyLabel={t('no_results_found')}
              browseLabel={(category) => t('t_browse_parent_category', { category })}
              Link={Link}
              onNavigate={closeDrawer}
            />
          </div>
        )}
        {languageOn && (
          <div className="mt-drawer-section">
            <LanguageLinks locale={locale} label={t('t_language')} t={t} />
          </div>
        )}
      </NavDrawer>
    </header>
  );
}

/** Light ↔ dark in one click (legacy header toggle); the account settings keep Light / Dark / System. */
function ThemeToggle(props: HeaderProps & { loggedIn: boolean }) {
  const t = useT(props.locale);
  const api = useApi(props.locale);
  const [dark, setDark] = useState(props.theme === 'dark');
  // A `system` choice is resolved in the browser before the first paint (lib/theme.ts).
  useEffect(() => setDark(document.documentElement.dataset.theme === 'dark'), []);
  function toggle() {
    const next: ThemeChoice = dark ? 'light' : 'dark';
    applyTheme(next, props.config?.appearance.defaultTheme ?? 'light');
    setDark(!dark);
    if (props.loggedIn) void api.PATCH('/me/preferences', { body: { theme: next } });
  }
  return (
    <button
      type="button"
      className="mt-icon-button"
      aria-label={t(dark ? 't_light_mode' : 't_dark_mode')}
      onClick={toggle}
      data-testid="theme-toggle"
    >
      <SiteIcon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

/** ქართ. / English: the same page in the other language (query kept); full page load. */
export function LanguageLinks(props: {
  locale: Locale;
  label: string;
  t: (key: string) => string;
}) {
  const pathname = usePathname() ?? '/';
  const keepQuery = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = e.currentTarget.pathname + window.location.search;
  };
  return (
    <nav className="mt-language-switch" aria-label={props.label} data-testid="language-switch">
      {(['ka', 'en'] as const).map((l) => (
        <a
          key={l}
          href={localePath(pathname, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === props.locale ? 'true' : undefined}
          onClick={keepQuery}
        >
          {props.t(l)}
        </a>
      ))}
    </nav>
  );
}
