# ADR-021: no country in account settings (contract 1.3.1)

From: solution-architect (on the Owner's instruction, Q-162) · To: backend-engineer, web-engineer, mobile-engineer · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- The Owner decided (2026-10-02) that account settings have no country field, because the platform serves Georgia only.
- Contract **1.3.1**: `Me.countryCode` and `MeUpdateRequest.countryCode` are marked `deprecated: true`. They are
  not removed, because ADR-014 §5 allows only additive changes in v1. `verify:final`: 0 errors, 715/715 covered.
  `pnpm gen` done.
- Web: the Country select is gone from `/account/settings`, and the Country row is gone from the edit-profile
  card. E2E updated: `account-settings.spec.ts` and `edit-profile.spec.ts` now check that it is absent.
- Spec 02 AC-29 is updated, Q-162 is recorded in open-questions.md, and the decision is in ADR-021.

## Files created/changed
- `docs/03-architecture/adr/021-no-country-in-account-settings.md` (new)
- `docs/04-api/src/schemas/d1.yaml`, `src/openapi.base.yaml`, the bundled `openapi.yaml`, `src/openapi.root.yaml`
- `packages/types`, `packages/api-client` (generated)
- `apps/web/src/components/account-settings/account-settings.tsx`, `components/profile-edit/card.tsx`, the two E2E specs
- `docs/02-specs/02-profiles-and-dashboards.md`, `docs/01-discovery/open-questions.md`

## What the next agent must do
- **Mobile 4.1.23/4.1.24:** no country in settings or on the profile card, and do not send `countryCode`.
- **Backend:** nothing now. `updateMe` still accepts the field for old clients; remove it with `/api/v2`, or earlier
  if the Owner approves a v1 exception.

## Open questions / risks
- Country still appears in `UserSummary` and the other schemas listed in ADR-021 §4. The Owner named only account
  settings. If country should go everywhere, that is a follow-up decision.
