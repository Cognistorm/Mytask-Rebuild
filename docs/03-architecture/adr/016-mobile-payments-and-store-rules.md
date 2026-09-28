# ADR-016: Payments inside the mobile apps (App Store / Google Play rules)
Date: 2026-09-28 | Status: proposed — **needs an Owner decision** (see handoff)

## Context
- The mobile app must offer the same flows as the web (vision goal 2): buying gigs, paying projects and custom offers, wallet top-up, Premium subscription (monthly/yearly), Premium with points.
- Apple App Store Review Guidelines: digital content and features unlocked inside the app (including subscriptions) must be sold with In-App Purchase (3.1.1); goods and services consumed **outside** the app (e.g. a human freelancer's work) must use other payment methods such as a card (3.1.3(e) / 3.1.5 context). Google Play's Payments policy is similar: digital goods and subscriptions use Google Play Billing, physical goods and services outside the app do not.
- Premium (proposals, Top badge and ranking boost, viewing proposals, unmasked usernames — spec 00 §2) is a **digital entitlement used inside the app**, so selling it through BOG inside the store apps is likely to be rejected in review. Gig orders, project payments and custom offers pay for human services delivered outside the app, so BOG card payment is the correct method there. Wallet top-ups fund those services; they are probably acceptable but are a review risk if the wallet could buy digital items (in legacy, Premium is bought only by BOG card or points, BR-111, BR-114; spec 09 must confirm the wallet stays excluded).
- Store rules differ by country and change over time; the final judgement is the store reviewers'.

## Decision (proposed)
1. **Service payments in the app use BOG** exactly like the web: the API creates the intent (ADR-004), the app opens the BOG hosted page in the system browser / in-app browser (`expo-web-browser`), BOG redirects to a universal link / app deep link, and the app polls `GET /payments/{id}`. No store billing for gigs, projects, offers or top-ups.
2. **Premium at launch (recommended option A):** the mobile app shows the user's Premium status, benefits, points balance and allows **buying Premium with points** (no money changes hands), but does **not** sell Premium for money and does not link out to a web purchase page (anti-steering rules). Users buy or renew Premium on the website. The Premium entitlement is server-side, so a web purchase unlocks the app immediately.
3. **Later (option B, if the Owner wants in-app sales):** add a `StoreBillingProvider` (Apple StoreKit 2 + App Store Server Notifications v2; Google Play Billing + Real-time Developer Notifications) that grants the same server-side Premium entitlement. The store takes 15% (small-business / subscription programmes) to 30%; prices per store would be separate `fee_rules`/plan prices; renewal is done by the store (our BOG renewal job skips those subscriptions; our reminder email may not apply). The data model reserves `subscription.provider = bog | points | apple | google | admin_gift`.
4. The architecture does not change between A and B; only a provider and admin reporting are added.

## Alternatives considered
- **Sell Premium via BOG inside the app** — lowest fee, but high risk of App Store rejection or later removal. Not recommended.
- **Hide everything money-related in the app** — breaks the vision (buyers must be able to pay for gigs in the app). Rejected.
- **Web-only app (PWA)** — avoids store rules but loses push reliability on iOS and store presence. Rejected.

## Consequences
- Option A: no store fees; app review is safer; users cannot pay money for Premium in the app (they can with points).
- Option B: in-app convenience; 15–30% store commission on Premium sold in the app; extra reconciliation.
- Must change: spec 09 states which Premium purchase methods exist per platform; openapi.yaml marks subscription purchase endpoints as web-only at launch (the API does not enforce the platform — this is a presentation decision — but mobile does not show them).
