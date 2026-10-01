## What I did
ROADMAP 3.14 / phase-3-plan P3-9: studied isolating the S-110 custom code (Q-146 (c), ADR-013 §7, SEC-11) and wrote **ADR-019 (proposed)**.
- Checked what the custom code is used for: the live home page (2026-10-01) loads **Google Analytics 4** (Google tag, `www.googletagmanager.com/gtag/js?id=G-…`) and **Microsoft Clarity** from the database custom-code slot (not in legacy code; `main-app.blade.php:166-168`).
- Compared six options (in-page + hardening, sandboxed iframe on a separate domain, server-side tagging, signed-out visitors only, Partytown, no third-party scripts). Iframe isolation breaks both vendors in use, so the proposal keeps the in-page model and adds:
  1. two root layouts in `apps/web` (public / private) so a custom script and the relaxed CSP never survive client-side navigation into auth, account, checkout, inbox (a real gap today: one root layout);
  2. a built-in tag-manager deny list in the API (`422 CUSTOM_CODE_HOST_DENIED`), matching URLs/container ids so the GA4 Google tag stays possible;
  3. a path-scoped CSP source `https://www.googletagmanager.com/gtag/` instead of the bare host;
  4. Clarity masking of the header account area + "Strict" masking at go-live.
- Opened Owner question **Q-158** (options: (a) ADR-019; (b) + scripts only for signed-out visitors; (c) iframe now; (d) no third-party scripts). Recommendation (a).

## Files created/changed
- `docs/03-architecture/adr/019-isolating-s110-custom-code.md` (new)
- `docs/03-architecture/architecture.md` (ADR index row 019)
- `docs/03-architecture/adr/013-web-root-isolation-and-secrets.md` (§7 study pointer)
- `docs/03-architecture/phase-3-plan.md` (P3-9 done)
- `docs/01-discovery/open-questions.md` (Q-158)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- Orchestrator: put Q-158 to the Owner. Nothing in slice 01 depends on it.
- After approval (a or b): solution-architect adds `CUSTOM_CODE_HOST_DENIED` to `adminUpdateSetting` / `adminRestoreSettingVersion` (additive); product-analyst updates spec 16 AC-73 (full page load at the boundary; signed-out only if (b)) and AC-74 (deny list); add a ROADMAP task for the web engineer to split `apps/web/src/app/[locale]` into public and private root layouts with the E2E of ADR-019 point 2 — best before many public pages exist (slices 02–04); backend builds the deny list + tests in slice 17; Phase 6 go-live checklist gets ADR-019 points 5 and 7.

## Open questions / risks
- Q-158 open. Remaining risk until then is the one the Owner accepted in Q-146: a listed vendor or a hijacked Super-admin account can act as a signed-in visitor on public pages.
- Whether the Google tag (`G-…`) can never run custom JavaScript rests on Google's documentation; the slice 17 security review re-checks it before custom code is switched ON.
- Discovery gap: the legacy Facebook SDK + Messenger chat bubble (`main-app.blade.php:210-230`) is in no spec; noted in Q-158 as not carried over (Meta retired the plugin in 2024).
