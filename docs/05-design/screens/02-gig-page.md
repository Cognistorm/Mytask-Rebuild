# 02 — Gig page (`/service/{slug}`, `/en/service/{slug}`)
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 04 AC-26…38 (page, English fallback, pending, unavailable, own gig, contact, "You may also like", favourites, report), 03 AC-18 (Featured), 06 AC-1 (Add to cart), 07 (reviews), 08 AC-1 (chat). Audit §3.4. Preview: "Gig page, old vs new".

## Kept from the live site
- Breadcrumb, title, seller mini-row, stats (orders in queue, delivery time, rating + count).
- Gallery with thumbnails on the left (`lg` 4 of 7 columns); purchase box on the right (3 of 7): "Starting at" price, upgrades with checkboxes, "Add to cart" (primary), "Contact seller" (secondary), then Actions (Share, Report).
- Tabs below: Description / FAQ (if any) / Reviews / Documents (if any); then the "You may also like" slider.
- Share and Report dialogs.

## Changes
- Mobile: a StickyActionBar (starting price + "Add to cart") appears once the in-page purchase box scrolls out of view (audit §3.4, components §8.7).
- Mobile: tabs become stacked sections with headings (components §6.6).
- The number of revisions is shown in the purchase box (NEW, 04 AC-26).
- No quantity selector (P-46).
- The "Actions" label reads "მოქმედებები" (Q-105). The favourite button joins the Actions row; the owner sees "Edit gig" there instead (04 AC-30).
- Breadcrumb "Home" is translated; tab ids are fixed; upgrade checkboxes are 20 px in a 44 px hit area.

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (solid) + category bar                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Banner (only when needed): pending review (owner) · unavailable until … ·    │
│ "content shown in Georgian" (/en/ without English text)                      │
│ მთავარი › Design › Logo & brand › Logo design                                │  Breadcrumb
│ Title of the gig, up to two lines  [👑 Featured]                             │  h1 + Pill featured
│ ◉ username ✓ · Online · ★ 4.9 (32)                                           │  seller row
│ ⧗ 3 orders in queue   ⏱ 3 days delivery   ★ 4.9 (32 reviews)                │  stats
├───────────────────────────────────────────────┬──────────────────────────────┤
│ ┌───────────────────────────────────────────┐ │ ┌ Purchase box (Card) ─────┐ │
│ │                                           │ │ │ Starting at               │ │
│ │           main image 3:2                  │ │ │ ₾250.00  (priceLg)        │ │
│ │  ‹                                   ›    │ │ │ ↻ 3 revisions included    │ │
│ │                                  2 / 6    │ │ │ ─────────────────────────│ │
│ └───────────────────────────────────────────┘ │ │ Upgrades                  │ │
│ [thumb][thumb][thumb][thumb][thumb][thumb]    │ │ [x] Source file   +₾20.00 │ │
│                                               │ │     +1 day delivery       │ │
│                                               │ │ [ ] 4K resolution +₾35.00 │ │
│                                               │ │     no change to delivery │ │
│                                               │ │ [   Add to cart  (lg)   ] │ │
│                                               │ │ [  Contact seller       ] │ │
│                                               │ │ მოქმედებები               │ │
│                                               │ │ [↗ Share] [⚑ Report] [♡] │ │
│                                               │ └───────────────────────────┘ │
├───────────────────────────────────────────────┴──────────────────────────────┤
│ Description | FAQ | Reviews 32 | Documents                                   │  Tabs (underline)
│ ─────────────                                                                │
│ Tab panel: formatted description (prose 720) / FAQ Accordion /               │
│ RatingSummary + ReviewItem list / document list with download                │
├──────────────────────────────────────────────────────────────────────────────┤
│ You may also like                                              ‹  ›          │  Carousel, ≤ 40 GigCards,
│ GigCard × 4 visible …                                                        │  no Premium boost
└──────────────────────────────────────────────────────────────────────────────┘
```
The purchase box stays in place on desktop (it does not follow the scroll), as live.

## Mobile web (360)
```
┌──────────────────────────────────┐
│ ☰ [Logo]               🔍  🛒    │
├──────────────────────────────────┤
│ ‹ Logo design                    │  Breadcrumb = parent link only
│ ┌──────────────────────────────┐ │
│ │ image 3:2 (swipe)      2 / 6 │ │  Gallery full width; tap → Lightbox
│ └──────────────────────────────┘ │
│ Title … [👑 Featured]            │
│ ◉ username ✓ · ★ 4.9 (32)        │
│ ⧗ 3 in queue · ⏱ 3 days          │
│ ┌ Purchase box (same content) ─┐ │  in-page, full width
│ │ Starting at ₾250.00          │ │
│ │ ↻ 3 revisions included       │ │
│ │ [x] Source file   +₾20.00    │ │
│ │ [ Add to cart ] [ Contact ]  │ │  stacked full width
│ │ [Share] [Report] [♡]         │ │
│ └──────────────────────────────┘ │
│ ## Description                   │  sections, not tabs
│ ## FAQ (Accordion)               │
│ ## Reviews (RatingSummary +      │
│    first page, "Show more")      │
│ ## Documents                     │
│ You may also like  (carousel)    │
├──────────────────────────────────┤
│ Starting at ₾250.00 [Add to cart]│  StickyActionBar: appears when the
└──────────────────────────────────┘  purchase box is out of view
```
Upgrades ticked in the purchase box are kept when "Add to cart" is pressed from the sticky bar. The bar always shows the starting price; the checkout computes the total (spec 05 AC-5).

## Native app
- Opened from any GigCard, search, favourites or deep link `mytask://service/{slug}`.
- Stack header: back, title hidden until scrolled, Share (system share sheet) and ♡ on the right.
- Content is the same as mobile web. Report sits in the ⋯ menu of the header (BottomSheet).
- StickyActionBar is always visible (price + "Add to cart"), above the home indicator.

