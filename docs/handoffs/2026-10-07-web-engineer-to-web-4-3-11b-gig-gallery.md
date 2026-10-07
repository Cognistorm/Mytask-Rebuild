## What I did
Built **4.3.11b**, the gig page gallery (spec 04 AC-26; screen 02; components.md §7.12; legacy splide main + thumbnail carousels of `service.blade.php`):
- New shared `Gallery` in `@mytask/ui/web`:
  - main image 3:2 inside a "View larger" button
  - overlay previous/next buttons (44 px) that wrap round
  - counter "2 / 6", read to screen readers as "Image 2 of 6" (polite live region)
  - thumbnail strip of buttons (`aria-current`, 2 px brand border), scrolled into view when the image changes
  - Arrow keys anywhere in the gallery (from the strip, the focus moves with the selection)
  - horizontal swipe (pointer, ≥ 40 px, `touch-action: pan-y`) that does not open the lightbox
  - with one image: no buttons, no strip, no counter
- Lightbox: `Dialog` gains `size="full"` (whole viewport, no radius). It has the same controls and keys, Esc closes it, the native dialog returns the focus to the image button, and the page gallery shows the image last chosen in the lightbox.
- Gig page: `components/gig-page/gallery.tsx` (`GigGallery`, a client wrapper for the translated labels). It shows the gig's `images` as legacy does; the cover (`thumbnail`) only when there are no images (in legacy the cover was the video slide, and the new contract has no video). Alt text = gig title + "Image n of m", with `lang="ka"` on the Georgian fallback. The 4.3.11a cover figure and its CSS are gone.

## Files created/changed
- `packages/ui/src/web/gallery.tsx`, `gallery.css` (new); `index.ts` (exports `Gallery`, `GalleryImage`, `GalleryLabels`); `profile.tsx` / `profile.css` (`Dialog` `size="full"`)
- `apps/web/src/components/gig-page/gallery.tsx` (new), `gig-page.css` (cover removed), `app/[locale]/(public)/service/[slug]/page.tsx`
- `packages/i18n/en.json`, `ka.json`: 5 NEW keys `t_ui_previous_image`, `t_ui_next_image`, `t_ui_image_of`, `t_ui_view_larger`, `t_ui_choose_image`
- `apps/web/e2e/fake-gigs.mjs` (gig 1 has 3 images, gig 2 none), `gig-page.spec.ts` (+3 tests: gallery controls / keys / swipe, lightbox + axe, no images)

## What the next agent must do
- 4.3.11c: tabs (Description / FAQ / Reviews empty state / Documents) on ≥ lg, stacked sections on phones; "You may also like" (`listRelatedGigs`, Carousel, hidden when empty).
- Mobile (4.3.14) builds its own gallery (pinch-zoom on native per components.md §7.12).

## Open questions / risks
- No pinch-zoom in the web lightbox (not asked for on the web; browsers zoom the page).
- Tests: web e2e chromium 179 passed / 3 skipped, visual 75/75; the gig page spec passed 27/27 over 3 repeats. The shared test PNG does not decode (known, own task), so the screenshots for this check used SVG stand-ins. The gig page is not in `e2e/screens.ts` yet (4.3.11d).
