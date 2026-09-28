# Handoff: ui-ux-designer → orchestrator: P2-C2 design tokens and component inventory
Date: 2026-09-28

## What I did
- Built the design tokens as **one source of truth**, `packages/tokens/tokens.json` (W3C DTCG format, 482 tokens). It covers colour (brand scale, one neutral ramp, semantic success/warning/danger/info, logo accents), light **and** dark role tokens, typography, spacing, radii, borders, elevation, breakpoints, layout sizes, z-index, motion, focus ring, and the 44×44 touch target.
- Wrote a dependency-free transform: `node packages/tokens/build.mjs`. It produces:
  - CSS variables `--mt-*`: light on `:root`, dark on `[data-theme="dark"]`, with reduced-motion overrides and `.mt-text-*` classes;
  - `@font-face` CSS;
  - a web `vars` object;
  - React Native `lightTheme` / `darkTheme` objects (per-weight font names, RN shadow objects);
  - `.d.ts` types for all of the above.

  The build fails on a broken alias, on a light/dark key mismatch, or on any WCAG failure. `contrast.mjs` checks all 81 defined foreground/background pairs in both themes: **162 checks, 0 failures**.
- Key decisions (all derived from values the live site already uses):
  - **Primary** is the logo teal `#0D696C` (6.45:1 with white), hover `#08565A`, pressed `#024249`, per Q-073.
  - `#35A29F` is **accent only**.
  - The hero keeps `#29807E`.
  - **Promotional accent** is the logo orange `#F48438` with dark text. It is used for the Featured/Top badge, the Premium frame, the Premium Buy and Invite CTAs, and the invite banner (`orange.100`). This replaces sky blue (Q-078).
  - Success is a true green, so it no longer looks like the brand.
  - Dark theme is one palette from legacy palette A. Light is the default (Q-059).
- Typography:
  - **FiraGO** only, real 400/500/600/700. I downloaded the official 1.001 woff2 (web) and ttf (native). The legacy OTF is byte-identical to the official release.
  - fontTools check on all four weights: Mkhedruli 43/43, Mtavruli 0/43, ₾ yes, `tnum` yes.
  - No uppercase and no letter-spacing on Georgian.
  - Scale 13/14/**16**/18/20/24/28/32/40: minimum 13, body 16, inputs 16.
- Wrote `docs/05-design/tokens.md`: rationale, format, the transform plan for Phase 3, the legacy → token mapping with audit evidence, generated light/dark role tables, the full contrast table, and usage rules.
- Wrote `docs/05-design/components.md`, the inventory of **58 components** for `packages/ui` (web + native entries with shared props and variants). Each component lists variants, sizes, states, accessibility, web vs mobile notes, and the specs and screens that use it.
  - Merged the 4 button systems into `Button`/`IconButton`, the 3 modal systems into `Dialog` (a BottomSheet on phones), and the 3 toast systems into `Toast` + `Banner`.
  - Merged the 4 icon sets into one `Icon` using **Phosphor** (MIT; already used on live; Regular + Fill pairs; web via `@phosphor-icons/react`, native generated from the official `@phosphor-icons/core` SVGs).
  - Includes: the Featured GigCard (Q-069), the two rating blocks "as a freelancer / as a client" (Q-062), the Buying/Selling RoleSwitcher (full-width with labels on phones), MoneyTile (Available / HOLD / Withdrawn / Points, per the spec 00 glossary), the table → card-list pattern, StickyActionBar, the native TabBar, and chat.
  - No level badges (Q-014).
- Derived the **"M" mark proposal** (Q-075) from the wordmark's "M", redrawn as vector geometry in logo teal. Files: mark, white mark, 1024 app icon, Android adaptive foreground, and a favicon with widened cuts so it reads at 16 px. All are recorded in `SOURCES.md` as derived work awaiting approval.
- I did not touch `docs/02-specs`, `docs/03-architecture`, `/legacy` or `open-questions.md`. Nothing committed.

