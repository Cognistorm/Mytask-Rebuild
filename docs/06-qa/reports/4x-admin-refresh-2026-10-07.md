# QA report — Phase 4X admin refresh (ROADMAP 4X.9)
Date: 2026-10-07 · QA Engineer (independent; did not build 4X.2–4X.8) · Branch `feat/admin-refresh` @ `3945c1c8`, compared with the pre-4X admin at `1d212651`.
Brief: `docs/05-design/admin-refresh.md`. Legacy reference: `legacy/APP/app/Livewire/Admin/Includes/Sidebar.php` (read-only).

## Verdict: **PASS with notes**
No Blocker or Major findings. Every old link is reachable for exactly the same staff. Behaviour, API calls, texts, keys, test ids and roles are unchanged, apart from the documented 4X changes. The landmark, keyboard and phone requirements in the 4X.9 line are met. There are 4 Minor and 4 Info findings, listed below. All are accessibility or polish follow-ups, and none blocks 4X.10.

## How I tested
| # | What | How | Result |
|---|---|---|---|
| T-1 | Builder's suite | `apps/admin`: `PW_REUSE=1 ADMIN_E2E_LOG=C:\temp\mt4x-local2.log npx playwright test` against the running `pnpm local` stack | **69/69 passed** (1.2 min) |
| T-2 | Typecheck, lint | `pnpm typecheck`, `pnpm lint` in `apps/admin` | clean |
| T-3 | Own probes (8 tests) | My own Playwright spec in the session scratchpad (`scratchpad/qa/probe.qa.ts`, run with `--config scratchpad/qa/pw.config.ts` and `NODE_PATH=apps/admin/node_modules`). Real `owner` login on the live local stack; for permission sets, the real `GET /admin/me` answer is fetched and only `isSuperAdmin`/`permissions` are overridden | 8/8 passed (after fixing two selector bugs in my own probe) |
| T-4 | Code diff | `git diff 1d212651..HEAD -- apps/admin/src` screen by screen; `git diff --stat` on `apps/web`, `apps/mobile`, `apps/api`, `docs/04-api` | other apps and the contract are untouched |
| T-5 | i18n | node script: the 15 `t_settings_area_*` keys + `t_settings_reauth_badge` in both files; key counts before and after | all present in both files |

Parity with the live legacy admin (mytask.ge/admin) was **not** clicked through: that is production with real users, and QA has no staff account there. Parity of the sidebar order was checked against the legacy code instead.

## Results per check

### 1. Every old link reachable, same permissions — PASS
Old top bar (`git show 1d212651:apps/admin/src/components/nav.tsx`) vs the new sidebar (`apps/admin/src/components/shell.tsx:148-201`, account block `:286-303`). I collected every `aside a[href]` (settings areas normalised to `/settings`) and compared it with the old rule for each permission set:

| `/admin/me` permissions | Sidebar routes (new) | = old top bar |
|---|---|---|
| none | /account | MATCH |
| settings.read | /account, /settings | MATCH |
| security.ip_bans | /account, /security | MATCH |
| users.read | /account, /restrictions | MATCH |
| portfolio.moderate | /account, /portfolio | MATCH |
| kyc.review | /account, /kyc | MATCH |
| catalog.write | /account, /categories, /project-categories, /skills | MATCH |
| settings.read + security.ip_bans | /account, /security, /settings | MATCH |
| users.read + kyc.review | /account, /kyc, /restrictions | MATCH |
| users.restrict only | /account | MATCH |
| settings.write only | /account | MATCH |
| all six read/moderate codes | all 9 routes | MATCH |
| Super-admin | all 9 routes | MATCH |

