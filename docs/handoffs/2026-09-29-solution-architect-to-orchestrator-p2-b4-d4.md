# Handoff: solution-architect → orchestrator — P2-B4 group run D4 (specs 06, 12, 13 + spec 16 delegations)
Date: 2026-09-29 | Task: P2-B4 part 2, group D4 | Result: `npm run verify:group -- D4` → **PASSED** (build, both lints, check-contract 0 errors / 0 warnings, check-coverage 0 errors; 29 warnings, all "reserved operation of D1/D2/D3/D5/D6 not in the bundle yet")

## What I did
- Wrote the D4 part of the contract: cart, gig orders, the **single escrow lifecycle** `/escrows/{escrowId}` (read, deliveries, revision requests, completion) shared by gig order items, contract payments (D5) and custom offers, custom offers and offer requests, refund requests, disputes, unblock requests, and their admin endpoints.
- **68 operations** (43 user, 25 staff) on 60 paths, 86 schemas (incl. `D4ErrorCode` with 15 codes), 7 realtime events.
- All 10 D4 reserved operations were created exactly as listed: `getEscrow`, `listEscrowDeliveries`, `createEscrowDelivery`, `createEscrowRevisionRequest`, `completeEscrow`, `createRefundRequest`, `createUnblockRequest`, `adminListEscrows`, `adminReleaseEscrow`, `adminRefundEscrow`.
- No pay endpoints. Paying goes through D3 `createCheckoutQuote` / `createPayment`, and the coverage rows cite them. Threads are D5 conversations, embedded as `ConversationRef`. Timers are worker jobs only: `escrow-auto-release`, `refund-auto-reject`, `offer-expiry` (ADR-008).
- Money operations (`x-money`, Idempotency-Key, 409 and 422): `cancelOrderItem`, `completeEscrow`, `cancelCustomOffer`, `acceptRefundRequest`, `adminReleaseEscrow`, `adminRefundEscrow`, `adminResolveDispute`, `adminApproveUnblockRequest`. All of them use the mutually exclusive refs `escrow:{id}:release` and `escrow:{id}:refund`. The staff money actions have `stepUp: true` (spec 16 AC-7) and `x-audit`.
- Every item carries server-computed action flags (`actions`, `escrowActions` with `revisionsLeft`, `refundAvailableAt`, `unblockAvailableAt`), so clients never re-derive rules.
- The spec 11 ACs on delivery, revision, completion and auto-release are added to the escrow operations' `x-covers` (11 AC-32…AC-39), as CONVENTIONS §5.2 requires.

### Coverage totals
| File | ACs | API (incl. API+JOB) | NOT-API | DELEGATED |
|---|---|---|---|---|
| coverage/06.md | 45 | 42 | 3 (ui AC-5, email AC-10, job AC-37) | 0 |
| coverage/12.md | 36 | 35 | 1 (migration AC-36) | 0 |
| coverage/13.md | 34 | 32 | 2 (email AC-22, migration AC-34) | 0 |
| coverage/16-d4.md | 7 (19, 24, 31, 38, 39, 40, 41) | 7 | 0 | 0 |

## Files created/changed
- `docs/04-api/src/paths/d4-orders-offers-refunds.yaml`
- `docs/04-api/src/schemas/d4.yaml`
- `docs/04-api/src/events/d4.yaml`
- `docs/04-api/coverage/06.md`, `12.md`, `13.md`, `16-d4.md` (new)
- This handoff. Nothing else was touched, and nothing was committed.

## What the next agent must do
### Requests to the integration run
1. **Cross-group x-covers.** In `--final` mode, these cause errors if missing:
   - **D3** must list `06 AC-6`, `06 AC-7`, `06 AC-8`, `06 AC-9`, `06 AC-11`, `12 AC-1`, `12 AC-13`, `12 AC-14`, `12 AC-15`, `12 AC-17`, `12 AC-19` on `createCheckoutQuote` / `createPayment` / `handleBogWebhook` / `getPayment`, whichever apply to each row.
   - **D5** must list `06 AC-40`, `06 AC-41`, `12 AC-24`, `13 AC-19`, `13 AC-21` on `createConversationMessage` / `getConversation` / `adminGetConversation` / `adminCreateConversationMessage`.
   - **D2** must list `12 AC-35` on `createReview`.