## Files created/changed
- `packages/tokens/tokens.json` (new): the source of truth
- `packages/tokens/contrast-pairs.json`, `lib.mjs`, `build.mjs`, `contrast.mjs`, `package.json`, `README.md` (new)
- `packages/tokens/dist/tokens.css`, `fonts.css`, `tokens.mjs`, `tokens.d.ts`, `web.mjs`, `web.d.ts`, `native.mjs`, `native.d.ts` (generated)
- `packages/assets/fonts/woff2/FiraGO-{Regular,Medium,SemiBold,Bold}.woff2`, `packages/assets/fonts/ttf/FiraGO-{Regular,Medium,SemiBold,Bold}.ttf` (new, official release, OFL)
- `packages/assets/brand/proposal-m-mark.svg`, `proposal-m-mark-white.svg`, `proposal-app-icon-1024.svg`, `proposal-adaptive-foreground-432.svg`, `proposal-favicon.svg` (new, proposal)
- `packages/assets/SOURCES.md` (fonts rows + "Brand mark: PROPOSAL" section)
- `docs/05-design/tokens.md`, `docs/05-design/components.md` (new)
- `docs/STATUS.md` (only my P2-C2 line)

## What the next agent must do
- **Owner:** review the tokens and components now, or together with the visual preview (P2-C3), which is the approval point per the plan. Answer the questions below. The M-mark needs an explicit yes/no.
- **ui-ux-designer (P2-C3):** build `docs/05-design/preview/index.html` from `packages/tokens/dist/tokens.css` + `fonts.css`. Show every token, every component state, light/dark, the M-mark proposals, and old vs new for home, gig page, project page and a dashboard.
- **product-analyst:** add the proposed `t_ui_*` built-in component strings (components.md §12, English + Georgian drafts) to the text tables / `packages/i18n` plan. Confirm the Georgian labels for the native tab bar (მთავარი, ძიება, შეტყობინებები, პანელი, ანგარიში) and the rating-block titles (როგორც ფრილანსერი / როგორც დამკვეთი) when writing specs 07 and 08. Spec 07 decides the rating rounding and lists; the component already supports two blocks. Spec 04 should state which rich-text formatting gig descriptions allow (components.md §5.5 proposes bold, italic, lists and links).
- **devops-engineer (Phase 3):**
  - add `packages/tokens` to the workspace unchanged;
  - have CI run `node packages/tokens/build.mjs` and fail on a diff in `dist/`;
  - serve `packages/assets/fonts/woff2/` at `/fonts/`;
  - disable the default Tailwind palette if Tailwind is used (tokens.md §2.5).
- **web-engineer / mobile-engineer (Phase 3+):** use role tokens only (tokens.md §9). Build `packages/ui` to components.md, with shared variant files for both entries. Generate the icon components from `@phosphor-icons/core`. Mobile loads the four ttf files under the names in `font.native.family`.

## Open questions / risks
(For the product-analyst to copy into `open-questions.md` if they agree. I did not edit that file.)
1. **M-mark (Q-075 follow-up):** approve the proposed mark (the stencil "M/Y" from the wordmark, white on a teal `#0D696C` tile for the app icon and favicon), ask for changes, or wait for a professional logo file? Until approved, the files keep the `proposal-` prefix and are not used in production.
2. **Premium "Featured" frame colour:** legacy used a yellow border. I propose the logo orange `#F48438` (frame + "გამორჩეული" badge with a crown icon and dark text), so Premium looks on-brand and matches the Premium Buy button. OK?
3. **Buying/Selling colours:** I kept the legacy mental model (Buying = blue, Selling = green, now AA-compliant) for the switcher and dashboard badges instead of using teal for both. Keep?
4. **Theme choice:** light stays the default (Q-059). May the settings also offer "System" (follow the phone/computer setting) next to Light and Dark? Recommendation: yes, as an opt-in choice, not the default.
5. **Header height:** desktop header 80 → 72 px, because the logo is now sized by its real 32 px height instead of a padded 120 px image. Placement is unchanged. Flagged only because it is a visible dimension change.
6. **Risk:** there are still no screenshots (Q-080 asked for them before P2-C4). Logged-in screens (dashboards, chat, checkout) are specified from code. The preview (P2-C3) will make any mismatch visible to the Owner.
7. **Risk (fonts):** FiraGO woff2 is about 250 KB per weight (4 weights ≈ 1 MB). Phase 3 should subset to Georgian + Latin + ₾ + punctuation and preload only 400 and 600 (tokens.md §5.1).
8. **Note:** `packages/tokens/dist/` is generated but meant to be committed (the P2-C3 preview reads it before any toolchain exists). CI keeps it in sync from Phase 3.
