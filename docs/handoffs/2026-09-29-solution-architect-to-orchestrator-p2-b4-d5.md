# Handoff: solution-architect → orchestrator — P2-B4 group run D5 (specs 08, 10, 11 + spec 16 ACs 19, 22, 23, 31, 38, 65)
Date: 2026-09-29 | Task: P2-B4 part 2, group D5 (messaging, projects, proposals, awards, contracts)

## What I did
- Wrote the D5 part of the API contract following CONVENTIONS.md §18: **58 operations on 55 paths** (40 user operations, 18 staff operations), 94 D5 schemas (incl. `D5ErrorCode` with 7 domain codes, stub removed), 12 realtime events.
- All 6 reserved D5 operations are written exactly as reserved: `getConversation`, `listConversationMessages`, `createConversationMessage`, `adminGetConversation`, `adminListConversationMessages`, `adminCreateConversationMessage`.
- One conversation model for every thread (Inbox `direct`, `order_item`, `project`, `custom_offer`, `refund`). `createConversationMessage` is the only user write path. It applies the per-kind rules: 5,000 characters and one attachment for direct chats, 750 characters and text only for item threads, and the thread open/closed states from specs 06, 11, 12 and 13. It also lists every thread notification (EV-45/46/48/49/77/89/100/101).
- Staff access to conversations: `chat.read` (read, audited on every open, message read and file download via `x-audit`), `chat.moderate` (hide and unhide with an internal reason), and `refunds.thread.write` (staff messages only in open refund threads). Staff are never participants and never mark messages as seen.
- Payment is not written by D5. Contracts expose `payments[]` (`ContractPaymentLine`) with the id for `CheckoutTarget {purpose: contract_payment, contractPaymentId}`, plus `escrow: EscrowSummary|null`, `payment: PaymentSummary|null`, a `ConversationRef` and `ReviewRef[]`. Delivery, revision and completion are cited as D4's reserved `/escrows/{escrowId}` operations.
- Proposals require Premium on the server (`x-permission.plan: premium` on `createProposal` and `updateProposal` → `403 PREMIUM_REQUIRED`). The rules for who may see proposal details are enforced in `listProjectProposals` (`visibility: all | own_only`) and `getProposal`.
- Masked client usernames (R-P6, 02 AC-41): masked viewers get neither the real username nor the user id (`ProjectClient.user = null`). "Chat now" uses `createConversation {projectId}`.
- Spec 10 AC-3/AC-4 (PROPOSED P-136) use `VALIDATION_FAILED` with D1's shared Georgian-field messageKeys (`t_validator_georgian_field_characters`, `t_validator_georgian_letter_required`). No regex pattern is used, so the character set stays one server rule.
- `npm run verify:group -- D5` → **PASSED**. Build, both lints and check-contract have 0 errors and 0 warnings. check-coverage has 0 errors and 17 warnings, all of them "reserved operation of D2/D3/D4 not in the sandbox bundle yet", which is expected.

### Coverage totals
| Spec | ACs | API | NOT-API | DELEGATED |
|---|---|---|---|---|
| 08 | 34 | 28 | 6 | 0 |
| 10 | 29 | 26 | 3 | 0 |
| 11 | 45 | 43 | 2 | 0 |
| 16 (D5 part) | 6 | 6 | 0 | 0 |
| **Total** | **114** | **103** | **11** | **0** |

## Files created/changed
- `docs/04-api/src/paths/d5-messaging-projects-proposals.yaml`
- `docs/04-api/src/schemas/d5.yaml`
- `docs/04-api/src/events/d5.yaml`
- `docs/04-api/coverage/08.md`, `coverage/10.md`, `coverage/11.md`, `coverage/16-d5.md`
- this handoff. Nothing committed. I did not touch shared files, other groups' files, specs, ADRs or legacy.

## What the next agent must do (integration run)
### Requests to the integration run
1. **Cross-group `x-covers`** (coverage rows already name these reserved operations):
   - D3: `createCheckoutQuote` 11 AC-26; `createPayment` 11 AC-27…AC-30; `getPayment` 11 AC-29; `handleBogWebhook` 11 AC-29, AC-30.
   - D4: `createEscrowDelivery` 11 AC-32; `createEscrowRevisionRequest` 11 AC-33; `completeEscrow` 11 AC-36, AC-37, AC-38; `adminReleaseEscrow` 11 AC-38; `getEscrow` 11 AC-39; `createRefundRequest` 11 AC-34.
   - D2: `createReview` 11 AC-44.
