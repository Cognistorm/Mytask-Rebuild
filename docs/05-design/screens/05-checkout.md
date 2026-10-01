# 05 — Checkout (`/checkout`) and the shared payment block
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 06 AC-1…12 (cart, order creation, wallet/card paths, awaiting payment); 05 AC-1…8 (methods, quote, card fee, quote changed), AC-9…17 (BOG flow, result page), AC-18…19 (wallet, insufficient funds), AC-24 (bank transfer when S-021 ON). The same payment block serves project payments (11 AC-26…31) and custom offers (12 AC-12…17). Audit §3.12.

## Kept from the live site
- Cart slide-over from the header, then the `/checkout` page.
- A payment-method radio list (Wallet, BOG card).
- Order summary with the totals, the "Confirm"/"Pay" button and the "Your transaction is secure" line on the right.

## Changes
- Column order follows the approved specs 05/06: the **item list** is on the left, and the **payment block** (methods + breakdown + Pay) is on the right. On the live site the method list sat on the left. The totals and the pay button stay on the right, as live. This is a point for the Owner at the gate (00-README); swapping the method list back to the left is a layout-only change.
- Removed: the tax row, exchange rate and every non-BOG gateway (X-07, X-10).
- A card fee line appears only when Card is chosen (`t_card_fee_line`, S-012, 05 AC-6). Premium purchases have no card fee (05 AC-7).
- The Pay button shows the total in its label.
- Mobile: sticky total + "Pay" bar; the methods open in a BottomSheet.
- The "My shopping cart" heading loses its one-off red (audit §3.12).

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (solid)                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Checkout                                                                     │  h1
├──────────────────────────────────────────────┬───────────────────────────────┤
│ Your order (2 items)                          │ ┌ Payment (Card, raised) ────┐│
│ ┌ Item ─────────────────────────────────────┐ │ │ Payment method             ││
│ │ [thumb] Gig title (link)                  │ │ │ ( ) Wallet                 ││  RadioCard list
│ │         ◉ freelancer                       │ │ │     Available ₾1,240.00    ││
│ │         Base price             ₾250.00    │ │ │ (•) Card (Visa/Mastercard) ││
│ │         + Source file           ₾20.00    │ │ │     via Bank of Georgia    ││
│ │         Delivery 4 days · ↻ 3 revisions   │ │ │     Card fee 2.5% applies  ││
│ │         Item total             ₾270.00    │ │ │ ( ) Bank transfer          ││  only if S-021 ON
│ └───────────────────────────────────────────┘ │ │ ─────────────────────────  ││
│ ┌ Item … ───────────────────────────────────┐ │ │ Subtotal        ₾320.00    ││  DescriptionList;
│ └───────────────────────────────────────────┘ │ │ Card fee 2.5%     ₾8.00    ││  numbers from the
│ ← Back to cart                                │ │ ─────────────────────────  ││  API quote only
│                                               │ │ Total           ₾328.00    ││  priceLg
│                                               │ │ [ Pay ₾328.00   (lg)     ] ││
│                                               │ │ 🔒 Your transaction is secure│
│                                               │ └────────────────────────────┘│
└──────────────────────────────────────────────┴───────────────────────────────┘
```
Items 7/12, payment block 5/12. The payment block is sticky under the header on desktop so Pay stays in view for long carts.

For project payments and custom offers, the left column shows the contract or offer summary (project/offer title, freelancer, amount, delivery days, revisions) instead of the item list; the payment block is identical.

## Mobile web (360)
```
┌──────────────────────────────────┐
│ ‹  Checkout                      │
├──────────────────────────────────┤
│ Your order (2 items)             │
│ ┌ Item card ───────────────────┐ │
│ │ [th] Gig title               │ │
│ │ Base ₾250.00 · +Source ₾20.00│ │
│ │ 4 days · ↻ 3   Total ₾270.00 │ │
│ └──────────────────────────────┘ │
│ Payment method                   │
│ ┌──────────────────────────────┐ │
│ │ Card (Visa/Mastercard)   ▸   │ │  row opens BottomSheet with the
│ └──────────────────────────────┘ │  RadioCard list
│ Subtotal              ₾320.00    │
│ Card fee 2.5%           ₾8.00    │
│ 🔒 Your transaction is secure    │
├──────────────────────────────────┤
│ Total ₾328.00     [ Pay (lg) ]   │  StickyActionBar
└──────────────────────────────────┘
```

## Native app
- Opened from the Cart screen (header cart icon). Same content as mobile web.
- Card opens the BOG page in an in-app browser. The return is by deep link to the payment result screen (05 screens table, url-map §7).
- Wallet shows its result at once (05 AC-18).

## Payment result (`/payments/{id}/result`)
```
┌ Card (centred, max 480) ──────────────┐
│        ✓  (or ⏳ / ✕)                  │
│  Payment received                     │  processing: "Confirming your payment…"
│  ₾328.00 · Order #A1B2C3              │  (polling, 05 AC-12)
│  [ Go to my order ]   [ Home ]        │  failed/expired: [ Try again ]
└───────────────────────────────────────┘
```

## Components
Card, RadioCard, Price (`inline`, `large`), DescriptionList, Divider, Button `lg` (busy state), Banner (`warning` quote changed, `danger` errors, `info` bank-transfer instructions S-125), Link, BottomSheet (methods on phones), StickyActionBar, Skeleton, EmptyState (empty cart, result states), Toast.

## States
| State | What shows | AC |
|---|---|---|
| Loading quote | Breakdown lines as Skeleton; Pay disabled | 05 screens |
| Quote ready | Breakdown from the API; Pay shows the total | 05 AC-5 |
| Method changed | New quote requested; the card fee line appears or disappears; Pay disabled until the quote returns | 05 AC-6, AC-7 |
| Insufficient wallet balance | Wallet option shows `t_insufficient_funds_in_your_account` + "Top up" link; Pay disabled | 05 AC-19 |
| Line no longer orderable | Line removed with a notice (Banner) and the quote refreshed | 06 AC-6 |
| Quote changed at confirm | Banner `warning` `t_quote_changed` with the new total; Pay again to confirm | 05 AC-8 |
| Submitting | Pay busy; a second press is ignored | 05 screens |
| Wallet success | Straight to the order with `t_payment_received…` Toast | 06 AC-8 |
| Card | Redirect to BOG → result page: processing → success / failed / expired | 05 AC-9…17, 06 AC-9 |
| Bank transfer (S-021 ON) | Instructions (S-125) + reference; order "awaiting payment" | 05 AC-24 |
| Empty cart | EmptyState "Your cart is empty" + "Browse gigs" | 06 screens |
| Error | Banner `danger` with Retry; the typed state is kept | 05 screens |

## Accessibility
- The methods are a radio group with a visible legend. The card fee note is text.
- Total changes are announced politely ("Total ₾328.00").
- The Pay button label includes the amount. The result page moves focus to its heading.
