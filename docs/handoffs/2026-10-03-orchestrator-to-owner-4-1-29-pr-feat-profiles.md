## What I did
ROADMAP 4.1.29 for slice 1 (spec 02 Profiles and dashboards, branch `feat/profiles`).

The Owner's rule of 2026-10-02 says nothing is pushed and no PR is opened until Phase 4 is complete. So the branch stays local, and the GitHub CI was run here instead, step by step as `.github/workflows/ci.yml` runs it (2026-10-03, at `e9f10c92` + docs):

| CI step | Result |
|---|---|
| `pnpm gen:check` (generated types/client match the contract) | PASS |
| tokens build, no diff in `packages/tokens/dist` | PASS |
| `pnpm i18n:check` | PASS |
| `pnpm format:check` | PASS |
| `turbo run lint typecheck test --force` | 22/22 (API 421 passed, 6 skipped) |
| `pnpm build` | 4/4 |
| `pnpm test:e2e` | web 110 passed + 3 skipped; admin 12 passed + 5 skipped (full-stack ones) |
| Docker / Caddy job | not run (no Docker on this computer); the first run is the CI `docker` job after the push |

Earlier in 4.1.28, QA also ran these on the real local stack: admin full-stack E2E 17/17 including `profiles-main-flow`, S3 integration 6/6 against SeaweedFS, and `expo export` for iOS and Android.

Reviews:
- QA `docs/06-qa/reports/02-profiles-2026-10-03.md`: **PASS with notes** (§16).
- Security review 06 (PASS with conditions) and re-check 07: **PASS, merge allowed**.

## Files created/changed
- This file, which holds the PR text below.
- `docs/ROADMAP.md`: 4.1.27–4.1.29 ticked.
- `docs/STATUS.md`: log lines and the next task.

## What the next agent must do
- **When Phase 4 is complete** (or earlier, if the Owner lifts the rule):
  1. `git push -u origin feat/profiles`.
  2. Open https://github.com/Cognistorm/Mytask-Rebuild/compare/main...feat/profiles with the text below.
  3. Check CI, especially the `docker` job's new Caddy step, which loads `/profile/ci_nobody_here` (SEC-65).
- **Next task: 4.1.30, the Owner click-through.** Checklist: `docs/06-qa/plans/02-profiles-owner-click-through.md`.

## Open questions / risks
- `feat/adr-019-followups` (4.0) is not merged into `main` either; `feat/profiles` was branched on top of it. Merge the two in order, or open the PR from `feat/profiles` alone (it contains the 4.0 commits).
- Owner decisions still open:
  - Q-163 and Q-164 (what "Delete account" removes, and whether it needs the password; before Phase 5);
  - QA F-05 ("Contact us" on the 404 page; tracked in 4.2.0).

---

## PR text (ready to paste)

**feat(profiles): slice 1, spec 02 Profiles and dashboards**

Spec 02 built end to end: API → web → admin → mobile.

- **Files foundation F0:**
  - presigned uploads and the worker's scan pipeline (magic bytes, ClamAV, WebP variants, EXIF stripped);
  - signed downloads, and staff uploads;
  - appeal files.
- **Profiles:**
  - public profile and portfolio (SSR as the visitor);
  - edit profile: avatar, headline, about, skills, languages, linked accounts, availability;
  - online status and Report user.
- **Account:** settings (email change by link, delete account), verification centre (KYC), theme switch.
- **Dashboards:** shell with the Buying / Selling switcher, Selling Home, Buying landing.
- **Admin:** portfolio and KYC queues.
- **Mobile:** the same screens: dashboard tabs, profile, edit profile, portfolio, settings, verification.
- **Emails:** EV-11…EV-18, EV-126.
- **Localised 404 page** on the web (ka / en).

**Reviews:**
- QA parity report `docs/06-qa/reports/02-profiles-2026-10-03.md`: PASS with notes.
- Security reviews 06 and 07 (`docs/06-qa/security/`): PASS, merge allowed. The before-merge fixes are in:
  - SEC-62: SeaweedFS filer HTTP off;
  - SEC-63: copy only the scanned version, late quarantine cleanup;
  - SEC-64: unattached public images are deleted after 24 h (stop-gap);
  - SEC-65: client IP on the web/admin upstreams;
  - SEC-70a: `no-store` signed links;
  - SEC-73: cleanup batching.
- Follow-ups are tracked in ROADMAP 4.2.0, 5.0 and 6.12.

**Contract:** 1.2.4 on `main` → 1.3.1. 1.3.0 is the ADR-019 follow-ups (4.0, included in this branch); 1.3.1 deprecates `countryCode` (ADR-021). Both changes are additive; nothing breaks.

**Checks:** lint, typecheck, unit/API (421), build, web E2E 110, admin E2E 12 routed + 17 full-stack, S3 integration 6/6, expo export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