- **Keyboard reachability (Super-admin, 1280 px):** starting on `/account`, for each of the 9 routes I opened the group with Enter on the group button (where the item was collapsed) and followed the link with Enter. All 9 load, and each has its `h1`, exactly one `nav`, exactly one `main` and exactly one `aria-current="page"` item. `/settings` lands on `/settings?area=plans` (the first area), as the brief says. `/login` is reached by Logout (covered by `sidebar.spec.ts` "Logout…", passed) and by signed-out redirects (`shell.spec.ts`, passed).
- **Legacy order:** the legacy `Sidebar.php` order is Dashboard, Users (incl. Verifications :65), Withdrawals, Portfolios (:95), …, Projects (:259, incl. Categories :273), …, Categories (:309), …, Settings (:559). Reduced to the built screens, that is Users → Portfolios → Projects → Categories → Settings, which matches the new top level. Skills under Projects and Banned IPs under Settings are brief §7 choices that the Owner reviews at 4X.11.

### 2. Behaviour unchanged — PASS (notes F-4X9-5, F-4X9-7)
- **API calls:** every screen's calls are unchanged in the diff (`/admin/me` is now made by the shell, as `AdminNav` did before). New: on screens other than Settings, staff with `settings.read` get one extra `GET /admin/settings` per page load to build the area list (`lib/settings-areas.ts:387-396`). This is by design (brief §4) → F-4X9-7 (Info).
- **Per-row Save:** probe clicked Save on an unchanged non-step-up row (`plans.standard.gig_limit`) → `PATCH /api/v1/admin/settings/plans.standard.gig_limit` with `{"value":1,"expectedVersion":1}`, the same body shape as before, then the success notice. Save stays clickable when unchanged (as before).
- **AC-7 re-login:** clicking S-056 opens the card inside the shell (1 nav, 1 main, area `h1` kept). A wrong password shows "პაროლი არასწორია" and the card stays. The right password saves and shows the success notice. The value was restored afterwards. The setting **key** (e.g. `auth.…`) is no longer shown in the subtitle; the register ID and meaning replace it (documented in ROADMAP 4X.7) → F-4X9-5 (Info).
- **Permission handling:** unchanged. Links are hidden without the permission (cosmetic), and the page-level checks (`can('users.restrict')` on restrictions etc.) are untouched in the diff.
- **Texts / keys / data-testids / roles:** the set of `data-testid`/`testId` values is identical before and after (diff empty), and so are the `role=` attribute counts (alert 1, group 2, search 1, switch 2). Changes to the existing E2E tests are additions only: one "open Login and security" step in `shell.spec.ts` and `social-settings.spec.ts`. No assertion was removed or loosened.
- No hard-coded user-facing strings were added. Only `alt="MyTask.ge"` remains, the brand name that existed before. The CSS `content:` values are all `''`.

### 3. Keyboard and screen-reader order — PASS (notes F-4X9-1, F-4X9-2, F-4X9-3, F-4X9-6)
- One `nav` named "ადმინისტრაციის ნავიგაცია" and one `main` on all 9 screens and during the re-login card.
- **Tab order, 1280 px, `/kyc`:** Users group button (`aria-expanded=true`, current group) → Verifications → User restrictions → Portfolios → Projects (button) → Categories → Settings (button) → Change password → Logout → then `main` (status tabs, filters, card). No sidebar stop after the first `main` stop. There is no "skip to content" link: 9 stops before the content with groups collapsed, more when they are open → F-4X9-6 (Info).
- **Tab order, 360 px, drawer closed:** menu button → `main`. The closed drawer is not tabbable (no `ASIDE` stop in 30 Tabs).
- Group buttons carry `aria-expanded` + `aria-controls`; the current group starts open and the others closed (logged per route).
- `aria-current="page"` is on exactly one item on every route once loaded. During loading after client navigation it is on all area items → F-4X9-3.
- **Drawer (360 px):** opening moves focus to Close. Escape closes the drawer and focus returns to the menu button. The scrim closes it with the same focus return. Focus is **not** kept inside the open drawer → F-4X9-2.
- **Re-login card:** takes focus on open (`section.admin-reauth` focused) and again on the second open. After Close, or after a successful save, focus falls to `<body>` → F-4X9-1.
- **Setting control names:** in all 13 areas the API returns (plans 9, payments 6, escrow 6, withdrawals 2, marketplace 10, subscriptions 3, auth 14, moderation 1, media 17, chat 6, notifications 4, content 17, system 4 = **99 rows**), every row control (switch / spinbutton / textbox / combobox) has an accessible name matching `/^S-\d{3} /`. The 5 social provider cards are not rows: each card's switch is named only "ამ პროვაიდერით შესვლა ჩართულია", the same five times. That was already so at `1d212651` → F-4X9-8 (Info).
- **Status tabs:** on `/portfolio` and `/kyc`, `role="group"` named "სტატუსი" holds `button`s with `aria-pressed` true/false. Enter on the last tab sets it pressed and scrolls it into view.