## Components
| Region | Component |
|---|---|
| Notices | Banner `warning` (pending, unavailable), Banner `info` (`t_content_shown_in_georgian`) |
| Breadcrumb, title | Breadcrumb, Heading h1, Pill `featured` + Tooltip `t_featured_badge_hint` |
| Seller row | Avatar 32 + OnlineStatus, Link, RatingStars 16 |
| Stats | Inline icon + text (Phosphor 20) |
| Gallery | Gallery + Lightbox (Dialog `full`) |
| Purchase box | Card, Price `from` + `large`, Checkbox rows with Price `inline`, Button `lg` primary, Button secondary, IconButton (Share, Report, Favourite) |
| Tabs | Tabs (web ≥ lg), headings (mobile), Accordion (FAQ), RatingSummary + ReviewItem, file list with Link |
| Related | Carousel + GigCard |
| Dialogs | Dialog `md` Share (Facebook, X, LinkedIn, WhatsApp, Copy link), Dialog `md` Report; BottomSheet on phones |
| Mobile CTA | StickyActionBar |

## States
| State | What shows | AC |
|---|---|---|
| Loading | Skeleton: gallery box, title lines, purchase box, tab bar | 04 screens |
| Success | as wireframe | 04 AC-26 |
| Not found | EmptyState `notFound` with "Browse gigs"; HTTP 404 | 04 AC-28 |
| Pending (owner/staff) | Banner `t_this_gig_not_activated_yet`; Add to cart hidden for the owner | 04 AC-28 |
| Seller unavailable / restricted | Banner with the date; "Add to cart" refused with `t_seller_wont_be_able_to_receive_orders_date` | 04 AC-29 |
| Own gig | "Edit gig" button replaces ♡; "Add to cart" refused `t_u_cant_add_ur_own_gigs_to_shopping_cart` | 04 AC-30 |
| Guest presses Contact / ♡ / Report | goes to login and comes back | 04 AC-31, AC-35, AC-37 |
| Added to cart | Toast success "Added to cart" with the "View cart" action; header cart count +1 | 06 AC-1 |
| No reviews | RatingSummary empty `t_no_reviews_yet` | 07 |
| No FAQ / no documents | tab/section not rendered | 04 AC-26 |
| No revisions | `t_no_revisions` instead of "N revisions included" | 04 AC-26 |
| English fallback | Georgian text + info Banner, HTTP 200 | 04 AC-27 |
| Report sent / already reported | Toast / inline message in the dialog | 04 AC-37, AC-38 |

## Accessibility
- The single h1 is the gig title. Tabs follow the WAI-ARIA pattern with matching ids.
- Each upgrade checkbox label reads title + price + delivery effect.
- The sticky bar is a `region` named `t_ui_purchase`. The in-page button is not duplicated for screen readers: the sticky one is `aria-hidden` while the in-page box is visible.
- Main CTA contrast meets AA (dark teal, Q-073).
