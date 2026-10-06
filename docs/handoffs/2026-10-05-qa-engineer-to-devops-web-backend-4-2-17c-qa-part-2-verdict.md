# Handoff: qa-engineer → devops-engineer, web-engineer, backend-engineer — 4.2.17c QA part 2 and verdict, slice 2

## What I did
- Compared the slice's screens with the live site (public pages, GET only) and `/legacy/`: header, category pages, gig card, search, English pages, home, `/sellers`, `/hire`, explore projects, admin catalogue.
  - Viewports: ka + en, 1280 and 390 px.
  - Ran on the real stack with 56 sample gigs on a throw-away DB. The data was written through the API's own compiled `PrismaService` + `SearchIndex`.
- Checked filters, sort and paging on the real stack through the website URL and the API (same 17 results).
- Cross-client: the same operations and filter rules in app and web, and byte-identical API answers for web/ios/android.
- i18n: 99 new keys complete in en + ka, spec values exact, no hard-coded strings.
- Added Owner question Q-168 (S-107 starting value: the register says OFF, the live site shows the block).
- **Verdict: FAIL**, because BUG-01 (major, from part 1) is open. Everything else is minor. Expected after 4.2.18 + re-check: PASS with notes.

## Files created/changed
- `docs/06-qa/reports/03-categories-search-2026-10-05.md` (§7–§14 + verdict)
- `docs/01-discovery/open-questions.md` (Q-168)
- `docs/ROADMAP.md`, `docs/STATUS.md`
- This handoff

## What the next agent must do (4.2.18)
- **devops-engineer — BUG-01 (major):** the `pnpm local` website loop (`next dev --hostname 127.0.0.1`). Details are in report §5 and the 4.2.17b handoff. Keep SEC-71 (loopback only) and add a check that would catch it.
- **web-engineer:**
  - BUG-02: home hero shortcut tiles at desktop width (labels spill out of ~96 px pill-circles, no icons; design `01-home.md` = round tiles with an icon; `components/home/home.css:54-70`).
  - F-02: `/sellers` browser title → `t_sellers` as in legacy.
  - BUG-03, only if the Owner picks a text for `t_5_stars` (ka "5 ⭐️").
- **backend-engineer:**
  - F-01: `/hire/{keyword}` exact-slug check case-insensitive (legacy MySQL `_ci`; confirmed on live with `/hire/ADOBE-ILLUSTRATOR`).
  - Security review 08: SEC-76, SEC-77, I-44.
- **solution-architect:** review 08 contract maxima (SEC-76, I-45).
- **qa-engineer (re-check after 4.2.18):** plain `pnpm local` on a throw-away DB: admin E2E incl. both main flows, stack checks S-WEB-1…13, BUG-02/F-01/F-02 on the screen.

## Open questions / risks
- Owner: Q-167 (guests in the app), Q-168 (S-107), BUG-03 text, plus the two decisions already in the click-through checklist (header over the hero; 307 instead of 302).
- The app was not seen on a phone. The Owner checks it in the click-through (SETUP-LOCAL §4 steps 17–18, report §12).
- Filled lists with the Featured badge on the real stack need Premium (slice 8).
