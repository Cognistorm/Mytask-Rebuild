# 4.2.12: real home page + profile gigs block (web)

## What I did
- **Home** (`app/[locale]/(public)/page.tsx`, design `01-home.md`, spec 03 AC-24…AC-26) replaces the Phase 3 placeholder:
  - Hero (teal `bg.hero`, min 360/520): h1 = S-113 hero title or `t_find_best`, optional subtitle, search (`/search?q=`, visible label, `role="search"`), Gigs/Projects shortcuts (round tiles on desktop, compact 2-button row on phones, Projects only with S-075).
  - Featured categories (S-107; `featuredCategories` null/empty → hidden): Carousel (no auto-advance, labelled Previous/Next, scroll snap, next item peeks on phones) of category tiles (admin image + gradient + white title).
  - Top gigs (`t_selected_gigs_for_u`, legacy label) with "See more" → `/search`; one row per visible category with gigs (empty rows hidden) with "See more" → the category page, visible on every size (AC-25); best sellers (S-108; null/empty → hidden) as freelancer cards with "See more" → `/sellers`.
  - Phones: gig rows scroll sideways (cards 80 % wide); no page overflow at 360 px.
  - A failed getHome leaves only the hero (rows hidden, never a broken row). Meta description from S-115; canonical/hreflang of `/`.
  - Not yet (their slices): projects row (9), invite banner (9, referrals), logo cloud and recent articles (16), announcement bar (17, S-112).
- **Profile gigs block** (spec 02 AC-8, EC-10): `listGigs?sellerUsername=` 6 at a time with "Load more" (cursor) as gig cards; without gigs the owner keeps the empty state with "Create a new gig", visitors see no block.
- `@mytask/ui/web` `Carousel` (+ category tile styles).
- Tests: `e2e/home.spec.ts` (3); `shell.spec.ts` (h1 is now the hero title) and `custom-code.spec.ts` (second public → private check uses the header's Join instead of the placeholder's account link) updated. Full web E2E **136 passed / 3 skipped** (before the last fix round: all failures fixed and rerun).
- No new i18n keys.

## Files created/changed
- `apps/web/src/app/[locale]/(public)/page.tsx`, `src/components/home/home.css` (new)
- `apps/web/src/components/profile/client.tsx` (`ProfileGigs`), `data.ts` (`loadGigs`), `profile.css`; `app/[locale]/(public)/profile/[username]/page.tsx`
- `packages/ui/src/web/carousel.tsx` (new), `catalog.css`, `index.ts`
- `apps/web/e2e/home.spec.ts` (new), `shell.spec.ts`, `custom-code.spec.ts`, `fake-catalog.mjs`, `fake-profiles.mjs`

## What the next agent must do
- 4.2.13 admin catalog screens; 4.2.14/15 mobile.

## Open questions / risks
- **Design deviation (for the Owner)**: the header stays white above the teal hero; the design's "transparent over the hero, white on scroll" needs the white logo variant (`logoTransparentUrl`) and on-hero colours for every header control. Proposed for the Owner click-through (4.2.20) rather than built blind.
