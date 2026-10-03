# 4.1.26b QA slice 1 (spec 02 Profiles): screen parity, images, i18n, cross-client, verdict

From: qa-engineer (independent session; did not write slice 1 code) · To: security-reviewer (4.1.27), then web/mobile/backend engineers (4.1.28) · Date: 2026-10-03

## What I did
- I finished the QA report `docs/06-qa/reports/02-profiles-2026-10-03.md`. Part 2 is §7–§15, and the final verdict is at the top. **Verdict: FAIL.** There is 1 major bug and 5 minor bugs, plus 1 spec-text finding. One deviation is proposed for the Owner.
- **Live site, public pages only:** I read the profile, portfolio list and portfolio item pages. I did not log in, sent no forms and touched no account.
- **Legacy views:** I compared the legacy Blade views, page titles and mail classes with the new web, the admin queues and the app source.
- **Real stack on a throw-away database:** I ran `LOCAL_PGLITE_DIR` in the scratchpad; the Owner's `apps/api/.pglite` was not touched. On it I:
  - seeded test data through the real upload protocol, including a 300×120 and a 120×300 avatar;
  - took 60+ Playwright renders: ka/en, 1280/390 px, dark mode, dialogs and both admin queues;
  - audited every `<img>`.
- **PASS:**
  - screen parity, except the bugs below;
  - images: 0 broken; non-square avatars are cropped square on every web and admin screen, and in the app by code. This closes N-3;
  - i18n: all 534 used keys have en + ka, and the slice's own code has no hard-coded strings;
  - cross-client web ↔ iOS/Android: 9/9 (dashboard choice, theme, headline, availability, skills, portfolio create/approve, KYC status, report → EV-13);
  - emails match the legacy templates;
  - `expo export --platform all`: iOS 1293 modules, Android 1450 modules.
- I stopped every process I started. No listener is left on the stack ports, and no repo process is left. The working tree has only the doc changes below.

## Files created/changed
- `docs/06-qa/reports/02-profiles-2026-10-03.md`: the report is complete, with the final verdict at the top and part 2 in §7–§15.
- `docs/ROADMAP.md`:
  - 4.1.26b and 4.1.26 are ticked;
  - the 4.1.28 line now points to the QA bug list.
- `docs/STATUS.md`: one micro-task log line; next = 4.1.27.
- `docs/handoffs/2026-10-03-qa-engineer-to-security-4-1-26b-profiles-parity.md` (this file).
- No product code and no test files changed. The QA scripts stay in the session scratchpad.

## What the next agent must do
**4.1.27 security-reviewer.** Read the report: §3 for the stack checks S-S3-1…8 and §4 for the notes. Then judge:
- **N-1:** request validation runs before authentication, so a guest gets 400 before 401. Confirm the middleware order against ADR-002 §2.
- **N-2:** `createUserReport` counts the SEC-23 limit before it checks the target (`profiles.service.ts:288-300`). Refused attempts therefore use up the 10 per hour. Is this intended, and is it written down?
- **N-4:** after `deleteMe`, the avatar and portfolio WebP variants stay anonymously readable at their unguessable `public-media` URLs. This is a personal-data and privacy-policy question.
- Also from part 2:
  - KYC images are shown inline in the admin queue through 2-minute signed links (§8, §9);
  - the app's KYC Download opens the signed link in the browser (4.1.24d);
  - S-123 linked-account URLs are rendered with `rel="noopener noreferrer nofollow ugc"`.

**4.1.28 fixes (bug list, report §14):**

**BUG-01 — major, web-engineer.**
- **Problem:** every web 404 is the default Next.js page, with English "404: This page could not be found." and no link home. This includes the AC-9 profile 404 and a guest opening a hidden work.
- **Fix:**
  - add a localised `not-found` for `[locale]`, using the legacy `t_page_not_fount`, `t_pls_check_url_address_bar_try_again` and `t_back_to_homepage` (all already in en + ka);
  - keep HTTP 404 and `noindex`;
  - add an E2E assertion in ka and en.

**BUG-02 — minor, web.** The Share profile and Share project dialogs are missing:
- the legacy subtitle `t_share_profile_subtitle`;
- the QR code;
- 6 of the 10 share targets.

Alternatively, the Owner approves DEV-P1.

**BUG-03 — minor, web.** On phones, the account side card sits above the content of the account pages. Legacy hides it below `lg`.

**BUG-04 — minor, backend/web/mobile.**
- **Problem:** "reason.." shows a double full stop. `t_portfolio_rejected_reason` and the EV-126 body add "." after a reason that may already end with one.
- **Fix:** trim the reason, or drop the "." after the placeholder.

**BUG-05 — minor, mobile-engineer, docs.**
- **Problem:** SETUP-LOCAL §4 step 14 says "პორტფოლიო".
- **Fix:** the app shows "ჩემი ნამუშევრები" (`t_portfolio`); change the step to match.

**BUG-06 — minor, web.** The dashboard pages have no breadcrumbs. Legacy seller portfolio pages have Home / My dashboard / Portfolio. Alternatively, the Owner accepts this together with DEV-P1.

**F-04 — product-analyst.** In spec 02 Texts:
- `t_total_reach` is a legacy key, not a NEW one;
- the `t_verifications` ka value is now "ვერიფიკაციები".

**Earlier minor findings, still open:** F-01…F-03 from part 1 (devops: E2E server, `LOCAL_PGLITE_DIR` scope, PGlite outbox quirk).

**After 4.1.28,** QA re-checks per report §15:
- BUG-01 in a browser (ka + en, 1280 + 390 px) and the web E2E suite;
- the minor bugs, each once it is fixed or accepted.

**Owner** (see the STATUS "Owner decisions still open" line):
- decide DEV-P1 (share dialogs, and breadcrumbs BUG-06);
- decide DEV-M1. It is still recommended for approval: the app has no public home yet;
- run the phone checks of SETUP-LOCAL §4 steps 10–16 (report §13), especially that a wide avatar uploaded on the web shows round and centre-cropped in the app.

## Open questions / risks
- No new Owner business question, and nothing added to `open-questions.md`.
- **Untracked items** for the orchestrator to place in ROADMAP:
  - the branded 404 page (BUG-01; fix in 4.1.28);
  - an app language switch (the app is Georgian only, N-8);
  - the app Home tab (N-11; DEV-M1 depends on it).
- **Risk:** the full-stack checks share the Owner's local Redis, SeaweedFS and Mailpit folders (F-02). This run left QA users' uploads and emails there; nothing reached production.
