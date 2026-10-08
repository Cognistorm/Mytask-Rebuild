## What I did
ROADMAP 4.3.11 was split into a…d (too big for one step). Built **4.3.11a**, the frame of the gig page `/service/{slug}` (spec 04 AC-26…AC-30, AC-33; spec 17 AC-3, AC-4; screen 02):
- Public route, rendered on the server as the visitor of the request (`lookupGig` with the uid after the last `-`). An old slug or a different case → permanent redirect to the current slug; unknown uid and other users' pending/rejected gigs → the 404 page.
- Metadata: SEO title/description (fallback: title + first 160 characters of the description), canonical + ka/en/x-default. Without English: Georgian canonical, no `en` alternate, the `/en/` page is `noindex, follow`. Pending/rejected (owner only): `noindex, nofollow`. Open Graph image = cover.
- Notices: pending (`t_this_gig_not_activated_yet`), rejected (NEW `t_gig_rejected_not_public`; the reason is not in `Gig`, it stays on My gigs / edit), seller away with the date (`t_seller_wont_be_able_to_receive_orders_date`, legacy `<span>` dropped through `splitLegacyLinks`) or restricted without a date (NEW `t_seller_not_receiving_orders`), and `t_content_shown_in_georgian` (texts carry `lang="ka"`).
- Breadcrumb (Home + 3 category levels → category pages), h1 + `FeaturedPill`, seller row (avatar, verified mark, online, seller rating), stats (`t_number_order(s)_in_queue`, `t_expected_delivery_date_time` unless delivery is 0, gig stars + value or `t_n_a` + `t_number_reviews`).
- Cover image 3:2 (placeholder for the gallery of 4.3.11b).
- Purchase box: "Starting at" + price; revisions (`t_revisions_included`, `t_no_revisions`, NEW `t_revisions_not_specified` for migrated null, following the Q-142 recommendation "show not specified"); upgrade checkboxes (state kept in `GigUpgrades` for slice 5), accessible name = title + price + delivery effect. Owner: "Actions" + "Edit gig" → `/seller/gigs/{uid}/edit`. "Add to cart" / "Contact seller" not rendered (slices 5 / 7).
- Description section (stored sanitised HTML).

## Files created/changed
- `apps/web/src/app/[locale]/(public)/service/[slug]/page.tsx` (new)
- `apps/web/src/components/gig-page/data.ts`, `upgrades.tsx`, `gig-page.css` (new)
- `apps/web/src/lib/zones.ts` (`/service/{slug}` is public)
- `packages/ui/src/web/catalog.tsx|.css` + `index.ts` (`FeaturedPill`), `surfaces.css` (`.mt-gig-box`, `.mt-gig-section`)
- `packages/i18n/en.json`, `ka.json`: 3 NEW keys (en + ka); ka `t_actions` = "მოქმედებები" (Owner Q-105, had not been applied yet)
- `apps/web/e2e/fake-gigs.mjs` + `.d.mts` (new, server answers for `lookupGig`), `fake-api.mjs` (routes it), `gig-page.spec.ts` (new, 6 tests incl. axe)

## What the next agent must do
- 4.3.11b gallery: replace `.mt-gig-cover` with main image + previous/next + "n / m", thumbnails, keyboard, Lightbox, swipe.
- 4.3.11c: turn the Description section into tabs (≥ lg) / stacked sections (phones) with FAQ, Reviews (empty state) and Documents; "You may also like".
- 4.3.11d: Share / Report / favourite in the Actions row (the row is rendered only for the owner for now; it must show for everyone then), `e2e/screens.ts` baselines.
- 4.3.12: `recordGigView` once after render.

## Open questions / risks
- Q-142 was never formally answered; built per its recommendation ("not specified"). Owner may confirm.
- Tests: web e2e chromium 176 passed / 3 skipped; visual 75/75. In one full run 6 older tests failed on timing and passed when rerun (known load flakes). The new redirect test now checks the redirect answer directly, so it no longer depends on navigation timing.
- Not yet run against the real API (`pnpm local`).
