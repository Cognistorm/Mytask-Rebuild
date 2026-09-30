# ADR-016: Payments inside the mobile apps (App Store / Google Play rules)
Date: 2026-09-28 | Status: accepted (Owner 2026-09-30)

> **Revised 2026-09-28** to match Owner decision Q-081: Premium is **also sold by BOG card inside the mobile apps**, not only on the web or with points. The earlier recommendation (web-only Premium sales) is withdrawn. The app-store billing risk is documented below, and setting **S-126 `subscriptions.mobile_card_purchase.enabled`** (spec 00, spec 09 AC-7, P-60) is the fallback switch. Changed: whole Decision, Consequences.

## Context
- The mobile app must offer the same flows as the web (vision goal 2): buying gigs, paying projects and custom offers, wallet top-up, Premium subscription (monthly/yearly), Premium with points.
- **Owner decision Q-081:** Premium can be bought directly with a BOG card in the mobile app, as on the web.
- Store rules (summary; the reviewers' judgement is final and the rules change over time):
  - Apple App Store Review Guideline 3.1.1: digital content, features and subscriptions unlocked **inside the app** must use In-App Purchase. Guideline 3.1.3(e) / 3.1.5: goods and services consumed **outside** the app (such as a freelancer's human work) must use other payment methods (card).
  - Google Play Payments policy: digital goods and subscriptions use Google Play Billing; physical goods and services consumed outside the app do not.
  - Some countries have regulated exceptions (alternative or external payment programmes). Georgia is not known to be one of them; the lead developer re-checks at submission.
- Premium (proposals, Featured badge and ranking boost, viewing proposals, unmasked usernames, withdrawal fee 0%; spec 00 §2) is a digital entitlement used inside the app. Gig orders, project payments, custom offers and wallet top-ups pay for human services delivered outside the app. Wallet money cannot buy Premium (spec 05 R-P1), which keeps top-ups on the "services" side.

## Decision
1. **Service payments in the app use BOG, exactly like the web** (gig orders, project payments, custom offers, wallet top-ups): the API creates the payment (ADR-004), the app opens the BOG hosted page in the in-app browser (`expo-web-browser` auth session), BOG redirects to `https://mytask.ge/app-return/payments/{id}`, which bounces to `mytask://payments/{id}/result`, and the app polls `GET /payments/{id}` (`url-map.md` §7). No store billing for these.
2. **Premium in the app is sold by BOG card (Q-081)**, through the same flow and the same API endpoints as the web: monthly or yearly, no surcharge (Q-070), promo codes allowed (spec 09), card saved for auto-renewal, renewal reminders and renewals exactly as on the web (spec 09 AC-10…AC-14). "Buy with points" (monthly) and the status screen are also in the app.
3. **Fallback switch S-126 `subscriptions.mobile_card_purchase.enabled`** (boolean, default ON, public setting exposed by `GET /config/public`):
   - ON: the app shows the card purchase of Premium.
   - OFF: the app hides the card purchase (and the promo field that belongs to it) and keeps "Buy with points", the status and cancel/resume; the web is not affected. The app must not show a link or text that steers users to buy on the website while OFF (anti-steering rules).
   - The switch is read by the app at start and on foreground, so it takes effect without an app release (a rejected build can be resubmitted with the purchase hidden by the server).
   - The API enforces it too: while OFF, `POST /payments` with purpose `subscription` from a mobile client (`X-MyTask-Client: ios|android`, sent by `packages/api-client`) is refused with `FEATURE_DISABLED`. Renewals of subscriptions already bought in the app continue (they are server-side card charges, not in-app purchases).
4. **If a store insists on its own billing later:** add a `StoreBillingProvider` (Apple StoreKit 2 + App Store Server Notifications v2; Google Play Billing + Real-time Developer Notifications) that grants the same server-side Premium entitlement. The data model already reserves `subscriptions.source = apple | google` (`data-model.md` §3.L); store-billed subscriptions are renewed by the store, so the BOG renewal job and our reminder skip them. Store prices would be separate plan prices. This is a later decision for the Owner, not built now.

### Risk (documented for the Owner)
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Apple or Google rejects the app (or a later update) because Premium, a digital subscription, is sold by card inside the app | **Medium to high** for Apple (guideline 3.1.1); medium for Google | Launch delay of the app; or removal of an update | Switch S-126 OFF and resubmit (no code change); consider option 4 later |
| A store accepts the first version but flags it on a later review | medium | the same | the same; the switch works without an app release |
| Store policy changes (e.g. new external-payment programmes) | low | could allow card sales with a store commission | re-check at each submission |
Accepted by the Owner (Q-081). The first app submission should be prepared with both paths tested (S-126 ON and OFF).

## Alternatives considered
- **Web-only Premium sales, points in the app** (previous recommendation) — safest for review, but the Owner chose in-app card sales (Q-081). Kept as the S-126 = OFF mode.
- **Apple/Google in-app purchase now** — review-safe for Premium, but 15–30% store commission, separate prices and reconciliation. Kept as option 4 for later.
- **Hide everything money-related in the app** — breaks the vision (buyers must be able to pay for gigs in the app). Rejected.
- **Web-only app (PWA)** — avoids store rules but loses reliable push on iOS and store presence. Rejected.

## Consequences
- Easier: one payment flow and one set of endpoints for web and app; the Owner can react to a store decision in minutes with S-126.
- Harder: store review risk (above); QA must test the app with S-126 ON and OFF; the anti-steering rule must be respected in app texts when OFF.
- Must change: spec 09 AC-7 already describes the behaviour; openapi.yaml (P2-B4) documents the `FEATURE_DISABLED` case for mobile subscription payments and exposes S-126 in the public config; the mobile app reads the switch at start and on foreground.
