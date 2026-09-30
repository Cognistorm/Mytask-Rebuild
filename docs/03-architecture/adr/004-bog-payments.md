# ADR-004: Bank of Georgia payments — standard BOG structure with clean provider interfaces
Date: 2026-09-28 | Status: accepted (Owner 2026-09-30)

> **Revised 2026-09-28** to match Owner decision Q-087: "Implement the standard BOG structure based on the available legacy code, without over-engineering payments. Provide clean interfaces and hooks so the lead developer can finalize the integration against the official BOG documentation." The signed-callback check and the sandbox question are left to the lead developer. Changed: Context, Decision (simplified to the legacy BOG flow plus the minimum needed to fix R-004/R-041), Consequences. Also reflects spec 05 (approved), spec 09 P-57 (renewal at the current price) and Q-081 (Premium sold by card in the mobile apps, ADR-016). Tables: `data-model.md` §3.J.

> **Revised 2026-09-30** after the P2-B5 security review: §3 adds the callback flood hardening (SEC-10: 64 KB body cap, payment looked up before any BOG call, unknown and final payments never call BOG, one verification job per payment, per-IP limit for non-BOG sources). Contract: `handleBogWebhook`, CONVENTIONS §10.

> **Revised 2026-09-30 (P2-B5 re-check, SEC-31)** and accepted by the Owner at the Phase 2 gate. §3: the order of the callback steps is now explicit (size cap → parse → look up our payment → store within caps → 200 → queue), and stored callbacks of a **known** payment are deduplicated by body hash and capped per payment per hour, so repeated callbacks for a paid payment cannot grow `payment_events` without bound. Contract: `handleBogWebhook` step 1, `AdminPaymentEvent.repeatCount` / `lastReceivedAt`; data model: `payment_events.body_sha256`, `repeat_count`, `last_received_at`.

## Context
- BOG is the only card gateway (Q-016): gig orders, project payments, custom offers, wallet top-ups (with the 2.5% surcharge S-012, Q-070), Premium subscriptions (no surcharge) on web **and in the mobile apps** (Q-081), and saved-card auto-renewal (BR-111, BR-112).
- **The legacy code already uses the standard BOG Online Payments flow** (`legacy/APP/config/bog.php:5-13`, `app/Services/Bog/BogPayment.php`): OAuth client-credentials token (`oauth2.bog.ge/.../token`), create order (`POST api.bog.ge/payments/v1/ecommerce/orders`, returns the hosted-page link), receipt / payment details (`GET /payments/v1/receipt/:order_id`), save card for recurring (`PUT /payments/v1/orders/:order_id/subscriptions`), charge the saved card (`POST /payments/v1/ecommerce/orders/:parent_order_id/subscribe`). The rebuild keeps this structure.
- What was wrong in legacy is around the flow, not the flow itself: credentials hard-coded (R-001); the `/success` return trusted query parameters and was not idempotent, so a top-up could be credited without payment (R-004); `callback_url` pointed to a route that did not exist (`BogPayment.php:14`); subscription activation depended on the browser session (R-041); junk payload values (`BogPayment.php:23-33`); a 0.01 GEL test switch (`config/bog.php:9`).
- The Owner does not want over-engineering and leaves the BOG specifics (signature header, sandbox, exact saved-card endpoint for a changed amount, card deletion) to the lead developer, who works from the official BOG documentation.
- Withdrawals are manual; BOG Payout must be pluggable later (Q-029).

## Decision
1. **Two small interfaces** in `apps/api/src/modules/payments` (the "hooks"). Business code depends only on these; everything BOG-specific lives in one adapter.
   ```ts
   interface PaymentProvider {
     createPayment(input: { paymentId; amountTetri; currency: 'GEL'; lines; locale; returnUrl; callbackUrl; saveCard: boolean }): Promise<{ providerOrderId; redirectUrl; expiresAt? }>;
     getPaymentDetails(providerOrderId): Promise<{ status: 'paid' | 'pending' | 'failed' | 'expired'; amountTetri; currency; externalOrderId; card?: { brand; mask; expiry } }>;
     verifyCallback(rawBody: Buffer, headers): { providerOrderId; trusted: boolean }; // hook: signature check if BOG sends one, else trusted = false
     chargeSavedCard(input: { parentOrderId; paymentId; amountTetri; callbackUrl }): Promise<{ providerOrderId }>;
     deleteSavedCard(parentOrderId): Promise<void>;
   }
   interface PayoutProvider { requestPayout(withdrawal): Promise<{ reference }>; getPayoutStatus(reference): Promise<'processing' | 'paid' | 'failed'> } // 'manual' now, 'bog_payout' later (S-033)
   ```
   Implementations: `BogPaymentProvider` (built from the legacy calls listed above; OAuth token cached until expiry) and `tools/bog-mock` (a small local server with the same HTTP shapes, a hosted page with "pay / fail" buttons and callbacks) so local development and CI never call BOG. `ManualPayoutProvider` marks nothing by itself: staff mark requests paid (spec 14).
