# Handoff: QA engineer → orchestrator — ROADMAP 3.17j, slice 01 re-check
Date: 2026-10-01 | Branch `feat/auth` @ `210a2660` | My files are uncommitted (orchestrator commits)

## What I did
- I re-checked slice 01 (auth) on my own after the 3.17 fixes (3.17g `cf6d75a6`, 3.17h `12f94acc`, 3.17i `210a2660`). I compared it against the live site (`/auth/login`, `/auth/register`, `/auth/password/reset`, `/auth/request`), the legacy blade views and the components that set their titles. Web was checked in a real browser on the production build (ka + en, 390 px and 1280 px); the app was checked from its source.
- I re-ran the suites: lint + typecheck 17/17 (forced), API 167/167, api-client 4/4, i18n check, gen:check, format:check, web E2E on the production build 35 passed / 3 skipped, web E2E on the dev server 13/13 (F-02 proof), full-stack web `auth.spec.ts` 3/3 and admin E2E 5/5 on a throwaway in-memory database with S-056 ON, and `expo export` for iOS + Android. No regressions from 3.17a–n.
- **New verdict: PASS with notes.** BUG-01 (major), BUG-02, BUG-03, BUG-04, F-01, F-02, F-04 and F-05 are all closed. Two new **minor** findings: BUG-05 and BUG-06. No blocker or major bug is open.

## Files created/changed
- `docs/06-qa/reports/01-auth-2026-10-01.md`: added the verdict pointer at the top and the new section **§11 Re-check after ROADMAP 3.17**. The old verdict is kept for history.
- `docs/handoffs/2026-10-01-qa-engineer-to-orchestrator-3-17j-recheck.md` (this file).
- No product code, ROADMAP or STATUS changed. Scratch files (screenshots, QA preview copy) are only in the session scratchpad.

## What the next agent must do
1. **Orchestrator**: record 3.17j in `docs/STATUS.md` / `docs/ROADMAP.md` with the verdict PASS with notes, then open a small follow-up task for BUG-05 + BUG-06.
2. **web-engineer**:
   - BUG-06: in `apps/web/src/components/auth/auth.css`, stop `.auth-field input { width: 100% }` and the medium label weight from reaching the register terms checkbox row (e.g. `.auth-check input { width: auto; flex: none }`, normal-weight text). Add an E2E assertion that the checkbox is narrow (≤ 24 px).
   - BUG-05: add `<PolicyLinks>` to the register `AuthLinks` (legacy and live list privacy + terms there too).
   - N-3 (optional): a unit test for `splitLegacyLinks`.
3. **mobile-engineer**: BUG-05: add privacy and terms to the register `LinkList` (`apps/mobile/src/app/register.tsx`).
4. **product-analyst**: BUG-05: correct the register bullet in spec 01 "Panel texts and links" so the link list includes `t_privacy_policy` and `t_terms_of_service`. If the Owner prefers the shorter list, record it as a deviation instead.
5. **QA**: after the follow-up, do one browser pass on `/auth/register` (ka + en, 390 and 1280 px) and read the app source. A full re-run is not needed.

## Open questions / risks
- **Owner decision, DEV-M1**: the app has no "back to homepage" on login and register while its home tab is signed-in only. QA recommends **approving** it for slice 01 and re-checking it in slice 02 when the public home exists in the app (reasons in report §11.5).
- **Owner, Q-160** (mobile bot check) is still open. It is not needed for Phase 3 and must be decided before S-061 is turned ON in production.
- N-1: the S-111 site title default is `MyTask`, while the live `<title>` shows `My Task`. Check this at data migration.
- N-2: the privacy and terms link labels come from keys rather than CMS page titles. Re-check this with spec 17.
- Limit: there is still no mobile device or E2E harness, so the app evidence is source reading plus a clean bundle export. Real-device checks remain in Phase 6.
