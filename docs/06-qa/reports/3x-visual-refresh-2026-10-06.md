# QA report: 3X — Visual refresh
Date: 2026-10-06 | QA: ROADMAP 3X.19 (independent; did not write the 3X code) | Branch: `feat/visual-refresh` @ `3ccfede1` (no product change after it)
Judged against spec `docs/02-specs/3x-visual-refresh.md` (R-1…R-4, AC-1…AC-16, "must not change"), `docs/05-design/visual-refresh.md` (approved look), ADR-023, the 3X.18a–d results and the build before 3X (`main` 61c4e777, worktree `../mt-pre3x`). Security check of the colour input: 3X.20 (next).

## Verdict: **PASS with notes** — 2 new minor findings, 1 carried minor finding, 1 open Owner question; no major bug
- **Nothing moved.** On 18 screens × 2 widths the accessibility tree is the same as before 3X, apart from the one change the Owner asked for (3X.10a: a category name in the bar is now a link). No element is gone, no test id is gone and no reading order flipped (§2).
- Size changes come from the approved look (title band, breadcrumb chips, bar pills with dots, hero under the header) — with one exception: **F-3X19-1**, skill chips now wrap onto a second row on about a third of the freelancer cards.
- **R-1…R-4 are met** (§3). Exception: **F-3X19-2**, on the app two fades stay long under Reduce Motion.
- Every automated suite is green, run again by QA (§1). Contrast: 0 failures (tokens, axe, measured). Keyboard focus is visible on every stop (§4).
- **Carried:** F-3X18-1 (the theme switch is slower on home, 24 → 88 ms, still "good"). **Open:** Q-179 (switcher thumb colour).
- For 3X.21: fix F-3X19-1 and F-3X19-2; F-3X18-1 needs an Owner/Designer choice. Re-check after.

