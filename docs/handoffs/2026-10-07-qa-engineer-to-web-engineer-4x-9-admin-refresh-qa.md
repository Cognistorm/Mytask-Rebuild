## What I did
Independent QA of the Phase 4X admin refresh (ROADMAP 4X.9) on `feat/admin-refresh` @ `3945c1c8`, compared with the pre-4X admin at `1d212651`:
- Ran the admin E2E suite on the running `pnpm local` stack: **69/69 passed**. Typecheck and lint are clean.
- Wrote and ran 8 probe tests of my own (real `owner` login, `/admin/me` permissions overridden per set). They cover the permission matrix vs the old top bar (13 sets, all MATCH), keyboard reachability of all 9 routes, landmarks, Tab order at 1280/360, the phone drawer and its focus, sideways scroll at 360 px on 23 pages, "S-nnn …" names on all 99 setting controls, per-row Save PATCH, and the AC-7 re-login (wrong and right password).
- Diffed every screen against `1d212651`: test ids, roles, texts and API calls are unchanged; the existing E2E tests were only extended.
- **Verdict: PASS with notes.** No Blocker or Major findings; 4 Minor and 4 Info.

## Files created/changed
- `docs/06-qa/reports/4x-admin-refresh-2026-10-07.md` (report, findings F-4X9-1 … F-4X9-8)
- this handoff
- No product code, ROADMAP or STATUS changes; nothing committed.

## What the next agent must do
Web engineer (4X.10). Fix the Minor items, or record the Owner's choice to defer them. Details and expected fixes are in the report.
1. **F-4X9-1** (`apps/admin/src/app/settings/page.tsx:81, :126`): after the re-login card closes (Close or success), return focus to the control that triggered it; today it falls to `<body>`.
2. **F-4X9-2** (`apps/admin/src/components/shell.tsx:126-142, 219, 305`): keep Tab inside the open phone drawer (focus trap, or `inert` on `.mt-dashboard-body`).
3. **F-4X9-3** (`shell.tsx:146`, `settings/page.tsx:88`): no `aria-current` on every area item while the Settings list loads after client navigation; take `current` from `?area=` until the rows arrive.
4. **F-4X9-4** (`components/moderation.tsx:65-118`, `components/auth.css:867-883`): at 360 px, one status tab on KYC and Portfolio is always partly off-screen. Make all three fit, or add a scroll cue; or let the Owner decide at 4X.11.
5. Info only, no action needed unless the Owner asks: F-4X9-5 (re-login card no longer shows the setting key), F-4X9-6 (no skip link), F-4X9-7 (extra `GET /admin/settings` on non-Settings screens, by design), F-4X9-8 (5 social switches share one name; pre-existing).
6. Add E2E coverage for the fixes (focus return after re-login, Tab stays in the drawer, single `aria-current` during a delayed list load).
7. QA re-checks after the fixes. Then the Owner click-through (4X.11, `docs/06-qa/plans/4x-admin-refresh-owner-click-through.md`) should include F-4X9-4 and F-4X9-5.

## Open questions / risks
- The live legacy admin was not clicked through: it is production and QA has no staff account. Sidebar order parity was checked against `legacy/APP/app/Livewire/Admin/Includes/Sidebar.php` instead.
- Contrast and reduced motion were not re-measured independently; I rely on `admin-screens.spec.ts` (passed).
- Screen-reader behaviour was checked through the accessibility tree, not with NVDA or VoiceOver.