### 4. Phone 360 px — PASS (note F-4X9-4)
- `documentElement.scrollWidth − clientWidth = 0` on all 9 screens, all 13 settings areas and `/login` (23 pages). No element inside `main` sticks out past the viewport, apart from the tab track that scrolls by design.
- The drawer works (see 3).
- **Status tabs:** labels are 14 px, 44 px tall and never clipped inside their button. The track is wider than its box (portfolio 337/292 px, KYC 397/292 px) and scrolls sideways inside itself. On KYC, "უარყოფილია" starts at x = 309 and ends off-screen on load. After choosing it, "მომლოდინე" is cut at the start edge (screenshot made by the probe) → F-4X9-4.

### 5. i18n — PASS
- All 12 new `t_settings_area_*` keys (plans, fees, payments, escrow, withdrawals, marketplace, subscriptions, moderation, media, chat, content, custom_code), the 3 existing ones (auth, notifications, system) and `t_settings_reauth_badge` are present in both `packages/i18n/en.json` and `ka.json` (Georgian values filled, not copies of the English).
- The branch adds 13 keys to each file (en 3057 → 3070, ka 3063 → 3076). The 6-key en/ka gap was there before 4X and is not from this branch.

## Findings
| ID | Severity | Where | Finding (verified) | Expected fix |
|---|---|---|---|---|
| F-4X9-1 | Minor | `apps/admin/src/app/settings/page.tsx:126` (Close), `:81` (after successful re-login) | When the AC-7 re-login card closes (Close, or a successful password + save), it unmounts and focus falls to `<body>` (probe: `document.activeElement` = BODY both times). Keyboard and screen-reader users lose their place in the area list. (Pre-4X the full-page `AuthCard` also dropped focus, but the brief §6 "focus stays visible" and the new in-shell card make returning focus possible now.) | Remember the control that triggered the step (the row's switch / Save) and focus it again after the card closes; after success focus the success notice or the same control. |
| F-4X9-2 | Minor | `apps/admin/src/components/shell.tsx:126-142, 219, 305` | The phone drawer is modal in look (scrim over the content) but not in behaviour. Tab from the last drawer item (Logout) goes on to the menu button and into `main` behind the scrim while the drawer stays open (probe sequence: ASIDE … Logout → HEADER menu → MAIN …). There is no focus trap, `inert` or `aria-modal`. | While open, keep Tab inside the drawer (or set `inert` on `.mt-dashboard-body`), or close the drawer when focus leaves it. |
| F-4X9-3 | Minor | `apps/admin/src/components/shell.tsx:146`, `apps/admin/src/app/settings/page.tsx:88` | After client navigation from another screen to a settings area (the shell already knows the areas), the Settings screen passes `current: undefined` until its own `GET /admin/settings` answers. `isCurrent` then falls back to `path === '/settings'`, so **all 13 area items carry `aria-current="page"`** during the load (probe with a 3 s delayed list: 13 during, 1 ("ჩატი") after). With normal local latency this lasts a few ms; on staging or production it lasts one API round trip. | While the rows are not loaded, derive `current` from the `?area=` query (`areaHref(query)` when it is a known area), or make the fallback match the full href including the query. |
| F-4X9-4 | Minor | `apps/admin/src/components/moderation.tsx:65-118`, `apps/admin/src/components/auth.css:867-883` (`overflow-x: auto` at :876) | At 360 px the status-tab track is wider than its box (KYC 397 vs 292 px), so one status is always partly off-screen. The only hint is the clipped edge (KYC: "უარყოფილია" not fully visible on load; "მომლოდინე" cut after choosing it). The labels themselves are readable. The pre-4X tabs wrapped and showed all statuses. Known choice of 4X.8; for the Owner at 4X.11. | Either let the segments shrink or wrap on phones so all 3 statuses fit (e.g. a smaller gap/padding below 400 px), or add a visible scroll cue (edge fade). Re-check at 360 px. |
| F-4X9-5 | Info | `apps/admin/src/app/settings/page.tsx` re-login card (was `subtitle={registerId · key}` at `1d212651`) | The re-login card no longer shows the setting key (e.g. `auth.…`); it shows the register ID + Georgian meaning. Documented in ROADMAP 4X.7; it reads better for staff. Listed so the Owner sees it at 4X.11. | None unless the Owner wants the key back. |
| F-4X9-6 | Info | `apps/admin/src/components/shell.tsx:217-327` | No "skip to content" link. Landmarks (`nav`, `main`) satisfy WCAG 2.4.1, but sighted keyboard users tab through 9+ sidebar stops on every screen (more with groups open and 13 area items). The pre-4X top bar also had none. | Optional: a visually hidden "skip to content" link first in the shell, focusing `main`. Would need a new key (en + ka). |
| F-4X9-7 | Info | `apps/admin/src/lib/settings-areas.ts:387-396`, `shell.tsx:112-124` | New API call: every non-Settings screen makes one `GET /admin/settings` (full list) per page load for staff with `settings.read`, to build the area items. This is by design (brief §4) and the result is cached in memory. | None now. When the dashboard arrives (slice 16), consider a lighter source of the area list if the full list grows. |
| F-4X9-8 | Info (pre-existing) | `apps/admin/src/app/settings/page.tsx` `SocialProviderRow` (`admin-provider-switch` label) | The 5 social provider switches (S-065…S-069) all have the same accessible name "ამ პროვაიდერით შესვლა ჩართულია", without the register ID or provider. They do not follow the "S-0nn …" naming the other 99 controls use. Same at `1d212651`, so this is not a regression; the E2E tests find them through `data-testid`. | Add the card's register ID + meaning to the switch name (e.g. `aria-labelledby` = `${id}-reg ${id}-meaning` + the enabled label). |

## Not covered / limits
- Contrast and reduced motion were not re-measured independently. I rely on `admin-screens.spec.ts` (axe `color-contrast` 0 at 1280/360, reduced-motion test), which passed in T-1.
- Screen-reader output was checked through the DOM/accessibility tree with Playwright (names, roles, states, focus), not with NVDA/VoiceOver.
- No live legacy admin click-through (production, see above).
- Mobile app: not affected (admin is web-only; `apps/mobile` is unchanged on this branch).

## Appendix — probe spec (scratchpad, not in the repo)
`probe.qa.ts` (8 tests: permission matrix, keyboard reachability + landmarks, Tab order 1280/360, drawer focus, 360 px sideways scroll on 23 pages + status tabs, S-nnn names in every area + per-row Save PATCH, re-login focus/wrong password/success with restore, aria-current during a delayed load). The heart of the permission check:
```ts
const OLD = [['/settings','settings.read'], ['/security','security.ip_bans'], ['/restrictions','users.read'],
  ['/portfolio','portfolio.moderate'], ['/kyc','kyc.review'], ['/categories','catalog.write'],
  ['/project-categories','catalog.write'], ['/skills','catalog.write'], ['/account', null]];
await page.route('**/api/v1/admin/me', async (route) => {
  const res = await route.fetch(); const body = await res.json();
  return route.fulfill({ response: res, json: { ...body, isSuperAdmin: false, permissions: perms } });
});
await page.goto('/account');
const got = [...new Set((await page.locator('aside a[href]').evaluateAll(as => as.map(a => a.getAttribute('href'))))
  .map(h => h.split('?')[0]))].sort();
expect(got).toEqual(OLD.filter(([, p]) => p === null || perms.includes(p)).map(([r]) => r).sort());
```
