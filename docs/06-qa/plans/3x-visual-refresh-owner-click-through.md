# Phase 3X visual refresh: Owner click-through, ROADMAP 3X.23

About 45 minutes: web 20, admin 5, app 20. Web https://mytask.1kk.ge · Admin https://mytask.1kk.ge/admin · App: Expo Go
with `EXPO_PUBLIC_API_URL=https://mytask.1kk.ge/api/v1` in your `.env` (SETUP-LOCAL §4 steps 17–18).

**What to judge.** The layout, the order of things, the texts and the URLs are the same as before 3X. QA checked
that on 18 screens (`docs/06-qa/reports/3x-visual-refresh-2026-10-06.md`). This check is only about the **look and
feel**: R-1 category colours, R-2 buttons and gradients, R-3 the page background, R-4 motion. The one structure
change is the one you asked for (3X.10a): a category name in the bar opens its category, and the "Browse …" line is
gone.

**Deployed:** 2026-10-07, commit `5998616c` (PR #3, CI green). Gig lists on staging are still empty (gigs come with
slice 3), so gig cards are only seen where sample data exists. Admin login: `owner`, then the code from the test
inbox https://mytask.1kk.ge/__mail/.

Tick each line. Anything that looks wrong: write one line under "Notes" (what, where, what you expected).

## Web: everywhere (try light and dark with the moon/sun button)
- [ ] The page background is a soft gradient (very light teal at the top), not flat grey. In dark mode it is a deep
      dark gradient. Scroll down a long page: the background stays put and fills the screen.
- [ ] Buttons have a crisp border and a slight inner gradient, never plain text. Hovering lifts or brightens them
      a little; the keyboard focus ring (Tab key) is clearly visible.
- [ ] Text fields: the border turns teal with a soft glow while you type; a field with an error has a red border.
- [ ] Switching light ↔ dark is instant, with no slow fade of the whole page (3X.21d).
- [ ] Nothing feels slow or jumpy while scrolling or opening pages.

## Web: header and home
- [ ] Category bar (second header row): each category is a pill with **its own colour dot**. Hover: the pill
      tints in its colour. On a category page, that category's pill is filled.
- [ ] Click a category **name**: its page opens (3X.10a). The arrow / Arrow Down opens the mega-menu, which
      carries the category's colour.
- [ ] Narrow the window to about 1100 px: the last categories move into "More ▾" with their colour dots
      (Q-180 (b), pill padding 8 px). Is that acceptable?
- [ ] Home hero: teal gradient with a soft glow; the hero's links sit on it clearly.
- [ ] **Logo on the hero** (QA observation, unchanged since before 3X): the dark "MY" of the coloured logo is hard
      to see on the teal hero. Keep it, or ask for a white logo on the hero only?
- [ ] Featured category tiles and the category rows below: each takes **its own category colour** (band or bar
      next to the title). Scrolling down, tiles and cards rise in gently, once.

## Web: catalogue pages
- [ ] A category page: the title band in the category colour; the breadcrumb as small tinted chips.
- [ ] Filters, sort and pagination have the new button look; the current page number is filled.
- [ ] `/sellers`: seller cards with the card surface and hover; skill chips on **one** row (3X.21a fix).
- [ ] `/explore/projects`: the "Popular:" chips are tinted in their linked category colour. On a phone width the
      last chip may wrap (accepted as designed in 3X.21a).

## Web: profile, sign-in, dashboard, account (sign in with a test user)
- [ ] A public profile: a thin teal-to-purple strip along the top of the card, the avatar ring, the rating bars
      filling once.
- [ ] Login and register: the form sits in a card with the strip on top, over the page background. Submit shows a
      small spinner while it works.
- [ ] Dashboard: see-through top bar, the current sidebar item highlighted, the figure tiles appearing one after
      another.
- [ ] **Buying / Selling switcher (Q-179, your decision):** the highlight now **slides** between the two. It is
      built with the **role colours** you kept in Q-092 (Buying blue, Selling green). Keep the role colours, or make
      it brand teal like the other buttons?
- [ ] Account pages: "Edit" actions are small outlined buttons; after a save the card glows green once.

## Web: Reduce Motion (Windows: Settings → Accessibility → Visual effects → Animation effects **off**)
- [ ] Reload a page: nothing slides, rises, zooms or drifts; all content is visible at once. Short colour fades may
      stay. Turn Animation effects back on afterwards.

## Admin (https://mytask.1kk.ge/admin): category colours (R-1, NEW)
- [ ] Categories tree: every row has a colour dot (sub-categories show their top-level colour); top-level rows
      also show the hex code. Project categories show the dot of their linked category.
- [ ] Edit a top-level category: below "Show on home" is the colour picker: a colour field + `#RRGGBB` box, the 12
      starter swatches (one used by another category is crossed out, "Used by …"), and a light + dark preview (header
      pill, tile band, breadcrumb chip). Pick a different colour and save.
- [ ] The website shows the new colour at once (reload the home page and the category page).
- [ ] Type the hex of a colour another category already has: a message under the field names that category and
      saving is refused. A very similar colour shows a warning (allowed).
- [ ] A sub-category form has no picker, only the line "inherited from …" with the top-level colour.
- [ ] Set the colour back to what it was (or keep the new one if you like it better).
- [ ] Admin on a phone-width window: the form and the picker fit, with no sideways scroll.

## App
- [ ] Go through `docs/06-qa/plans/3x-mobile-device-check.md` (about 20 minutes, its own tick list) and note
      anything off there.

## Your decisions
- Q-179 switcher thumb: ☐ keep role colours (as built) ☐ brand teal
- Logo on the home hero: ☐ keep as is ☐ white logo on the hero
- Category bar at narrow widths (Q-180): ☐ fine as built ☐ change (note below)
- **3X look approved:** ☐ yes, merge PR #3 and resume Phase 4 at 4.3.1 ☐ not yet (notes below)

## Notes
-