## Findings
| ID | Severity | Area | What | Suggested fix (3X.21) |
|---|---|---|---|---|
| **F-3X19-1** | minor | parity: "what shows at each size" | `.mt-chip` got a 1 px border (3X.9c), so each chip is 2 px wider. The skill chips on freelancer cards now wrap onto a second row on **13 of 40 cards** on `/sellers` (at 1280 and at 360 px), 1 of 3 on `/hire/logo-design`, and 1 of 2 best-seller cards on the home page at 1280 px. Each of those cards is 44 px taller, so the `/sellers` list is 572 px longer on a phone. On `/explore/projects` at 360 px the "Popular:" chips (new dot + border, +18 px) push "Design" onto a second row. | Take the border out of the inline padding (`padding-inline: calc(var(--mt-space-3) - var(--mt-border-width-default))`), so a chip is as wide as before. For the explore chips, accept the dot (design §8.4) or tighten their gap; Designer's call. Re-run `apps/web/e2e/qa/structure-parity.qa.ts`. |
| **F-3X19-2** | minor | reduced motion (app) | Under iOS/Android Reduce Motion, two fades keep their full length: the alert fade-in M-15 (`fadeIn`, 200 ms, `ReduceMotion.Never`, `apps/mobile/src/ui/motion.ts:79`) and the success glow M-14 (200 ms in + 600 ms out, `apps/mobile/src/ui/card.tsx:30-37`). Spec R-4.3 allows only fades ≤ 120 ms. The web caps both through the reduced-motion token block (M-15 120 ms; M-14 2 × 120 ms). | Use `motion.duration.fast` (120 ms) for these fades when `useReducedMotion()` is on (the web's M-14 total of 240 ms is two 120 ms steps; mirror that). |
| F-3X18-1 | minor (carried from 3X.18d) | INP | The Dark-mode switch on home costs 88 ms instead of 24 ms (CPU 4× slower; still under 200 ms "good"). | Owner/Designer: accept, one-frame transition suppression, or lighter surface styles (`docs/06-qa/perf/3x-lighthouse-2026-10-06.md`). |
| Q-179 | Owner question (open) | look | Buying/Selling switcher thumb: role colours (built, Q-092) or brand teal (design §6.2). | Owner, at the latest in the 3X.23 click-through. |

## 1. Automated suites (run again by QA, fresh builds)
| # | Command | Result |
|---|---|---|
| A-1 | `pnpm turbo run lint typecheck test --force` | **PASS** 26/26 tasks, 0 cached. API 635 passed + 6 skipped (44 files + 1 skipped); `category-colors.test.ts` 20/20 in it; api-client 9/9; tokens 18/18 (AC-5 sweep); i18n OK (en 3057, ka 3063 keys; the 6 extra ka keys are the known ones from slice 02) |
| A-2 | `pnpm gen:check` | **PASS** (contract 1.4.0, no drift) |
| A-3 | `pnpm format:check` | **PASS** |
| A-4 | `pnpm --filter @mytask/tokens check` (`contrast.mjs`) | **PASS** 212 pairs (106 × 2 themes, every gradient stop), 0 failures; tightest light `text.muted` on `gradient.canvas` 4.53. Category themes 728 checks, 0 failures |
| A-5 | Web E2E, `next build` + `playwright test` (flow project, then the `visual` project: screenshots + axe/measured contrast) | **PASS** 204 passed, 3 skipped (full-stack `auth.spec`) |
| A-6 | Admin E2E, `playwright test` | **PASS** 25 passed, 6 skipped (full-stack, need `pnpm preview`; they passed on the full stack in 3X.15a/b) |
| A-7 | `expo export --platform all` (output in the scratchpad) | **PASS** iOS + Android |
| A-8 | Structure parity, pre-3X vs 3X (§2, new) | **PASS** 36/36 |

**AC-15 "the E2E suites pass unchanged":** 3X edited 6 existing web specs. QA read every change. None weakens a structure check:
- `site-header.spec.ts`: the bar name is a link and Arrow Down opens the panel (Owner request 3X.10a); the "Browse {category}" line is gone (same request).
- `home.spec.ts`: the header over the hero was compared with the hero's flat colour. It now checks that the header is transparent, that the hero runs on behind it, and that the surface fades in on scroll (design §3.3, approved).
- `profile.spec.ts`: "More" is looked up inside the page content, because the header can now show its own "More ▾".
- `category-pages.spec.ts`: waits for hydration. The test was flaky on the pre-3X build as well (3X.18a).
- `shell.spec.ts` and `edit-profile.spec.ts`: new checks added; nothing removed.

## 2. Structure parity: the screens before 3X vs now (new check)
**Method.** The pre-3X build (port 3101) and the 3X build (port 3100) ran against the same stand-in API (`apps/web/e2e/fake-api.mjs`, 3199). Settings: light theme, reduced motion (no element is mid-animation), Georgian. Each screen was scrolled through once before measuring. Script: `apps/web/e2e/qa/structure-parity.qa.ts` with `apps/web/playwright.parity.config.ts`; how to run it is in the script header (it is not part of `test:e2e`). Per screen it compares:
1. the accessibility tree (`ariaSnapshot`: roles, names, levels, order);
2. every visible element's box (links, buttons, fields, headings, text, list items, landmarks; matched by tag + name);
3. reading order: pairs of elements that were clearly above/below each other and swapped;
4. test ids and class names that existed before 3X and are gone now;
5. sideways scroll width.

**Screens** (18 × desktop 1280 and phone 360): home, category level 1/2/3, search, empty search, `/sellers`, `/hire/logo-design`, `/explore/projects`, profile, portfolio list, login, register, password reset, resend verification, 404, Selling Home, Buying projects. The account pages (settings, password, sessions, verification, edit profile, portfolio edit) need many routed calls. They are covered by their unchanged E2E specs and the 3X.14c dark-mode pass.

**Results.**
- **Accessibility tree:** identical on all 20 phone views and on the 6 auth/404/dashboard desktop views. On the 12 public desktop pages the only difference is `button "დიზაინი"` → `link "დიზაინი"` with `/url: /categories/design` (3X.10a, Owner request 2026-10-06). The script accepts exactly that change and nothing else.
- **Elements:** the same number on every screen, all matched. No test id is gone and there are **0 reading-order flips**.
- **Sideways scroll:** none on 3X. Before 3X, login, register, password reset and resend verification overflowed by 9 px at 360 px; 3X.18b fixed that.
- **Class names:** only `mt-category-bar-item` is missing, and only on phone, where the bar is hidden and all its items sit in "More". No test or style relies on it there.

**Where boxes changed, and why** (start of each shift; later elements just move along with it):
| Change | Size | Source | Verdict |
|---|---|---|---|
| Home hero starts under the sticky header (contents stay where they were) | hero −121 px (desktop) / −57 px (phone) higher and that much taller | 3X.11, design §3.3 | approved look |
| Category bar pills (dot + padding 8 px) | each +9–11 px wider; "More ▾" moves right ≤ 105 px; same items in the bar as before | 3X.10, Q-180 | approved (Owner reviews on staging) |
| Category title on a gradient band | page +58 px (levels 1–2, phone); level 3 phone +94 px (the breadcrumb chips also wrap) | 3X.12 | approved look |
| Breadcrumb links as small chips | +19 px wide, +6 px tall each | 3X.12 | approved look |
| Home "See more" as a compact Ghost button | +12 px wide, +19 px tall | 3X.11 | approved look |
| Auth card fits a 360 px phone | card 50 px narrower, content 25 px in | 3X.18b fix | bug fix |
| Login form 9 px taller (desktop) | +9 px | 3X.9b/3X.14a control looks | fine |
| **Skill chips wrap onto a second row** | +44 px per affected card | 3X.9c border | **F-3X19-1** |
| **Explore "Popular" chips wrap on phone** | +44 px | 3X.12 dot + border | **F-3X19-1** |

## 3. Spec 3X acceptance criteria
| AC | Evidence | Result |
|---|---|---|
| AC-1 colour picker, top level only | admin `catalog.spec.ts` (routed: picker, hex field, swatches, preview, sub-category has the "inherited from" line and no field); `catalog-main-flow.spec.ts` (full stack, 3X.15a) | PASS |
| AC-2 format / level refused | `category-colors.test.ts` (`VALIDATION_FAILED` `pattern`, `top_level_only`); DB check constraint (ADR-023) | PASS |
| AC-3 duplicate refused (names the holder), similar warned | `category-colors.test.ts` (409 `DUPLICATE`, also on a race, EC-2); admin E2E duplicate / similar / reserved messages | PASS |
| AC-4 inheritance (children, project categories, unlinked = teal) | API resolved colour on tree, lookup, breadcrumb, home, project categories (tests); admin dots; web `visual-foundation.spec.ts` (explore chips); app `categories/index.tsx`, `explore-projects` use the parent / linked colour | PASS |
| AC-5 readable with any colour | tokens 18/18 (4,096 grid + 1,500 random colours), `contrast.mjs` 728 category checks, 0 failures | PASS |
| AC-6 distinct starting colours; next unused starter | migration backfill in `position` order; `category-colors.test.ts` default = first unused starter | PASS |
| AC-7 visible ≤ 60 s, audited | `category-colors.test.ts` "changes the colour, audited before/after, and the public tree shows it at once" (cache invalidated on change); full-stack main flow checks the website pill | PASS |
| AC-8 every R-1.6 place | web: bar pill, mega-menu, phone drawer dot + bar, home tiles and rows, category band and breadcrumb, explore chips (`visual-foundation.spec.ts`, 3X.10–3X.12); app: home tiles/rows, categories menu, category band + breadcrumb, explore chips (`apps/mobile/src/app/…`); admin tree, form, project categories | PASS |
| AC-9 buttons: border + inner gradient + all states | `packages/ui/src/web/buttons.css` (one global sheet, web + admin); Submit busy spinner separate from "not ready" (3X.14a); app `ui/button.tsx` | PASS |
| AC-10 cards, chips, tabs, inputs, surfaces | `surfaces.css`, `controls.css`, chips/tabs/switcher (3X.9c–d); admin seen on the full stack (3X.15b); app `Card`, `Chip`, `InputFrame`, `Radio` | PASS (see F-3X19-1) |
| AC-11 canvas gradient light + own dark; text ≥ 4.5 everywhere | `contrast.mjs` (every stop); 3X.18c axe 0 violations + measured pass 0 failures on 6 screens × 2 themes × 2 widths and the admin form | PASS |
| AC-12 micro-interactions within bounds | Token values: durations 120 / 200 / 300 / 400 ms, lift 1 px (controls) / 3 px (cards) ≤ 4, scale 1.03 / 0.98 ≤ 1.03. The web/admin stylesheets contain **no** literal duration or colour: everything goes through tokens. No bounce, rotate or parallax. Loops: shimmer, hero drift and the busy spinner (see N-6) | PASS |
| AC-13 reduced motion | Web: the token block sets lifts, scales, entrance distance, shimmer, drift and stagger to 0 and caps fades at 120 ms; `visual-screens.spec.ts` checks every key screen (no loop, nothing moves, nothing hidden, no hover lift or zoom) and a control test proves the check works. App: press, entrance, shimmer, radio mark, rating fill and switcher slide honour Reduce Motion | PASS web; **app: F-3X19-2** |
| AC-14 CLS / INP no worse | 3X.18d: CLS ≤ 0.007 everywhere; INP: category and search OK; home worse from the theme switch | PASS for CLS; **F-3X18-1** for INP |
| AC-15 nothing in "must not change" changed | §2 + §1 note | PASS (F-3X19-1) |
| AC-16 en + ka for new texts | i18n check OK; every `t_…` key named in ADR-023 §11 (15) is in both `en.json` and `ka.json` (3X.7, 3X.15a) | PASS |

## 4. Accessibility, dark mode, reduced motion
- **Contrast:** see AC-11. The tightest values are the admin preview's light pills, 4.51 / 4.62 (3X.18c).
- **Focus visible:** QA tabbed through home, category page, profile, login and Selling Home in light and dark (≈ 60 stops each). Every stop shows an indicator:
  - the 3X ring + glow on buttons, chips and fields;
  - the browser's own focus outline on plain text links (as before 3X);
  - the header search field: no outline of its own, but the whole pill takes the brand border (≥ 3:1 against the surface) and a 4 px soft ring.
- **Accessible names, `aria-*`, heading levels, focus order:** unchanged (§2).
- **Dark mode:** the 6 key screens were checked by screenshot and contrast in dark (3X.18b/c). The 3X.14c pass covered the private pages.
  - The two items 3X.18b left for a real browser are **capture artefacts, not bugs**. Both the page canvas (`body::before`) and the dashboard sidebar are `position: fixed` at viewport height. Scrolled to the bottom of `/auth/register` at 360 × 640, and of the dark Selling Home at 1280 × 600, both still fill the screen.
- **Signed-in header over the hero** (open since 3X.10): checked with a session cookie, light and dark. The account trigger and name are white on the hero, the menu is translucent and readable, and nothing moved.
  - Observation, not a 3X change: the logo's dark "MY" is hard to see on the teal hero. It was the same before 3X; 3X.11 kept the coloured logo on purpose. The Owner may want to judge it in 3X.23.
- **Reduced motion:** AC-13 above.

## 5. Web ↔ app consistency (code review; the app is not run on a device here)
- **Same rules from one source:** the app reads the same `@mytask/tokens` (native build) and the same `deriveCategoryColor` (`categoryTheme`). The app source has no colour literals except the third-party sign-in logos (`social-icons.tsx`, brand colours).
- **Same treatments:** category band, breadcrumb chips, category chips, accent bar on rows, tile label band, brand strip on the profile and auth cards, avatar ring, alerts with a start bar, restriction cards with a status bar, KPI entrance, M-14 glow, switcher slide, Ghost edit buttons. Each one was built to match the web (3X.17a–e handoffs) and checked here against the web CSS.
- **Known, accepted differences:**
  - the native `Switch` (accept terms, 2FA) stays a platform control in brand teal, not the web gradient track;
  - the native Button has no danger-ghost variant (portfolio Delete is Ghost; the confirmation is Danger);
  - the app is light only (no theme switch on the app before 3X either; spec 02 AC-35 puts the theme switch on the web);
  - touch has no hover, so the app has no hover glow.
- **Not seen on a device:** motion, presses, glows and gradients on a phone. They are on the Owner's device check list `docs/06-qa/plans/3x-mobile-device-check.md` (part of 3X.23).

## 6. Notes (no action needed)
- **N-1** The press duration is 80 ms, below the 120 ms floor of R-4.1. This is the approved design value (`motion.duration.press`, visual-refresh §7) for the press-in only; the release is 120 ms. Recorded so the spec and the design read the same; Designer may align the wording.
- **N-2** The Submit busy spinner turns (800 ms per turn) for as long as a request is on its way. R-4.1 names only the shimmer and the drift as loops, but R-2.2 asks for a loading state, and under reduced motion the spinner stands still. Accept.
- **N-3** The web M-14 glow under reduced motion is 2 × 120 ms (in and out), each step within the cap. Accept.
- **N-4** The verification "step dots", the KPI icon badge and the EmptyState icon were left out on purpose: each would add content (3X.9d, 3X.14b, 3X.14c). Consistent with "must not change".
- **N-5** Admin screens are light only (`data-theme="light"`), as before 3X.

## Environment and clean-up
- Windows 11, Node 24, pnpm, Turborepo `--force`, Next.js production builds (`next start`), Playwright Chromium, Expo SDK 57.
- Pre-3X: worktree `../mt-pre3x` at `main` 61c4e777, built 2026-10-06 (kept for 3X.21 re-checks).
- Every server QA started (3100, 3101, 3199) was stopped. Screenshots and JSON output of the parity run are in the session scratchpad, not in the repo. The working tree holds only the QA script, its config and docs.
