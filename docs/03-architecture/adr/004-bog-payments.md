# ADR-004: Bank of Georgia payments — server-side verification, callbacks, idempotency, saved cards, payout-ready
Date: 2026-09-28 | Status: proposed

## Context
- BOG is the only card gateway (Q-016): gig orders, project payments, custom offers, wallet top-ups (with the 2.5% surcharge S-012, Q-070) and subscriptions (no surcharge), plus saved-card auto-renewal (BR-111, BR-112).
- Legacy defects: OAuth credentials hard-coded (R-001); `/success` return handler unauthenticated, trusts `key`/`type` query parameters, never asks BOG for the status and is not idempotent — a user can top up without paying (R-004); `callback_url` points to a route that does not exist (`BogPayment.php:14`); subscription activation depends on the browser session (R-041); broken column in the gig success path (R-016); junk payload fields (`BogPayment.php:23-33`).
- BOG's Online Payments API (`api.bog.ge/payments/v1`) uses OAuth 2.0 client credentials, creates an order that returns a redirect URL, sends a **POST callback** with body `{event: "order_payment", zoned_request_time, body}` and an optional `Callback-Signature` header (SHA256withRSA over the raw body, verified with BOG's published public key), and offers a **Get Payment Details** endpoint; BOG's own documentation tells merchants to use that endpoint when a callback is not received. Saved cards, recurring/automatic payments and refunds are documented features. (Source: api.bog.ge/docs, Payments → callback, introduction; exact field names are confirmed in Phase 4 slice 05.)
- Withdrawals are manual now; BOG Payout must be pluggable later (Q-029).

## Decision
1. **Provider interfaces** in `apps/api/src/modules/payments`:
   - `PaymentProvider`: `createPayment(intent)`, `getPaymentDetails(providerOrderId)`, `chargeSavedCard(parentOrderId, intent)`, `deleteSavedCard()`, `refund()` (not used today: refunds go to the wallet, Q-010, but the method exists).
   - `PayoutProvider`: `manual` (default, S-033) and later `bog_payout`.
   - Implementations: `BogProvider` (live/test) and `tools/bog-mock` (a small local HTTP server that imitates BOG: OAuth, create order, hosted page with "pay / fail" buttons, signed callback using a local test key pair, payment details). Local development and CI never call BOG.
2. **Payment intent.** Every payment starts as a `payment_intent` row created by the API from a server-side quote: purpose (gig_order, project_payment, custom_offer, topup, subscription, subscription_renewal), payer, amount breakdown in tetri (price, surcharge, fees, discount) and fee-rule versions, status (`created → pending → paid | failed | expired | canceled`), BOG order id. The amount sent to BOG is always the intent total computed by the API; clients never send an amount.
3. **Only verified information changes state.**
   - Callback endpoint `POST /api/v1/webhooks/bog` (public, no auth, raw body kept): verify `Callback-Signature` with the BOG public key from configuration. If BOG does not send a signature for our merchant, treat the callback only as a **hint**.
   - In both cases, the API calls **Get Payment Details** server-side and requires: BOG order id known, our intent id matches (external order id), amount and currency equal the intent, status final-successful. Only then, in one DB transaction: intent `paid` (compare-and-set from `pending`), ledger journal with `idempotency_ref = bog:{bogOrderId}:paid` (ADR-003), business effect (order/offer/project payment paid and escrow funded, wallet credited, subscription activated or extended).
   - The callback always answers 200 after it has durably recorded the raw event (a `payment_events` table), so BOG does not retry forever; processing is idempotent.
   - **Return URLs** (`/payments/{intentId}/result` on web, a deep link on mobile) only display the status by polling `GET /api/v1/payments/{intentId}`. They never change state (R-004).
4. **Reconciliation.** A worker job every few minutes asks BOG for the details of intents still `pending` after N minutes (e.g. 5) and applies the same verified path; intents older than the BOG order lifetime become `expired`. This also covers the "missing callback route" legacy failure.
5. **Idempotency.** `POST /payments` requires `Idempotency-Key`; one intent per checkout; if BOG supports an idempotency header on create-order we send the intent id there too. Repeated callbacks or reconciliations post once (unique `idempotency_ref`).
6. **Saved cards and renewals.** Subscriptions are paid with BOG's "save card" option; the resulting parent order id and masked card metadata are stored (`user_payment_methods`, no card numbers). Renewal (worker, ADR-008) creates a `subscription_renewal` intent and calls `chargeSavedCard`; the result is verified exactly like any payment; success extends the subscription, failure cancels (BR-112). Activation never depends on a browser session (R-041).
7. **Surcharge and fees** are computed by ADR-005 and shown in the quote. S-012 applies to gig orders, project payments, custom offers and top-ups; not to subscriptions (Q-070). No second BOG gateway fee exists (the legacy double 2.5% is gone).
8. **Credentials.** `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, `BOG_API_BASE_URL`, `BOG_CALLBACK_PUBLIC_KEY` and the public callback URL come from `.env` only (ADR-013). The leaked legacy credentials (R-001) must be rotated by the Owner with BOG before go-live.
9. **Payload hygiene.** The create-order payload contains only real data (our intent id, amount, currency GEL, basket lines with real item names, locale, callback and redirect URLs). The legacy dummy basket/discount/delivery values are not carried over.
10. **Admin visibility.** Staff with `payments.read` see intents, raw callback events and reconciliation results; staff with `payments.offline.approve` confirm bank-transfer intents when S-021 is ON.

## Alternatives considered
- **Trust the return URL with a signed token** — still depends on the user's browser returning; a user who closes the tab would be charged but not credited. Rejected; return is display only.
- **Callback only, without Get Payment Details** — fine when signatures are always present and verified, but a double check is cheap and protects against a misconfigured or unsigned callback. Kept both.
- **Polling only (no callback)** — slower confirmation for users. Callback + reconciliation is the standard.
- **Pay via BOG iframe/SDK inside our page** — tighter UX, but more PCI scope and more mobile complexity. The hosted page is kept (legacy behaviour).

## Consequences
- Easier: free top-ups and double credits become impossible; lost callbacks are healed automatically; local development needs no bank.
- Harder: the payment status page must poll; BOG test credentials or a very small real test is needed in staging (Owner approval, real money).
- Must change: spec 05 describes statuses and messages for pending/failed/expired payments; openapi.yaml defines `/checkout/quote`, `/payments`, `/payments/{id}`, `/webhooks/bog`; data-model.md adds `payment_intents`, `payment_events`, `user_payment_methods`.
- Risk: BOG API details (signature presence for our merchant contract, saved-card endpoint names) are confirmed against the merchant's current BOG documentation during slice 05; this ADR does not depend on the exact names.
