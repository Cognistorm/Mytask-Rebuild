# 4.1.26a QA slice 1 (spec 02 Profiles): plan, automated suites, API-level AC checks — report part 1

From: qa-engineer (independent session; did not write slice 1 code) · To: qa-engineer (4.1.26b), then security-reviewer (4.1.27) · Date: 2026-10-03

## What I did
- I wrote the test plan `docs/06-qa/plans/02-profiles.md`. It maps the 42 ACs → test cases → evidence. It also covers the rules, edge cases, "wrong role tries it", notifications, and the layer-B checklist for part 2.
- I ran every suite with nothing replayed from cache:
  - lint + typecheck: 19/19
  - `turbo test`: API 395 passed (+5 skipped), api-client 9, i18n
  - `gen:check`, `i18n:check`, `format:check`
  - web E2E on the production build: 108 passed, 3 skipped (slice 01 full-stack only)
  - admin E2E: 12 routed tests, and 17/17 on the full stack including `profiles-main-flow`
  - `expo export --platform all`: iOS 1309 modules, Android 1450 modules
  - `storage.integration` against the stack's SeaweedFS: 5/5
- I added QA probes `apps/api/test/qa-slice02.test.ts`, which pass 19/19. They cover gaps the slice's own tests did not:
  - guest / user / staff / restricted wrong-role checks;
  - staff permissions crossing between the portfolio and KYC queues;
  - upload edges (WEBP / GIF / exactly 2 MB / 5 MB);
  - skill, availability, report and settings boundaries;
  - portfolio: the rejected item lifecycle, an S-071 ON edit, EC-9, and re-moderation of a published item after an edit;
  - the full KYC cycle with two declines;
  - `deleteMe` → every portfolio URL returns 404;
  - AC-3 across iOS and Android sessions.
- I started `pnpm local` on a **throw-away database** (`LOCAL_PGLITE_DIR` in the session scratchpad; the Owner's `apps/api/.pglite` was not touched) and ran 33 stack checks, all PASS:
  - real uploads, and public images load anonymously;
  - no anonymous listing of `public-media`, and no anonymous read of the root, `private/` or `kyc/` (this confirms the 4.1.25 fix);
  - signed KYC links work, the same path without the signature is refused, and other users get 404;
  - staff decline/approve and reject/approve through a cookie session;
  - EV-11…EV-18 and EV-126 arrive in Mailpit; the EV-11 link confirms the email change.
- Afterwards I stopped every process I started. No listener is left on the stack ports, and no repo process is left.
- The report is `docs/06-qa/reports/02-profiles-2026-10-03.md` (part 1 of 2). **Interim result: no blocker, no major bug.**

## Files created/changed
- `apps/api/test/qa-slice02.test.ts` (new, QA probes)
- `docs/06-qa/plans/02-profiles.md` (new)
- `docs/06-qa/reports/02-profiles-2026-10-03.md` (new, part 1)
- `docs/ROADMAP.md` (4.1.26a ticked)
- `docs/STATUS.md` (micro-task log; next = 4.1.26b)
- `docs/handoffs/2026-10-03-qa-engineer-to-qa-4-1-26a-profiles-plan-and-suites.md` (this file)

## What the next agent must do
**4.1.26b (qa-engineer):** follow report §6:
- Screen parity on web (ka + en, 390 px and 1280 px), in the app (source + SETUP-LOCAL §4 steps 10–16) and in the admin queues, against the live site (public pages only) and the legacy views.
- Every image screen with real images, including a non-square avatar (N-3).
- i18n of the spec's NEW keys and the slice's NEW keys; no hard-coded strings.
- Cross-client web ↔ app.
- Email texts against the legacy templates.
- DEV-M1 re-check.
- Then the final verdict.

To restart the stack for screens:
- Use a new empty `LOCAL_PGLITE_DIR` folder and keep its first log (it prints the `owner` password).
- Stop it afterwards: `taskkill /T` on the `pnpm local` tree, then check that ports 3000/3100/3200/5432/6379/8333/8025 are free.
- Note F-02: Mailpit and SeaweedFS data are shared with the Owner's normal local stack.

**4.1.27 (security-reviewer):** read report §4 notes:
- N-1: validation runs before auth (400 before 401).
- N-2: the report limit counts refused attempts.
- N-4: a deleted account's public image variants stay readable by URL.
- The anonymous `Read:public-media` identity is confirmed scoped (S-S3-1…S-S3-8).

## Open questions / risks
- No new Owner question and no business-rule question. F-01…F-03 are minor and belong to devops/web (test fidelity and local environment), not to slice 02 behaviour.
- N-5 (staff queues still show items of deleted accounts) is for the slice 16 spec check.
- Still open from before: DEV-M1 (re-check in 4.1.26b) and Q-160.
