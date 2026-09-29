# Coverage — spec NN <spec title>
Group: Dn | Spec: `docs/02-specs/NN-<name>.md` (status: approved) | Written: YYYY-MM-DD by solution-architect (P2-B4 Dn)
Totals: ACs N · API a · NOT-API b · DELEGATED c   (must equal the output of `node scripts/check-coverage.mjs --group Dn`)

Rules: docs/04-api/CONVENTIONS.md §12. One row per AC, in AC order, no AC skipped. Operation ids in backticks.
Coverage values: `API` · `API+JOB` · `NOT-API:ui` · `NOT-API:job` · `NOT-API:email` · `NOT-API:infra` · `NOT-API:migration` · `NOT-API:policy` · `NOT-API:content` · `DELEGATED:Dn`.

| AC | Summary (≤ 12 words) | Coverage | Operation(s) / reason |
|---|---|---|---|
| AC-1 | Guest adds gig with upgrades to cart | API | `putCartItem`, `getCart` |
| AC-4 | Cart shared by web and mobile, guest cart merged at login | API | `getCart`, `mergeCart` |
| AC-7 | Order created from cart with snapshot | API | `createCheckoutQuote`, `createPayment` (D3, reserved) |
| AC-18 | Auto-release 72h after delivery | API+JOB | job `escrow-auto-release` (ADR-008 §…); state in `getEscrow` (`autoReleaseAt`) |
| AC-40 | Email wording of the delivery notice | NOT-API:email | Template of spec 15 EV-41, sent by the notification worker; triggered by `createEscrowDelivery` |
| AC-44 | Order list layout matches legacy | NOT-API:ui | Client layout; data from `listOrders` |
| AC-45 | Legacy orders migrated with statuses | NOT-API:migration | ETL (data-model §12); readable through `getOrder` |
| AC-46 | Staff "Release funds" on a dispute | DELEGATED:D4 | `adminReleaseEscrow` (reserved) |

<!-- Example rows above show the format only; replace them with the real rows of the spec. -->

## Notes for the integration run
- (optional) rows that depend on another group's operation that is not reserved, new shared schemas or error codes requested, contradictions found in the specs (never invent rules: write them to docs/01-discovery/open-questions.md through the handoff).
