# Handoff: QA engineer → orchestrator (and web / mobile / backend for 4.3.20), 4.3.18b QA part 2 + verdict of slice 3 (Gigs)

## What I did
- Completed `docs/06-qa/reports/04-gigs-2026-10-07.md` with part 2 (§7–§14) and the verdict at the top.
- **Real stack on a throw-away DB.** It ran on `LOCAL_PGLITE_DIR` in the scratchpad; the Owner's `.pglite` was not used. Sample data was made through the API: 3 users (ka web, en iOS, ka Android) and 4 gigs with every state. S-100 was pointed at `qa-admin@example.com`; mail went only to the local Mailpit.
- **Screen parity** vs the live site (public pages only) and `/legacy/`, in ka + en at 1280 and 390 px:
  - web: gig page, wizard, edit, My gigs, analytics, favourites, cards;
  - admin: gig queue;
  - app screens: from source.

  All 44 page loads behaved as expected: 200, and 404 for a pending gig seen by a guest. No sideways overflow, no broken images, and no UI text in the wrong language.
- **Notifications:** EV-19, EV-20, EV-21, EV-22 and EV-130 were read in Mailpit. Subject, body, button link and the reader's language were right (en reader in en, others in ka).
- **i18n:** 73 new keys, complete in en + ka. The spec 04 and spec 16 NEW values match. `t_actions` ka changed per Q-105. No hard-coded strings.
- **Cross-client:** 11 checks PASS. The API answers are byte-identical for web, iOS and Android. A favourite toggled in the real website shows in the iOS client.
- **Clean-up:** the 50 sample objects were deleted from the shared local bucket. The stack is fully stopped (no listener, no repo process).
- **Verdict: FAIL** — 2 major bugs from part 1 are still open (BUG-01, BUG-03). New in part 2: 3 minor bugs, 2 minor findings, 1 Owner question and notes.

## Files created/changed
- `docs/06-qa/reports/04-gigs-2026-10-07.md` (part 2 + verdict)
- `docs/01-discovery/open-questions.md` (Q-184 added)
- `docs/ROADMAP.md` (4.3.18b ticked, 4.3.18 ticked), `docs/STATUS.md`
- This handoff
- No product code changed. The QA scripts stay in the session scratchpad.

## What the next agent must do
4.3.19 (security review, uploads) is next in the ROADMAP. Then **4.3.20** fixes the items below.

**Major, from part 1 (report §5):**
- **BUG-01**, web + backend: the API typecheck fails, so CI is red.
- **BUG-03**, web + mobile: no favourite heart on gig cards.

**Minor:**
- **BUG-02**, web: `pnpm prettier --write apps/admin/e2e/sidebar.spec.ts`.
- **BUG-04**, web: at 390 px the gig page's "You may also like" heading runs under the carousel arrows. Keep room for the buttons, or wrap the heading (`apps/web/src/components/gig-page/gig-page.css:326-333`). N-14 (thumbnail place in the My gigs rows on the phone) can go in the same change.
- **BUG-05**, web: the dashboard role switcher's current link is `/ka/…` in the server HTML, which causes a hydration mismatch, and the `/ka/` href stays. Build the current-side href with `href(locale, …)` from the un-prefixed path instead of the raw `usePathname()` (`apps/web/src/components/dashboard/shell.tsx:100`).
- **BUG-06**, web: the React "unique key" warning in `Tabs` on every gig page. Give the tab `content` elements keys, or build them inside the client component (`apps/web/src/app/[locale]/(public)/service/[slug]/page.tsx:151-230`).
- **F-01**, backend: greet with the full name when one is set in EV-21 `YourGigNeedsChanges`, as legacy does (`legacy/APP/app/Notifications/User/Freelancer/YourGigNeedsChanges.php:40`; `apps/api/src/platform/mail/templates.ts` EV-21).
- **F-02**, Owner text choice first: the gallery hints join "File must be less than … png" with the validator text "Field not have more than 10 items" (ka "ველში დაშვებულია მაქსიმუმ 10 დეტალი") without a full stop. Either add a full stop, or use a NEW hint key (English first, Georgian alongside), on web and mobile.

**Then QA re-checks (report §14):**
- root `pnpm typecheck` + `pnpm format:check`;
- the API, web and admin suites;
- hearts on every card list (web + app; guest; none on own gigs);
- BUG-04…06;
- EV-21 in Mailpit.

**Product-analyst (N-7):** spec 04 Texts says 4 keys are "missing in legacy ka", but legacy ka has them. Correct the table; the files already keep the legacy values.

## Open questions / risks
- **Q-184 (new, Owner):** should the app get its own analytics screen, or keep opening the website page? The recommendation is a small later micro-task. Nothing is blocked.
- Q-181 and Q-183 are still open; both are built with the recommended defaults.
- The app screens have still never run on a device. The Owner's phone steps are SETUP-LOCAL §4 19–20 (report §12).
- **N-10:** guests see the heart on the new gig page and get the login message (spec AC-35), while live hides it from guests. Approved in the spec, but the Owner should notice it in the click-through.
- **N-12 (not slice 3):** the EV-124 setting-changed email shows a raw UTC ISO time, and it is sent even when the value did not change.