2. **D4 writes thread content through the D5 service**, not through REST:
   - `createEscrowRevisionRequest` stores the revision message in the item thread (`MessageKind revision_request`, 06 AC-26).
   - Custom offer / offer-request creation posts `offer_card` / `request_card` messages into the direct conversation (spec 12 AC-3, AC-9).
   - Deliveries and completions may add `system_event` lines.
   - These cause `message.created`. The event file lists them as `job:thread-system-messages`. D4 should add `x-emits: [message.created]` where it applies.
3. **`contract.status_changed`** is also caused by D3 payment verification (`createPayment` wallet path, `handleBogWebhook`) and by D4 escrow operations (delivery, revision, completion, refund, auto-release). The event file declares job placeholders (`job:payment-apply`, `job:escrow-state-sync`, `job:escrow-auto-release`). At integration, either add the D3/D4 operationIds to `emittedBy` (and their `x-emits`) or keep them as a service-level emission.
4. **D4 staff delivery download.** Spec 11 AC-35 and spec 16 AC-38 staff access to delivery files need D4's `GET /admin/escrows/{escrowId}/files/{fileId}/download` (CONVENTIONS §4.2). Please confirm D4 wrote it.
5. **New shared schema (optional).** A shared `RatingSummary` for freelancer ratings on proposal cards (spec 11 AC-10). D5 uses a local stand-in, `ProposalFreelancerRating {averageTenths, count}`, because `number` is forbidden. D2 probably needs the same shape.
6. **`UserSummary` and masking.** `UserSummary.id` is required, but R-P6 forbids returning the user id to masked viewers. D5 therefore uses its own `ProjectClient`. Consider a shared masked-user shape, or document that `UserSummary` is never used for masked users.
7. **`x-permission.permissionAlternatives`** (new, non-validated key) on `adminGetConversation` and `adminListConversationMessages`: `chat.read`, or `refunds.thread.write` for `refund` threads (spec 16 AC-40 lets support staff with only `refunds.thread.write` read refund threads). This is similar to F0's `permissionByPurpose`. Please decide whether check-contract should validate it. See Q-D5-4 about AC-9.
8. **realtime.md §6:** add the 12 D5 events from `src/events/d5.yaml`. The typing and presence events have `emittedBy: job:realtime-gateway` (relayed client emits, no REST operation).
9. **D1 public config** must include the rows the clients read for chat and projects: S-034, S-094…S-099, S-075, S-076, S-078, S-041 (the attach picker list must equal the server list, 08 AC-8).

## Open questions / risks (for docs/01-discovery/open-questions.md)
- **Q-D5-1 S-075 OFF scope.** Spec 10 AC-1 says "every project URL and endpoint shows feature disabled", but EC-5 says "hired projects continue to payment, delivery, refund and completion through their direct links".
  - Safest reading used: S-075 toggles all `/projects/*` operations plus `createProposal`, `updateProposal` and `createAward`.
  - Not toggled: proposal withdraw/list/get, award accept/decline/revoke, all `/contracts` operations and threads.
  - Open: should a pending award still be acceptable while S-075 is OFF?
- **Q-D5-2 Masked client identity in chat.** Standard users may "Chat now" with a project client whose username is masked on the project page (Q-069b vs BR-015). The Inbox then shows the client's real username (spec 08 AC-19). Is that acceptable, or should the direct conversation keep the masking for such users?
- **Q-D5-3 Message for re-proposing after a declined award** (spec 11 AC-21, P-82). The spec gives no text key. I used `409 DUPLICATE` with `t_u_already_submitted_a_bid_to_this_project` as the closest legacy key; the product-analyst should confirm or add a key.
- **Q-D5-4 One permission per admin operation (spec 16 AC-9)** versus refund-thread reading. Spec 08 AC-29 gives `chat.read` access to all threads, while spec 16 AC-40 says `refunds.thread.write` alone can read refund threads. The operation checks exactly one permission, chosen by the conversation kind. Owner/D6 should confirm.
- **Q-D5-5 Attachments in item threads.** Specs 06, 11 and 12 describe thread messages as text only (≤ 750), and spec 13 excludes attachments explicitly. The contract allows attachments only in direct conversations.
- **Q-D5-6 Hiding a project with a pending award** (spec 10 AC-14 says "open proposals can no longer be awarded"). The spec does not say whether an award already waiting is revoked. The contract leaves it pending but not re-awardable; the Owner should decide.
- **Q-D5-7 Chat rate limit scope.** The 30 messages per minute limit (08 AC-12) is applied to all conversation kinds, not only direct chats.
- **Risk:** the thread-writability rules for order-item, offer and refund threads depend on D4 states. D5's service must read D4's item and refund status, so the backend needs a shared domain-service boundary (not HTTP).
