# Handoff: web + mobile → QA (re-check), 4.3.20b, favourite heart on gig cards (QA BUG-03)

## What I did
Spec 04 AC-35 says "on the gig page **or a gig card**". The legacy card is `livewire/main/cards/gig.blade.php:78-107`, and the design is components.md §7.2 (favourite IconButton, top-right over the image). The API already sends `GigCard.isFavorite`: null for guests, true/false when signed in. No contract change and no new translation keys: it reuses the gig page's legacy keys `t_add_to_favorite`, `t_remove_from_favorite`, `t_gig_has_been_added_to_favorite_list`, `t_gig_removed_from_ur_favorite_list` and `t_pls_login_or_register_to_add_to_favovorite`.

**Web**
- `packages/ui` `GigCard` has a new `favorite` slot (`.mt-gig-card-favorite`). It sits above the title link's card-wide hit area, as the seller link does.
- `CardFavorite` (`apps/web/src/components/catalog/card-favorite.tsx`):
  - round Secondary icon button with `aria-pressed` and the add/remove label;
  - `putFavorite` / `deleteFavorite`;
  - the messages show in a bottom bubble (`role="status"`, auto-hides after 4 s), the legacy toast;
  - a guest, or a 401, opens a dialog with the login message and "Login" back to this page;
  - API errors show the API message;
  - not rendered on the visitor's own gigs.
- It is used on Home (top gigs + category rows), search and category lists, "You may also like" and profile gigs. The Favourites page keeps its table with "Remove" (4.3.12c).
- The `(public)` layout passes the visitor's username to a client `ViewerProvider` (`components/site/viewer-context.tsx`). `getViewer` is wrapped in React `cache`, so the header and the layout share one getMe per request.
- The gig page Actions reuse `HeartIcon` / `useLoginHref` from `card-favorite.tsx`; the duplicates are removed. The login link now keeps the query string too.

**App**
- `GigCardView` now takes `api` and shows the heart over the image. It is used on Home, Explore, categories, "You may also like" and profile gigs.
- The username comes from `getViewerName` (`lib/api.ts`): one getMe per session, reset on login and logout, and retried after a network error. The heart is hidden until the username is known, and never shown on one's own gigs.
- A guest, or a 401, gets a bottom sheet with the login message and "Login".
- Added/removed/error messages show over the image for 4 s and are announced to screen readers.
- The card groups its content for screen readers, so the heart is also a screen-reader action of the card ("Add to favourite" / "Remove from favourite"). `ui/card.tsx` passes `accessibilityActions` through for this.

## Files created/changed
- `packages/ui/src/web/catalog.tsx`, `catalog.css`
- web:
  - `src/components/catalog/card-favorite.tsx` + `.css` (new);
  - `src/components/site/viewer-context.tsx` (new);
  - `src/app/[locale]/(public)/layout.tsx`, `page.tsx`, `service/[slug]/page.tsx`;
  - `src/components/catalog/gig-list.tsx`, `profile/client.tsx`, `gig-page/actions.tsx`;
  - `src/lib/site-data.ts`.
- web E2E:
  - `e2e/gig-page.spec.ts` (3 new tests: guest, signed in, own gigs);
  - `home.spec.ts`, `category-pages.spec.ts` (heart on every card);
  - `fake-catalog.mjs` (`/me` for `owner-token` / `viewer-token`);
  - `fake-gigs.mjs` (related cards' `isFavorite` per visitor);
  - 20 visual baselines renewed: home, category, search, gig and profile, light/dark, desktop/phone, on a production build with `--update-snapshots=all`.
- mobile: `src/components/catalog.tsx`, `src/lib/api.ts`, `src/ui/card.tsx`, `src/app/(tabs)/home.tsx`, `src/app/profile/[username]/index.tsx`, `src/components/gig-page.tsx`
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## Checks run
- Root `pnpm format:check`, `pnpm typecheck`, `pnpm lint`: PASS.
- Web E2E on the production build: 288 passed + 3 skipped, including the visual and contrast passes. The renewed baselines were checked by eye: search 1280 light, home 360 dark. The heart sits top-right and does not touch the Featured badge.
- `expo export`: iOS 1722 modules, Android 1812.

## What the next agent must do
- **4.3.20c (web):** BUG-04 (+ N-14), BUG-05 and BUG-06. Then F-02 once the Owner has chosen the text.
- **QA re-check (report §14):** hearts on every card list on web and app:
  - a guest gets the login message;
  - a signed-in user can add and remove, and the state survives a reload;
  - none on one's own gigs (e.g. the own profile's gigs).

  Cross-client: a heart saved on a web card shows filled in the app list, and the reverse. Also check the screen-reader action on the app card (VoiceOver/TalkBack actions menu).

## Open questions / risks
- **The app screens have not run on a device yet** (SETUP-LOCAL §4 steps 19–20). Look at the heart's position over the image and at the message pill.
- **Web, expired access cookie:** the cards treat the visitor as a guest until the header's session refresh reloads the page (`mayHaveSession`). A quick tap in that moment shows the login dialog. This is the same rule the gig page uses.
- **Colour choice:** a saved heart is red (`feedback.danger-icon`), as legacy and the app's gig screen. The web gig page's Actions button keeps its brand-coloured icon. Owner may want them unified at the click-through.
