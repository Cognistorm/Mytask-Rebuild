## What I did
- Contract **1.3.2** (additive, ADR-022): `createPortfolioItem` and `updatePortfolioItem` share `x-rate-limit` **30 saves per user per hour**, every attempt counts (also refused ones), with a `429` response (SEC-69).
- Shared report limit text on `createUserReport`, `createGigReport`, `createProjectReport`, `createProposalReport`: "every attempt counts, before the target check" (I-31; behaviour unchanged).
- ADR-002 §2: contract validation runs before authentication (I-30; no contract change).
- Owner question **Q-166**: send EV-14 only when an item *enters* `pending` (recommended) or on every save as legacy does.
- `npm run verify:final` 0/0 (715/715); `pnpm gen` (types + api-client 1.3.2); repo typecheck green; API contract test green.

## Files created/changed
- `docs/03-architecture/adr/022-portfolio-save-rate-limit.md` (new), `docs/03-architecture/adr/002-auth-sessions-legacy-passwords-2fa.md`
- `docs/04-api/src/openapi.base.yaml`, `src/paths/d1-…`, `d2-…`, `d5-…`, bundle `openapi.yaml`, root
- `packages/types/src/generated/*`, `packages/api-client/src/generated/operations.ts`
- `docs/01-discovery/open-questions.md` (Q-166)

## What the next agent must do
- **backend (ROADMAP 4.2.0d):** a Redis counter per user id shared by both operations, checked first in the handlers (before validation), `429 RATE_LIMITED` + `Retry-After` on the 31st attempt in the hour (pattern: `report-limiter.ts`); tests for the 31st save and the shared key. EV-14 "only on entry into `pending`" **only if the Owner answers Q-166 (a)**; otherwise leave EV-14 as is. Plus I-33.
- **web / mobile:** nothing new; the existing 429 toast covers it.

## Open questions / risks
- Q-166 (Owner). The number 30 is the architect's choice from the review's suggestion; it can be changed in the contract text without a breaking change.