2. **Payment record first, amount from the server.** Every payment starts as a `payments` row built from the server-side quote (purpose, payer, lines, fees with fee-rule versions, surcharge, discount, total; `data-model.md` §3.J). The amount sent to BOG is always `payments.total_tetri`; clients never send an amount. The create-order payload contains only real data (our payment id as the external order id, total, GEL, basket lines with real names, locale, callback URL, redirect URLs; no dummy discount/delivery/basket values, no 0.01 GEL switch in production builds).
3. **One rule that fixes R-004 and R-041: only a server-side check changes state.**
   - Callback endpoint `POST /api/v1/webhooks/bog` (public, raw body kept). Order of the steps: refuse bodies over 64 KB → parse (not JSON → 400) → look up our payment by the BOG order id → store the raw event in `payment_events` within the caps below → answer 200 → process asynchronously. Nothing is stored before the look-up.
   - **Flood hardening (SEC-10).** The callback is public and unsigned by default, so a fake-callback flood must never turn into BOG API calls, unbounded storage or queue load:
     1. **Body cap 64 KB** at Caddy and in the API (larger bodies are refused before parsing and not stored).
     2. **Look up first, store and call BOG later.** The handler extracts the BOG order id and looks up **our** `payments` row by `provider_order_id` before it stores anything or calls BOG. **Unknown ids** are never sent to BOG and never queued: they go to a capped log (at most 100 stored `payment_events` rows with `result = unknown_order` per hour; above that only a counter is incremented and one alert per hour goes to the S-100 recipients) and still get `200`.
     3. **Final payments are skipped.** If our payment is no longer `created` or `pending` (i.e. `paid`, `paid_unapplied`, `failed`, `expired`, `canceled`, `rejected`), the event is stored for staff with `result = duplicate` / `ignored` (within the caps of item 3a) and nothing is queued and BOG is not called.
     3a. **Storage caps per known payment (SEC-31).** Any user knows the BOG order id of their own paid payment (receipt, spec 05 AC-33), so callbacks for known payments are capped too, whatever the payment's status: a callback whose body has the same SHA-256 as one already stored for that payment is not stored again — that row's `repeat_count` is incremented and `last_received_at` updated; at most **20** distinct callback rows are stored per payment per rolling hour, above that only the `repeat_count` of the payment's latest callback row grows. Staff still see how many callbacks arrived; storage per payment is bounded (≤ 20 rows/hour of ≤ 64 KB).
     4. **One verification job per payment.** Pending payments enqueue `bog-callback` with the BullMQ job id `bog-verify:{paymentId}`, so any number of callbacks for the same payment result in at most one waiting or running job; the reconciliation job (§4) and staff "Check status" use the same job id.
     5. **Per-IP limit for non-BOG sources.** If the lead developer confirms BOG's callback source ranges (Q-087 table), those are exempt and every other source is limited to 60 requests per minute per IP (client IP per ADR-013 §14–§19); without confirmed ranges, all sources get a limit high enough for BOG's retries (600/min per IP). Over the limit → `429`, nothing stored.
     6. Payload fields are read only as needed (order id, status); nothing in the callback body is trusted for the amount, currency or status (the details call decides).
   - Processing always calls `getPaymentDetails` and applies the payment only if BOG reports it successful for the **same order, amount and currency**. `verifyCallback` is a hook: if the lead developer confirms that our merchant receives a signed callback, the signature is checked there too; if not, the callback is only a trigger for the details check. Either way the result is the same verified path.
   - The verified path, in one database transaction: payment `pending → paid` (compare-and-set), the ledger journal with `idempotency_ref = bog:{bogOrderId}:paid` (ADR-003), the business effect (item paid and HOLD funded, wallet credited, or subscription activated/extended). A payment that can no longer be applied is credited to the buyer's wallet instead (`paid_unapplied`, spec 05 P-40).
   - **Return URLs** (web `/payments/{id}/result`, mobile deep link, `url-map.md` §7) only display the status by polling `GET /api/v1/payments/{id}`. Opening or forging them changes nothing.
