# Handoff — solution-architect + product-analyst → backend-engineer, web-engineer (ROADMAP 4.0.1)
Date: 2026-10-02 | ADR: ADR-019 (accepted, Owner Q-158 (a)) | Contract: **1.3.0** (additive)

## What I did
- **Contract 1.3.0** (additive, no breaking change):
  - new `D6ErrorCode` value `CUSTOM_CODE_HOST_DENIED` — `[422]`, `details.matches` (matched URLs, container ids or hosts), messageKey `t_custom_code_host_denied`;
  - `adminUpdateSetting` description: built-in tag-manager deny list for S-110 code and S-127 hosts, checked before the S-127 host rules; the old "Phase 3 study" sentence now points to ADR-019;
  - `adminRestoreSettingVersion`: an old S-110 / S-127 value is checked against the current deny list like a new save; `x-covers` gains `16 AC-74`;
  - `info.version` 1.3.0 + change note; `coverage/16.md` rows AC-73 (separate root layouts, ADR-019 §2) and AC-74 (both operations).
  - `npm run verify:final`: Redocly 0 errors, check-contract 0/0, check-coverage 0/0 (715/715).
- **Spec 16** (analyst): AC-73 gains the full-page-load rule at the public/private boundary (private pages always strict CSP); AC-74 gains the built-in deny list sentence; new Texts row `t_custom_code_host_denied`; header and Out-of-scope updated.
- **i18n** (NEW key, English first, Georgian alongside, Q-058):
  - en `t_custom_code_host_denied`: "Tag manager containers are not allowed in custom code: {{matches}}"
  - ka: "ტეგ-მენეჯერის კონტეინერები დამატებით კოდში დაუშვებელია: {{matches}}"
- `pnpm gen` (types + api-client at 1.3.0), `pnpm i18n:check` OK, typecheck/lint 9/9, API 167/167.

## Files created/changed
- `docs/04-api/src/schemas/d6.yaml`, `docs/04-api/src/paths/d6-notifications-admin.yaml`, `docs/04-api/src/openapi.base.yaml` (+ generated `src/openapi.root.yaml`, `openapi.yaml`)
- `docs/04-api/coverage/16.md`
- `docs/02-specs/16-admin-panel.md`
- `packages/i18n/en.json`, `packages/i18n/ka.json`
- `packages/types/src/generated/*`, `packages/api-client/src/generated/operations.ts`

## What the next agent must do
- **web-engineer — ROADMAP 4.0.2 (now):** split `apps/web/src/app/[locale]` into public and private root layouts (ADR-019 §2) + the E2E from ADR-019 §2.
- **backend-engineer — slice 17 / ROADMAP 4.15.14 (later):** implement the deny list (one file, a source comment per entry; ADR-019 §3) in `adminUpdateSetting` and `adminRestoreSettingVersion`, with tests: `gtm.js?id=GTM-…` refused, `GTM-` id in inline code refused, Adobe/Tealium/Segment hosts refused in code and in S-127, `/gtag/js?id=G-…` accepted.

## Open questions / risks
- None new. The exact list of GTM server-side preview hosts is fixed when the deny list is coded (slice 17) and reviewed in its security review (ADR-019 §3).
