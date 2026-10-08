## What I did
ROADMAP 4.3.21 for slice 3 (spec 04 Gigs, branch `feat/gigs`).

- `feat/gigs` sits on the current `main` (`ec09b8ff`, PR #4), 74 commits of its own. No other branch has to be merged first.
- Checked locally before the push: `format:check`, `i18n:check` (en 3145 / ka 3151 keys) and `gen:check` (contract 1.5.0) all PASS. The full suite ran in 4.3.20e and 4.3.20f, and only docs changed after that.
- Pushed `feat/gigs` (the Owner lifted the no-push rule on 2026-10-06, and PR #3 and #4 went the same way). The first CI run failed in one API test, because equal counts in gig analytics were sorted by the database collation. Fixed with `COLLATE "C"` (`9002bbe1`). CI run 37796264804 is then **green on all 5 jobs**.

Reviews:
- QA report `docs/06-qa/reports/04-gigs-2026-10-07.md`: **PASS with notes** (§15, re-check after 4.3.20).
- Security review 10 `docs/06-qa/security/10-slice-04-gigs-uploads-2026-10-08.md`: PASS with conditions. Re-check review 11 `docs/06-qa/security/11-slice-04-recheck-2026-10-08.md`: **PASS**, so the merge gate is met.

## PR text (ready to paste)
Open it here: https://github.com/Cognistorm/Mytask-Rebuild/pull/new/feat/gigs (base `main`).

**Title:** `feat: slice 3 — gigs (spec 04)`

**Body:**

Slice 3 of Phase 4: spec 04 Gigs, plus the staff gig queue of spec 16 (AC-19, AC-20). Contract 1.5.0 (ADR-024: restoring a staff-removed gig respects the plan limit and notifies the owner).

**API**
- Sellers:
  - create, edit and delete gigs, with every field error returned at once;
  - one shared Georgian/English content-language check (reused later by projects);
  - plan limit through `PremiumStatus`, without races;
  - slug from the Georgian title;
  - pending or active depending on S-070.
- Gig files: thumbnail, images and PDF documents (S-080). A PDF must start with `%PDF-` at byte 0, and every file is stored as a download (`Content-Disposition: attachment`).
- Public:
  - gig page, lookup by slug and uid with a 301 to the current slug;
  - English → Georgian fallback;
  - "You may also like";
  - favourites, reports (EV-22, rate limited).
- Views and analytics:
  - views counted once per visitor per Tbilisi day; the IP is never stored, and GeoIP is local DB-IP Lite;
  - impressions from search;
  - owner analytics;
  - monthly `analytics_events` partition job.
- Staff: queue, publish, reject with a reason, remove, restore. The first decision wins, every action is audited, and the search index is updated. A removed gig's files go offline and come back on restore (4.3.24).
- Emails: EV-19 (staff), EV-20, EV-21 with the reason, EV-130 (NEW, gig restored), EV-22.

**Web**
- Create/edit wizard:
  - Overview, Pricing, Upgrades, FAQ, Gallery and SEO, with uploads, reorder and retry;
  - one step per screen on phones.
- Gig page: gallery and lightbox, tabs, documents, Share and Report, favourite.
- My gigs, analytics (DB-IP credit), favourites.
- Favourite heart on every gig card list.
- Legacy URLs answer 301.

**Admin**
- Gig moderation queue `/gigs`: Pending / Active / Rejected / Deleted.

**App**
- Gig screen, the create/edit wizard (5 steps, camera/library, PDFs), My gigs, favourites, hearts on cards.

**Fixes from QA/security (4.3.20, 4.3.24, 4.3.25)**
- API typecheck; prettier.
- Favourite hearts on cards.
- Carousel heading at 390 px.
- Role switcher link.
- React key warning.
- EV-21 greeting.
- Gallery hints and the "file names are public" hint.
- PDF checks and download header.
- Next.js 16.3.8.
- Removed gigs' files offline.

**Tests**
- API 782 passed (7 skipped).
- Web E2E 291 passed (3 skipped).
- Admin E2E 77 passed (7 skipped), incl. the full-stack `gigs-main-flow`.
- Storage integration 7/7 on SeaweedFS.
- `expo export` for iOS and Android.

**Known and accepted / later**
- DEV-S1 (Georgian pages loop under `pnpm local`) stays deferred; testing runs on staging.
- Security, later: SEC-80 (c) media host (Phase 6), SEC-81 with SEC-79, SEC-83 view-count cap, SEC-84 contract maxima, I-62 CDN purge (Phase 6), I-63 legacy PDFs (Phase 5).
- Native gig analytics screen: 4.3.23 (Q-184 (b)). Until then the app opens the website.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Files created/changed
- This file.
- `docs/ROADMAP.md`: 4.3.21 ticked.
- `docs/STATUS.md`: log line and the next task.

## What the next agent must do
- **Owner:** open the PR with the text above.
- If CI fails on the PR run: read the annotations through the public API (`/check-runs/<job id>/annotations`), and ask the Owner for full logs if needed.
- **Next task: 4.3.22, the Owner click-through** on staging. Redeploy first with `bash scripts/deploy-staging.sh`. Checklist basis: `docs/06-qa/plans/04-gigs.md`.

## Open questions / risks
- Owner decisions still open: DEV-M1, Q-160, Q-163, Q-164, Q-181, Q-183.
- None from CI: gitleaks, oasdiff and the Docker/Caddy smoke test passed on GitHub.