4. **Missed callbacks.** A worker job every 5 minutes calls `getPaymentDetails` for card payments still `pending` after 5 minutes and applies the same verified path; payments past their BOG lifetime become `expired`. This also covers the legacy "callback route missing" failure. No other reconciliation machinery is built at launch.
5. **Idempotency.** `POST /payments` requires an `Idempotency-Key` (one payment per checkout attempt). Journals are unique per BOG order id, so repeated callbacks, reconciliations and double clicks post once.
6. **Saved cards and renewals** (spec 09). A subscription purchase asks BOG to save the card (legacy "save card" call, made **after** the order exists, not before as in legacy); the parent order id and the masked card come from the verified payment details (`user_payment_methods`). The renewal job creates a `subscription_renewal` payment for the **current** price (P-57) and calls `chargeSavedCard`; the result goes through the same verified path; success extends, failure ends Premium at its end date (BR-112, AC-11). **Lead-developer item:** the legacy call `…/orders/:parent_order_id/subscribe` repeats the original amount (`BogPayment.php:59-84`); the adapter must use the BOG saved-card charge that accepts the current amount. If BOG cannot charge a different amount, the Owner must be told before slice 09 (handoff risk).
7. **Surcharge and fees** come from ADR-005 and are shown in the quote. S-012 applies to gig orders, project payments, custom offers and top-ups, never to subscriptions (Q-070). There is only one 2.5% surcharge (the legacy double fee is gone).
8. **Mobile apps.** The same BOG hosted page is opened in the in-app browser for services, top-ups and (Q-081) Premium; the app returns through `mytask://payments/{id}/result` and polls the API (`url-map.md` §7, ADR-016).
9. **Credentials** only from `.env`: `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, `BOG_API_BASE_URL`, `BOG_OAUTH_URL`, `BOG_CALLBACK_URL`, optional `BOG_CALLBACK_PUBLIC_KEY` (used only if signatures are confirmed). The leaked legacy credentials (R-001) are rotated at the final production deployment (Q-086).
10. **Admin visibility.** Staff with `payments.read` see payments, raw events and reconciliation results; staff with `payments.offline.approve` confirm or reject bank transfers when S-021 is ON (spec 05 AC-25/26).

### Items the lead developer finalises against the official BOG documentation (Q-087)
| Item | Default in this design |
|---|---|
| Does our merchant receive a signed callback, and with which header/key? | `verifyCallback` returns `trusted = false`; every callback is confirmed by `getPaymentDetails` |
| Sandbox / test environment | `tools/bog-mock` locally and in CI; staging uses a BOG test environment if available, otherwise real minimum-amount payments only with Owner approval (spec 05 AC-17) |
| Exact field names of create order, details and callback bodies | mapped inside `BogPaymentProvider` only |
| Saved-card charge with a changed amount (P-57) | adapter method `chargeSavedCard(amountTetri)`; confirm the endpoint |
| Deleting a saved card at BOG (spec 05 AC-35) | adapter method `deleteSavedCard`; if BOG has no such call, the card is deleted locally and never charged again |
| BOG order lifetime (for `expired`) | configurable constant in the adapter |

## Alternatives considered
- **A generic multi-gateway payment framework** — legacy had 28 gateways and used one; the Owner asked for no over-engineering. Rejected; the interface allows a second provider later.
- **Trust the return URL with a signed token** — a user who closes the tab would be charged but not credited, and it repeats R-004's weakness. Rejected.
- **Callback only, without the details check** — depends on a signature we cannot confirm yet. Rejected; the details check is one extra call.
- **BOG iframe / SDK inside our pages** — more PCI scope and mobile complexity. The hosted page is kept (legacy behaviour).

## Consequences
- Easier: the integration is the legacy BOG flow with safe edges; free top-ups and double credits are impossible; lost callbacks heal automatically; developers work locally with `bog-mock`.
- Harder: the result page must poll; the lead developer must confirm the items in the table before slice 05 ships.
- Must change: openapi.yaml (P2-B4) defines `/checkout/quote`, `/payments`, `/payments/{id}`, `/webhooks/bog`; `data-model.md` defines `payments`, `payment_lines`, `payment_events`, `user_payment_methods` (done).
