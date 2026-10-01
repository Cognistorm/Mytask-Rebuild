# Handoff: ui-ux-designer → orchestrator: P2-C1 design audit and assets
Date: 2026-09-28

## What I did
- Audited the current design of MyTask.ge, keeping to "modernise, don't reinvent".
  - **Seen live** (read-only GETs, no forms, no login): home, header/nav/footer, search, category and sub-category listing, gig page, project list, project detail, public profile, subscription, login, register, help/contact, a CMS page, plus `/sellers`, `/start_selling`, `/ka/gita`, `?locale=en` and `?theme=dark`.
  - **Audited from Blade only** (need a login): buyer `/account/*`, freelancer `/seller/*`, the dual-dashboard switcher, inbox/chat (Chatify), cart and checkout, the proposal modal.
  - `docs/05-design/screenshots/` was empty, so there were no pixel screenshots. The findings come from the HTML and CSS the live server sends and from the legacy source. Points that depend on rendering are marked "(inferred from code)".
- Extracted the real design values with file:line or URL evidence: colours, fonts and Georgian glyph coverage (checked with fontTools), type scale, spacing, radii, shadows, breakpoints, icon sets, dark-mode palettes, and WCAG contrast ratios. Also a component-system inventory.
- Wrote 13 modernisation principles as input for P2-C2.
- Collected the logo, category artwork, flags, fonts (+ OFL licence), the verified icon and illustrations into `packages/assets/`, and recorded every file's source in `SOURCES.md`.
- Did not touch `docs/02-specs`, `open-questions.md` or `/legacy`. Nothing committed.

### Key findings
- **Brand:** live primary `#35A29F` (admin setting). Hero `#29807E`. Logo colours teal `#0D696C`, deep `#024249`, coral `#E16A54`, orange `#F48438`. White on `#35A29F` = **3.08:1, which fails AA** on every primary button. The logo teal `#0D696C` gives 6.45:1, so the fix stays inside the brand.
- **Fonts:** FiraGO Regular is what actually renders. The declared "BPG Nino Mtavruli Bold" is a 404 on live. The bold weight is registered under the wrong family name, so all bold text is faux. FiraGO has full Mkhedruli and ₾ but **no Mtavruli**, so `uppercase` on Georgian falls back to another font.
- **Inconsistency:** 3 neutral palettes (gray/zinc/slate) plus 77 near-grey hex values, 4 button systems, 3 modal systems, 3 toast systems, 4 icon sets, 3 dark palettes. The pricing page and chat have their own separate styles.
- **Biggest a11y problems:** zoom disabled (`user-scalable=0`). Focus removed everywhere (493× `focus:outline-none`, 0× `focus-visible`). Hover-only category mega-menu. Placeholder-only auth inputs. Status pills at 1.6–2.5:1. Footer links at 2.54:1. Modals without dialog semantics. English `sr-only` and hard-coded strings in Georgian pages.
- **Biggest mobile problems:** the home "See more" links and the Gigs/Projects shortcuts are hidden on phones. There is no sticky CTA on the gig page or checkout. The dashboard role switcher is a fixed 400 px, icon-only below md. 32 px favourite buttons and 16 px checkboxes. Chat and modals use `100vh`. The 600 px hero is fixed on every screen size. Dashboard tables only scroll sideways.
- **Bug for the specs/i18n owners:** `lang/ka/messages.php:1054-1058` uses curly quotes inside `href=’…’`, so the legal-consent links on `/help/contact` (and wherever those keys are used) are broken live. The new i18n must not put HTML inside strings.

