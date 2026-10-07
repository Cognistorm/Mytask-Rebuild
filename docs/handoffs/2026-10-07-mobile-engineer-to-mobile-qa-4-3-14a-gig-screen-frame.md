# 4.3.14a: mobile gig screen frame

## What I did
- **Gig screen** `/service/[slug]` (spec 04 AC-26…AC-30, AC-33; screen 02 "Native app"). It uses the same data, rules and keys as the web 4.3.11a and is open to guests.
  - `lookupGig` takes the uid after the last `-`, so an old slug still opens the gig. A uid that is empty or longer than 40 characters, a 404 or a 400 shows "Page not found" with Go back. Any other failure shows the error notice with Try again. Pull to refresh reloads.
  - A stored session whose access token has expired reads as a guest. The screen then calls `getMe` once and reads again, so the owner still gets their pending or rejected gig and `viewer`. This is the same pattern as the portfolio viewer.
  - Notices: pending (warning); rejected (danger, `t_rejected` + `t_gig_rejected_not_public`); seller away with the date, or restricted (`t_attention_needed`; legacy markup removed through `splitLegacyLinks`); Georgian fallback (`t_content_shown_in_georgian`; the texts carry `accessibilityLanguage`).
  - Breadcrumb: Home › category › sub-category › child category, each opening its category screen.
  - Gallery: the portfolio swipe `Gallery`, showing the gig's images, or the cover when there are none.
  - Title: the screen's only header, plus the Featured pill (text; the screen reader also hears `t_featured_badge_hint`).
  - Seller row: links to the profile, with verified mark, online status and the seller's rating.
  - Stats: orders in queue (1 / n wording), delivery time, and gig rating or N/A with the review count.
  - Purchase box: starting price; revisions, "No revisions" or "not specified" (Q-142); upgrades as 44 px checkbox rows read as title, price and delivery effect. The owner gets "Edit gig", which opens the website editor until 4.3.15.
  - Description: drawn natively from the stored HTML.
- **`components/rich-text.tsx`** is the app's renderer for stored HTML, built on the shared `@mytask/rich-text` allow-list (the CONVENTIONS §19 promise "mobile passes the same profile to its HTML renderer").
  - It draws only native `Text` and `View`. There is no WebView, and nothing is ever executed.
  - Profile elements are kept. Any other element is unwrapped and its text kept. `dropWithContent` elements are dropped together with their text.
  - Entities are decoded, whitespace collapses as in a browser, and `<br>` becomes a line break.
  - Lists show a bullet or number that screen readers do not read.
- **`ui/input.tsx` `Checkbox`**: the square sibling of `Radio` (Primary gradient + white tick that zooms in; none under Reduce Motion).
- **`GigCardView`** (Home, Explore, category screens, sellers, hire, profile gigs) now opens the app screen (`openGig`) instead of the website.
- `lib/web-pages.ts`: `gigUrl` is kept for sharing (4.3.14b), and there is a new `gigEditUrl`.
- No new i18n keys.

## Files created/changed
- `apps/mobile/src/app/service/[slug].tsx`, `components/gig-page.tsx`, `components/rich-text.tsx` (new)
- `apps/mobile/src/components/catalog.tsx`, `lib/web-pages.ts`, `ui/input.tsx`, `ui/index.ts`
- `apps/mobile/package.json` (+ `@mytask/rich-text`), `pnpm-lock.yaml`
- `docs/ROADMAP.md` (4.3.14 split into a/b), `docs/STATUS.md`

## Checks
- Mobile typecheck, lint and prettier are green.
- `expo export` bundles both platforms: iOS 1712 modules, Android 1802 modules.
- The HTML parser was checked with an ad-hoc script outside the repo. It confirmed:
  - `<script>` is dropped with its content;
  - `<a>` and `<h2>` are unwrapped under `user_text`;
  - `&amp;` and `&nbsp;` are decoded;
  - whitespace collapses around `<br>` and bold runs.
- The app has no unit-test runner, so this check is not committed.
- **Not run on a device or simulator.**

## What the next agent must do
- **4.3.14b**:
  - sections FAQ (accordion), Reviews (rating or `t_no_reviews_yet`) and Documents (open in the browser);
  - a "You may also like" row (`listRelatedGigs`, hidden when empty);
  - header Share (native share sheet with `gigUrl(gig.slug)`), favourite (guest → login), and a ⋯ Report bottom sheet (`createGigReport`, the rules of web 4.3.11d);
  - `recordGigView` once per open (not the owner; referrer null).
- QA (4.3.18), on a phone:
  - a gig with and without images;
  - a long Georgian description with lists and bold;
  - an owner's pending gig after the token has expired;
  - a seller who is away;
  - upgrade checkboxes with TalkBack / VoiceOver.

## Open questions / risks
- The https App Link for `/service/` is not claimed. The Android intent filters list only the auth paths, and the web serves no AASA / assetlinks paths for it. Today only `mytask://service/{slug}` opens the screen. This belongs to devops, together with the other content paths.
- "Add to cart", "Contact seller" and the always-visible sticky price bar (screen 02 "Native app") wait for slices 5 / 7, as on the web.
- Italic uses `fontStyle: 'italic'` because no FiraGO italic is bundled. The phone synthesises it, which is fine for Mkhedruli.
