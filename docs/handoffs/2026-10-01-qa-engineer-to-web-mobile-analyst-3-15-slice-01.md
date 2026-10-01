## What I did
QA of slice 01 (ROADMAP 3.15a + 3.15b), as an independent session that did not write the slice code.
- Test plan `docs/06-qa/plans/01-auth.md` (55 ACs → test cases).
- Forced runs of every suite; 22 new API-level probes `apps/api/test/qa-slice01.test.ts` (all pass); web E2E on the production build and on the full stack (fresh QA database, S-056 ON); admin E2E on the full stack; mobile export.
- Parity with the live site and `/legacy/` for every auth screen (web + app), i18n of all spec 01 keys and every key used in code, cross-client web ↔ app on the running stack (11/11), email rendering.
- **Verdict: FAIL — 1 major (BUG-01), 7 minor, 0 blockers.** The behaviour passes; the auth screens do not keep the legacy structure.

## Files created/changed
- `docs/06-qa/plans/01-auth.md` (new)
- `docs/06-qa/reports/01-auth-2026-10-01.md` (new)
- `apps/api/test/qa-slice01.test.ts` (new, 22 tests)
- `docs/ROADMAP.md` (3.15 split + ticked; 3.17 lists the findings; 4.8.6 referral crediting)
- `docs/STATUS.md`

## What the next agent must do
In ROADMAP 3.17 (report §9 and §3 have the evidence):
- **web-engineer + mobile-engineer:** BUG-01 add the legacy link list under the login and register panels (create account / already registered, forgot password, resend verification email, privacy policy, terms of service), the `t_pls_login_to_continue` subtitle and the `t_back_to_homepage` link on small screens; BUG-02 register order full name, email, username, password; BUG-03 subtitles `t_reset_ur_password_subtitle`, `t_resend_verification_email_subtitle`, `t_update_password_subtitle`, back link `t_back_to_sign_in`, per-page `<title>` on web; F-05 admin nav `aria-label` through a key; F-02 make `apps/web/e2e/sessions.spec.ts` answer by state, not by call count.
- **product-analyst:** BUG-04 choose the legacy `t_by_signup_u_agree_to_terms_privacy` text or list `t_i_agree_terms_privacy` in spec 01 Texts; F-04 correct spec 01 Texts (the two legacy ka values exist); F-01 with the solution-architect: align spec 01 R-A10 and ADR-002 on whether the app checks reCAPTCHA (no launch impact: S-061 OFF).
- **qa-engineer:** after 3.17, re-check §10 (screens on web ka + en and in the app source, web E2E on the production build).

## Open questions / risks
- No mobile device or mobile E2E harness: app screens were checked by source only; deep links and App Links need a development build (Phase 6 store ids).
- Real social providers untested until the Owner enters keys.
- Docker engine was not running: the database was PGlite; CI runs the same API tests on real PostgreSQL + Redis.