## Files created/changed
- `docs/05-design/audit.md` (new)
- `packages/assets/SOURCES.md` (new)
- `packages/assets/logo/mytask-logo-wordmark.png`, `mytask-logo-wordmark-trimmed.png`, `mytask-logo-legacy-email.png`
- `packages/assets/fonts/FiraGO-Regular.otf`, `FiraGO-Bold.otf`, `FiraGO-OFL.txt`
- `packages/assets/categories/images/*.webp` (7), `packages/assets/categories/icons/*.webp` (7)
- `packages/assets/icons/verified-badge.svg`
- `packages/assets/flags/country-ge-live.svg`, `country-gb-live.svg`, `ge.svg`, `gb.svg`
- `packages/assets/illustrations/no-results.svg`, `login.svg`, `lock.svg`, `reward-icon.svg`, `image-placeholder.jpg`, `gita/{gita,market,price,problems}.png`
- `docs/STATUS.md` (only the P2-C1 design line)

## What the next agent must do
- **Owner:** read `docs/05-design/audit.md` §0 and §4 and say whether the principles are right, especially the accessible dark teal for buttons and links, and one FiraGO family with no uppercase Georgian. Answer the questions below.
- **ui-ux-designer (P2-C2):** build `packages/tokens/tokens.json` + `docs/05-design/tokens.md` + `docs/05-design/components.md` from audit §1 and §4.
  - Light default plus dark (Q-059).
  - Get the FiraGO 500/600 weights and woff2 from the official release.
  - Choose one icon set that has a React Native package.
  - Check AA contrast for every token pair in both themes.
- **product-analyst (specs):** note these in the relevant specs as parity or bug-fix items:
  - the curly-quote consent-link bug (`lang/ka/messages.php:1054-1058`);
  - the register subtitle copy error;
  - the hard-coded English strings ("Home", "Verifications");
  - the language switcher showing only ქართული live;
  - the step-2 "paid upgrades" in the proposal modal and the non-BOG gateway buttons in checkout, which go away per the Owner decisions.
- **Orchestrator:** the Owner may still add screenshots to `docs/05-design/screenshots/`. If they do, I will confirm the "(inferred from code)" points during P2-C2/C3.

## Open questions / risks
(For the product-analyst to copy into `open-questions.md` if they agree. I did not edit that file.)
1. **Primary button colour (design token decision, Owner approves):** keep `#35A29F` as the brand accent, but use a darker teal (logo `#0D696C`, or a tuned step near `#257471`) for filled buttons and text links so they pass AA? The alternative is to keep `#35A29F` with dark text on it. My recommendation is the darker teal: it is already in the logo.
2. **Admin-editable brand colour:** legacy lets an admin change the primary colour and the hero colour at runtime (`settings_appearance.colors.primary`, `settings('hero')->bg_color`). The new platform uses fixed design tokens, and the mobile app can't pick up runtime CSS. Should that admin setting be dropped (my recommendation), or kept for the web only? This touches the settings register (product-analyst, P2-A1).
3. **Logo source files:** is there a vector (SVG/AI/PDF) master of the current MYTASK wordmark and a square icon mark? The live logo is a padded PNG and the favicon is the same wordmark, unreadable at 16 px. The mobile apps need a 1024×1024 app icon. If none exists, may I derive a simple "M" mark from the wordmark for the favicon and app icon, for Owner approval?
4. **Email logo:** transactional emails still use the older purple/teal "MY TASK" logo (`legacy/APP/public/logo.png` via `vendor/mail/html/header.blade.php`). Switch emails to the current logo?
5. **Category artwork:** the 7 category tiles (3D renders) and icons (pink-purple gradient) are admin-uploaded. Is their licence known? Keep them as they are, or recolour/replace the icons to match the teal brand? They are data, not tokens, so this does not block P2-C2.
6. **Invite banner / Premium button colour:** the sky blue `#2EBFF6` (2.12:1 with white) is used for "Invite and earn points" and the Premium buy button. I propose moving both to the brand palette (teal, or the logo orange as an accent with dark text). Is that OK?
7. **Freepik illustration** `lock.svg` requires attribution under the Freepik licence. Replace it with our own empty-state art in P2-C2? I recommend yes.
8. **Risk:** no screenshots and no logged-in session, so the dashboard, chat and checkout findings come from source only. Before sign-off, a quick Owner look at those screens on the live site (or screenshots) is advisable.