2. **D3 returns D4 error codes.** `createPayment` returns `ORDER_ITEMS_NO_LONGER_AVAILABLE` ("Pay" again on an order, spec 06 AC-11) and `OFFER_NO_LONGER_AVAILABLE` (paying a withdrawn or expired offer, spec 12 AC-17/AC-18). Both are defined in `D4ErrorCode`, and D3 should reference them rather than define duplicates.
3. **D6 `adminUpdateSetting`.** When S-025 goes OFF → ON, it must run the ADR-008 §3 bulk update in the same transaction (spec 06 AC-37; my row is `NOT-API:job`). D6 should say so in the operation description.
4. **D5 contracts.** D5 should embed `escrow: EscrowSummary` and `conversation: ConversationRef`, and point to `getEscrow` for actions. `EscrowActions` lives in `schemas/d4.yaml` and D5 cannot `$ref` it. If contracts should show the same action flags, **promote `EscrowActions` (and optionally `RefundRequestRef` / `UnblockRequestRef`) to the shared components**.
5. **D1 public config.** It must expose S-034 (custom offers on/off, for the buttons in spec 12 AC-1 and spec 08 AC-27), S-025 and S-029 (whether unblock requests are available), and S-026 if clients show the period length. S-035 can stay staff-only.
6. **Realtime.** Add the 7 D4 events to realtime.md §6: `cart.updated`, `order.item_updated`, `escrow.updated`, `offer.updated`, `offer.request_updated`, `refund.updated`, `unblock.updated`. All use the room `user:{userId}`. D6's admin queue counters (open disputes, pending unblock requests, offers pending approval) can use `totalCount` from `adminListDisputes`, `adminListUnblockRequests` and `adminListCustomOfferApprovalQueue`.
7. **HOLD list (spec 05 AC-28) is D3's.** Its data comes from escrows with `status = funded` for the freelancer. No D4 endpoint is needed, but D3 should build it from the same escrow read model.

## Open questions / risks (for `docs/01-discovery/open-questions.md`; covered with the safest reading)
- **Q-D4-1 "Overdue" filter in Admin → Escrows (spec 16 AC-39) is not defined.** I read it as: funded escrows whose auto-release deadline has passed (for example while S-025 is OFF), **or** whose expected delivery date has passed without a delivery. Owner to confirm, or pick one of the two.
- **Q-D4-2 "Refund buyer" while a dispute is open.** Spec 13 AC-30 says "with or without a refund request", and AC-29 excludes disputes only for "Release funds". I made `adminRefundEscrow` refuse with `422 DISPUTE_OPEN` so that disputes are decided only through `adminResolveDispute` (AC-19: "only disputes are decided"). Owner to confirm.
- **Q-D4-3 Wished delivery days in offer requests.** No range is given (spec 12 AC-3). I assumed 1–365, the same as offer delivery time. The budget idea must be positive, with no minimum given.
- **Q-D4-4 No text keys for two refusals.** (a) An offer sent to someone without a direct conversation or an open request (R-C2): I return `422 BUSINESS_RULE_VIOLATION`, and a `t_*` key is needed. (b) A revision request during a dispute (spec 13 AC-13): I return `DISPUTE_OPEN` and reuse `t_cannot_complete_during_dispute`; the Owner may want a separate key.
- **Q-D4-5 Offer price maximum.** The spec only limits the typed text (≤ 10 characters, ≤ 2 decimals). The API gets integer tetri, so I set the maximum to the largest value such text can express (999,999,999,900 tetri) and the minimum to 100. Clients validate the text format.
- **Q-D4-6 Order details length.** The 5,000 limit is enforced on the submitted (formatted) string, as in data-model (`order_details ≤ 5,000`). If the Owner means 5,000 *visible* characters, the API must measure after stripping markup.
- **Risk: attachment access for moderators.** Content Moderators have `offers.moderate` but not `orders.read`, so they can see offers in the approval queue but cannot download offer attachments (`adminDownloadCustomOfferFile` requires `orders.read`, per the one-permission rule). Options: grant CM `orders.read`, or accept this.
- **Technical guards (not business rules).** Cart merge/preview accept at most 100 lines, and a line at most 50 upgrade ids. P2-B5 may adjust these.
- **Naming.** Order items are addressed as `/orders/{orderId}/items/{orderItemId}`, with the list at `GET /orders/items` and lookup by uid (or legacy item id for url-map 301s) at `GET /orders/items/lookup`. The admin approval queue is a separate operation (`adminListCustomOfferApprovalQueue`, `offers.moderate`) from the offers list (`orders.read`), because each operation has exactly one permission.
