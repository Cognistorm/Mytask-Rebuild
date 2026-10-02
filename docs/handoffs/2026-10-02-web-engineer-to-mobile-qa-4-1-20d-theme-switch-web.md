# 4.1.20d Web: theme switch

From: web-engineer · To: mobile-engineer (4.1.24), qa-engineer (4.1.25+), security-reviewer (4.1.27),
orchestrator (4.1.21) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Built the theme part of spec 02 AC-35 (S-105, S-106, Q-059), as `docs/05-design/tokens.md` §2.4 describes. With
this, 4.1.20 is complete.

- **Server-rendered theme, no flash:** the shared `<html>` shell (`components/document.tsx`, both root layouts)
  is now async. It reads:
  - the `mt_theme` cookie (`light` | `dark` | `system`);
  - S-105/S-106 from `getPublicConfig`, through `lib/theme.ts`: cached 60 s per process like the custom code, and
    on failure the fallback is switch ON, light.

  The result goes to `data-theme` (what `tokens.css` keys on) and `data-theme-choice`. If there is no cookie, or
  S-105 is OFF, the page gets the S-106 default (legacy `current_theme()`). A `system` choice is rendered light,
  and a tiny nonce-carrying script, first in `<body>`, switches it to dark before the first paint when the device
  prefers dark. `<html>` has `suppressHydrationWarning` for that reason.
- **Switch:** "Theme" (`t_theme`, NEW) with Light mode / Dark mode / System (`t_light_mode`, `t_dark_mode`,
  `t_system`) is a radio group under the links of the account side card: `/account/settings` and
  `/account/verification`, and the future account pages that use `AccountNav`. Choosing does three things:
  1. applies at once (no reload; legacy reloaded with `?theme=`);
  2. writes the cookie (1 year, `SameSite=Lax`, readable by the page because it is not sensitive);
  3. saves `Me.theme` with `updateMyPreferences`.

  The switch is hidden when S-105 is OFF. The value shown is `Me.theme`, or the S-106 default when null.
- **Account wins:** the dashboard shell compares `Me.theme` with the cookie and corrects the cookie and the page
  when they differ (a choice made on another device, or a cookie left by another account on this browser). Public
  pages follow the cookie.
- **Dark mode check:** I took screenshots of login, account settings (also with the delete dialog), verification,
  edit profile, the public profile and the dashboard shell in dark mode. All colours come from tokens (no
  hard-coded colour in the web CSS), and contrast and borders look right.
  - Logo: the live site's "dark logo" is the same file as the light one (same MD5), so the same wordmark stays.
    Its teal "MY" is weaker on the dark header. A dark/white variant would be an Owner/design decision.
- **Fix:** the side card's styles (`settings.css`, `edit.css`) now load with `AccountNav` itself. On the
  verification page they had been missing, so the links were centred.

## Files created/changed
- `apps/web/src/lib/theme.ts`, `lib/theme-client.ts` (new)
- `apps/web/src/components/document.tsx`, `components/dashboard/shell.tsx` (sync),
  `components/account-settings/account-nav.tsx` (`ThemeSwitch`, CSS imports), `account-settings/settings.css`
- `packages/i18n/en.json`, `ka.json`: **1 NEW key** `t_theme` ("Theme" / "თემა")
- `apps/web/e2e/theme.spec.ts` (new, 7 tests)

Checks: web E2E 108 passed / 3 skipped (two clean runs); repo typecheck + lint 10/10; Prettier; i18n check;
`next build` OK.

## What the next agent must do
- **4.1.21:** the admin portfolio and KYC queues. The admin app stays light only (tokens.md §2.4 allows it at
  launch).
- **Mobile 4.1.24:** add Account → Settings → Theme (Light / Dark / System) with `ThemeProvider`. Read and save
  `Me.theme` with `updateMyPreferences`, hide it when S-105 is OFF (public config `appearance`), and default to
  S-106.
- **QA:** `e2e/theme.spec.ts` covers the default, the server-rendered cookie on private and public pages, system
  dark/light, the switch (at once, cookie, account, next page), account over cookie, S-105 OFF and Georgian.
  - Full stack with `pnpm local`: switch S-106 to dark and S-105 OFF in the admin, then check a guest page within
    60 s.
  - Check dark mode by eye on every page built later.
- **Security 4.1.27:** the inline script is fixed text, runs with the page nonce, and appears only for `system`.
  The cookie holds one of three fixed values; anything else is ignored.

## Open questions / risks
- No Owner question. No contract change.
- **Not built (no header yet):** legacy also had the toggle in the site header, for guests too. Design §6.13 puts
  an icon `ThemeToggle` in the header; it belongs with the header/home task (slice 03/17). Until then guests see
  the S-106 default, or the cookie a signed-in session left.
- **New compared with legacy (design §2.4 allows it):** the "System" choice.
- The shell syncs only on dashboard-shell pages. The slice-01 `/account` page and the auth pages follow the cookie
  as it is.
- One full E2E run during this task had a burst of 30-second timeouts across unrelated specs while I also had a
  hand-started server running. It did not reproduce in two clean runs or in repeated single runs.
