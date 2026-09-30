# Handoff: ui-ux-designer → orchestrator · P2-C3 design-system preview page
Date: 2026-09-29 · Branch: feat/blueprint (nothing committed)

## What I did
Built the static preview page the Owner approves instead of Figma. **Open it by double-clicking `docs/05-design/preview/index.html`.** It needs no build step, no server and no internet.

Contents:
1. **Controls:** Light / Dark / System theme switch (Light is the default, Q-059, Q-093) and a ქართული / English text toggle. Both are saved in localStorage, wrapped in try/catch. There is also a FiraGO specimen (400/500/600/700) and a live check that all four weights loaded.
2. **Tokens**, read live from `packages/tokens/dist/tokens.css`: 8 colour scales; every semantic role in light and dark; the WCAG table for all 81 pairs × 2 themes, computed in the browser (162 checks, 0 failures); type scale with computed sizes; spacing; radii; elevation; focus ring; breakpoints with the current width; motion.
3. **Components:** every component in components.md with its variants and states. Hover, focus-visible and pressed are also shown frozen.
   - Interactive: Sort menu (ARIA menu, keyboard, type-ahead, Esc), Select listbox, Explore dropdown, MegaMenu, NavDrawer, Dialog / ConfirmDialog / BottomSheet (native `<dialog>`, explicit focus trap, Esc, focus returns to the opener), tabs, RoleSwitcher (Buying blue / Selling green, swaps the nav), toasts (4 tones, pause on hover and focus), Stepper (desktop list + compact phone version with the sticky Back / Next bar), gallery, carousel, LoadMore, switch, code input, dropzone (real file picker), chips, rating input, favourite toggle.
   - Also shown: Featured gig card (Q-091), the two rating blocks (Q-062), money tiles (Available / HOLD / Withdrawn / Points), the responsive table that turns into cards, the sticky CTA bar, the mobile tab bar and chat.
4. **Old vs new** for home, gig page, project page and the freelancer dashboard. Each pair can be shown side by side, at desktop width or at phone width (360 px). The frames use container queries, so every mode shows the real responsive layout.
   - "Old" is an HTML rendering built from the audit and the live HTML (fetched read-only on 2026-09-29): real texts, legacy colours and sizes, faux bold, uppercase-Georgian fallback, the 400 px switcher and the fixed 600 px hero.
   - I did not use screenshots of the live site, because they would contain real users' photos and names. Category artwork stands in for gig images on both sides. The dashboard's "old" side comes from the Blade templates (it needs a login).
5. **Brand:** the favicon at 16, 32 and 64 px (it is also the page's tab icon), the app icon, the Android adaptive icon, the M mark in teal and in white, and the wordmark.

How I verified it: headless Chromium through the Playwright copy already in the npx cache (1.62.1). I installed nothing.
- **Load:** from `file://` with 0 console errors and 0 failed requests. All four FiraGO weights load from `./fonts/`.
- **Contrast and markup:** 162/162 contrast checks pass. There are no duplicate ids, no images without alt, no unnamed controls, and no broken `aria-controls` / `labelledby` / `describedby` references. Every `data-en` element is a leaf, so the language toggle never destroys markup.
- **Interaction:** 45/45 checks pass. They cover the default theme and language; dark mode and language surviving a reload; System following the OS setting live; the keyboard on the menu, listbox, tabs and theme radiogroup; the dialog focus trap (Tab ×12, Shift+Tab ×4), Esc and focus return; the ConfirmDialog opening on Cancel; the role switcher; toast roles (status / alert); the stepper; the switch; favourite; the code input error; the InfoButton; Explore; the MegaMenu; LoadMore; a visible 2 px focus ring; reduced motion (durations 0 ms, spinner stopped); the drawer at 360 px; and the dialog becoming a full-width bottom sheet at 360 px.
- **No horizontal scroll** at 360, 390, 768 and 1280 px, in both themes, both languages and all three frame modes. Nothing in the new frames overflows its frame.
- **Tokens only:** a static check finds no hex colour in preview.css sections 1–5. Hard-coded legacy values appear only in the fenced section 6 and in inline styles on the "old" side.
- **Visual review** of screenshots at 1280 px and 360 px, light and dark. It found 3 bugs, all fixed: a class-name clash (`.mt-page`), the phone-only breadcrumb link showing on desktop, and the preview's own top bar covering too much of a phone screen.
- **Not tested:** Firefox and Safari (not installed). Firefox allows fonts from the page's own folder, which is why the fonts are copied into `./fonts/`.

## Files created/changed
- `docs/05-design/preview/index.html` (new). It has the Phosphor sprite inlined (76 icons, MIT) and a copy of `packages/tokens/contrast-pairs.json` inlined, because `file://` cannot fetch JSON. If the pairs change, paste the new copy.
- `docs/05-design/preview/preview.css` (new). Sections 1–5 use tokens only. Section 6 holds the legacy renderings.
- `docs/05-design/preview/preview.js` (new). Vanilla JS, no dependencies.
- `docs/05-design/preview/fonts/FiraGO-{Regular,Medium,SemiBold,Bold}.woff2` + `FiraGO-OFL.txt`. These are the folder left by the interrupted attempt, reused. They are identical copies of `packages/assets/fonts/woff2/`. They are needed because `dist/fonts.css` points at `/fonts/`, which only exists on the web server. The page links `packages/tokens/dist/tokens.css` in place, but not `fonts.css`.
- `docs/05-design/components.md`, two real gaps found while building:
  1. §5.3 QuantityInput is marked reserved (no quantity selector at launch, P-46). "Purchase box" is removed from PriceInput's users, and the index row is updated.
  2. §6.8: the role badge and sidebar labels now use the **legacy** keys (`t_seller_dashboard` "ფრილანსერის პროფილი", `t_buyer_dashboard` "დამკვეთის პროფილი", `t_portfolio`, `t_withdrawals`, `t_offers`, `t_unblock_money_requests`). My P2-C2 draft had invented new Georgian labels, which breaks the "existing legacy values are kept" rule.
- No token changes. `tokens.json`, `tokens.md` and `dist/` are unchanged.
- `docs/STATUS.md`: my P2-C3 line only.

## What the next agent must do
- Orchestrator: give the Owner O-5: open the page and approve it, or comment on the tokens, components and preview.
- After approval, P2-C4 (key screen layouts) reuses the structure of these mocks. Phase 3 web and mobile engineers build `packages/ui` from components.md. The preview's CSS is a visual reference, not production code.
- product-analyst: the preview uses legacy texts where keys exist. The texts I wrote for demo-only strings (for example "ნაბიჯი 3 / 5", "მეტის ჩვენება", the toast texts) follow components.md §12 and are drafts for the text tables.

## Open questions / risks (for the Owner; not added to open-questions.md)
1. **"აქციები" label (`t_actions`) on the gig and project pages** reads like "promotions" in Georgian. Keep it, or change it to "მოქმედებები"? The preview keeps the legacy text.
2. **Wordmark on dark and teal backgrounds:** the dark-teal "S/K" letters disappear, so the preview puts the PNG on a light plate. Can you get a vector master of the logo? Then a light variant can be made (still open from P2-C1).
3. **A few component widths are not tokens yet:** tooltip max 280, menu width ~320, RoleSwitcher max 400, EmptyState max 480, drawer 320. components.md gives these as numbers. I propose adding them as `size.layout.*` tokens at the start of Phase 3 (small change, no visual difference). OK?
4. **Risk:** "old" is a reconstruction, not screenshots. If the Owner drops live screenshots into `docs/05-design/screenshots/`, I can check the reconstruction against them.
