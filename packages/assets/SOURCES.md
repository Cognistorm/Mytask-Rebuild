# packages/assets: sources
Every file in this package, where it came from, and when. Collected by ui-ux-designer in task P2-C1 on **2026-09-28**.
Live files were downloaded with read-only HTTP GET requests. Legacy files were copied from `/legacy/APP` (not modified).
**Not included on purpose:** user-uploaded content (avatars, gig/project/portfolio images, `storage/gigs`, `storage/avatars`, S3 `mytask-media`), `legacy/APP/public/Team-Member.png` (photos and names of real people), the full `public/img/flags/*` set (about 270 files; only the two needed flags are kept), `public/img/start_selling/*` (the page is removed, Q-013).

## Logo
| File | Source | Date | Notes |
|---|---|---|---|
| `logo/mytask-logo-wordmark.png` | https://mytask.ge/storage/site/logo/a3c0497d-752c-4998-9f05-74a27a8e2c09.png | 2026-09-28 | **Current live logo** (header). 1125×963 RGBA, transparent background. The wordmark fills only the middle 27% of the height (bbox 54,327–1084,584). The live URLs for the transparent logo (`…/logo/a139511d-132f-48ae-a034-0bd9af7f1c46.png`), footer logo (`…/footer/logo/b7c081a0-7b53-4779-86a0-0d6ea04e5955.png`), favicon (`…/favicon/1132f143-3614-4135-99f3-691a7e025437.png`) and OG/placeholder image (`…/placeholder/90163894-a447-4c00-b247-442440ee6323.png`) all serve this **exact same file** (identical MD5 `2972d883f36bb12dc2529d29f4e8c946`), so only one copy is kept. Sampled colours: M `#0D696C`, T `#E16A54`, A `#F48438`, S/K `#024249` |
| `logo/mytask-logo-wordmark-trimmed.png` | Derived from `logo/mytask-logo-wordmark.png` | 2026-09-28 | The same pixels with the transparent padding cropped away (1030×257). Made so the new header can size the logo by its real height. Not a new design. A vector (SVG) master is still needed; asked the Owner in the handoff |
| `logo/mytask-logo-legacy-email.png` | `legacy/APP/public/logo.png` | 2026-09-28 | **Older logo** (purple/teal chevrons + black "MY TASK"), 500×500. Still used in the email header (`resources/views/vendor/mail/html/header.blade.php`) and on the `/ka/gita` pitch page. It differs from the live brand; kept as evidence. The Owner decides whether emails move to the current logo |

## Favicon
No separate favicon exists. The live favicon URL serves the full wordmark PNG (see above), which is unreadable at 16–32 px. A square icon / app icon is needed for web and the mobile apps (question to the Owner in the handoff).

## Brand mark: PROPOSAL, derived work, awaiting Owner approval (Q-075)
The Owner confirmed no vector logo or square mark is known and allowed the designer to derive a simple "M" mark (Q-075). These files are **derived work**, not original brand files: the "M" of the current wordmark (a stencil M whose middle forms a Y, i.e. "MY") was measured on `logo/mytask-logo-wordmark-trimmed.png` (letter box 248×248 px: outer stems 72 px, centre stem 56 px, diagonals at 0.7 px/px, 12 px cuts) and redrawn as clean vector geometry. Colour `#0D696C` (logo teal = `brand.700`). The `proposal-` prefix stays until the Owner approves; then the files are renamed and this section updated. Not for production use before approval.
| File | Source | Date | Notes |
|---|---|---|---|
| `brand/proposal-m-mark.svg` | Derived from `logo/mytask-logo-wordmark-trimmed.png` (letter "M") by ui-ux-designer, P2-C2 | 2026-09-28 | Mark only, teal `#0D696C`, 248×248 viewBox |
| `brand/proposal-m-mark-white.svg` | Same | 2026-09-28 | White mark for dark backgrounds / hero |
| `brand/proposal-app-icon-1024.svg` | Same | 2026-09-28 | iOS/Android store icon master: full-bleed teal square (the stores apply the corner mask), white mark 560 px wide, centred |
| `brand/proposal-adaptive-foreground-432.svg` | Same | 2026-09-28 | Android adaptive-icon foreground (108 dp grid at 4×), white mark inside the 66 % safe zone; background layer = `#0D696C` |
| `brand/proposal-favicon.svg` | Same | 2026-09-28 | 32×32 rounded teal tile with the white mark; cuts widened to 24 units so they stay visible at 16–32 px. PNG/ICO sizes (16, 32, 180 apple-touch, 192, 512) are exported from this in Phase 3 after approval |
No trademark search was done. The Owner owns the wordmark; the derived mark carries no third-party material.

## Fonts
| File | Source | Date | Notes |
|---|---|---|---|
| `fonts/FiraGO-Regular.otf` | `legacy/APP/resources/fonts/FiraGO-Regular.otf` | 2026-09-28 | FiraGO 1.001, weight 400. Font actually rendered on live (`resources/css/bpg-font.css`). Mkhedruli 43/43, Mtavruli 0/43, Lari ₾ yes |
| `fonts/FiraGO-Bold.otf` | `legacy/APP/resources/fonts/FiraGO-Bold.otf` | 2026-09-28 | FiraGO 1.001, weight 700. Same coverage |
| `fonts/FiraGO-OFL.txt` | https://raw.githubusercontent.com/bBoxType/FiraGO/master/OFL.txt | 2026-09-28 | SIL Open Font License 1.1. It must ship with the font files |
| `fonts/woff2/FiraGO-Regular.woff2`, `-Medium.woff2`, `-SemiBold.woff2`, `-Bold.woff2` | https://github.com/bBoxType/FiraGO `Fonts/FiraGO_WEB_1001/Roman/` (raw.githubusercontent.com, master) | 2026-09-28 | Official FiraGO 1.001 web builds, weights 400/500/600/700, for `@font-face` on web/admin (P2-C2). OFL 1.1 |
| `fonts/ttf/FiraGO-Regular.ttf`, `-Medium.ttf`, `-SemiBold.ttf`, `-Bold.ttf` | https://github.com/bBoxType/FiraGO `Fonts/FiraGO_TTF_1001/Roman/` | 2026-09-28 | Official FiraGO 1.001 TTF, weights 400/500/600/700, for the mobile app (`expo-font`, names in `packages/tokens/tokens.json` `font.native.family`). Checked with fontTools: every weight has Mkhedruli 43/43, Mtavruli 0/43, Lari ₾, `tnum`. The official `FiraGO_OTF_1001/Roman/FiraGO-Regular.otf` is byte-identical (MD5 `cf3f75826bdc7008b5b753fe75b2cb91`) to the legacy file above, so the legacy font is the unmodified official release. OFL 1.1 |
Not kept: `BPG Nino Mtavruli Bold`. It is referenced by the Tailwind config and admin settings, but `https://mytask.ge/fonts/bpg_nino_mtavruli_bold.ttf` returns HTTP 404 and the font is not in `/legacy`.

## Category artwork (admin-uploaded site content, not user content)
| File | Source | Date | Notes |
|---|---|---|---|
| `categories/images/video-animation.webp` | https://mytask.ge/storage/categories/69037F024F59B008EA85.webp | 2026-09-28 | Home "Featured categories" tile, 800×800, 3D render style |
| `categories/images/digital-marketing.webp` | https://mytask.ge/storage/categories/934507484D10AEF117C4.webp | 2026-09-28 | Same set, 800×800 |
| `categories/images/business.webp` | https://mytask.ge/storage/categories/820A6E30628B22D2B0E9.webp | 2026-09-28 | Same set, 800×800 |
| `categories/images/programming-tech.webp` | https://mytask.ge/storage/categories/37C3B0EBD402AB5CDFED.webp | 2026-09-28 | Same set, 800×533 |
| `categories/images/music-audio.webp` | https://mytask.ge/storage/categories/86957566AC18A5795653.webp | 2026-09-28 | Same set, 800×533 |
| `categories/images/photography.webp` | https://mytask.ge/storage/categories/6311F33168A0879A0008.webp | 2026-09-28 | Same set, 800×800 |
| `categories/images/graphics-design.webp` | https://mytask.ge/storage/categories/5B36425C83AA30041BFF.webp | 2026-09-28 | Same set, 800×1000 |
| `categories/icons/business.webp` | https://mytask.ge/storage/categories/22B7379FBA8FC1E8EA2A.webp | 2026-09-28 | Top-category icon (24 px in the header menus), 100×100, pink-purple gradient line style |
| `categories/icons/video-animation.webp` | https://mytask.ge/storage/categories/71242D29E729017C56D9.webp | 2026-09-28 | Same set |
| `categories/icons/photography.webp` | https://mytask.ge/storage/categories/B749E8FE8E3C7A4B7010.webp | 2026-09-28 | Same set |
| `categories/icons/digital-marketing.webp` | https://mytask.ge/storage/categories/D9A313FFF9BB534D0EFC.webp | 2026-09-28 | Same set |
| `categories/icons/programming-tech.webp` | https://mytask.ge/storage/categories/DF7215DCD158E8E83685.webp | 2026-09-28 | Same set |
| `categories/icons/music-audio.webp` | https://mytask.ge/storage/categories/EBFF272F4B5C3E74C607.webp | 2026-09-28 | Same set |
| `categories/icons/graphics-design.webp` | https://mytask.ge/storage/categories/F087596858A665B84705.webp | 2026-09-28 | Same set |
Category data is admin-managed. In production these images come from the database/storage migration. They are kept here only as a reference for the design preview (P2-C3). The licence and origin of the artwork are unknown (question to the Owner). The ~250 sub/child-category PNG icons (`/storage/childcategories/*.png`) were not copied; they travel with the data migration.

## Icons
| File | Source | Date | Notes |
|---|---|---|---|
| `icons/verified-badge.svg` | `legacy/APP/public/img/auth/verified-badge.svg` | 2026-09-28 | Shield-check, fill `#2E88FF`, 20×20 viewBox. Used for "account verified" (`components/main/account/sidebar.blade.php`, admin lists). Off-brand blue; the colour will come from tokens |

## Flags (language switcher)
| File | Source | Date | Notes |
|---|---|---|---|
| `flags/country-ge-live.svg` | https://mytask.ge/vendor/blade-flags/country-ge.svg | 2026-09-28 | The flag the live language switcher shows for ქართული (blade-flags package) |
| `flags/country-gb-live.svg` | https://mytask.ge/vendor/blade-flags/country-gb.svg | 2026-09-28 | Same package, for English |
| `flags/ge.svg` | `legacy/APP/public/ge.svg` | 2026-09-28 | Legacy copy used in the account sidebar and `/en/gita` |
| `flags/gb.svg` | `legacy/APP/public/gb.svg` | 2026-09-28 | Legacy copy |

## Illustrations
| File | Source | Date | Notes |
|---|---|---|---|
| `illustrations/no-results.svg` | `legacy/APP/public/img/svg/no-results.svg` | 2026-09-28 | Empty-state art ("treasure", unDraw style, `#3F3D56`). Used in admin empty lists; candidate for the new empty states |
| `illustrations/login.svg` | `legacy/APP/public/img/auth/login.svg` | 2026-09-28 | unDraw-style illustration. Present but not referenced by any view |
| `illustrations/lock.svg` | `legacy/APP/public/img/svg/lock.svg` | 2026-09-28 | Used on `/account/sessions`. **Freepik** artwork (ids `freepik--…`). The Freepik licence requires attribution; replace it or credit it |
| `illustrations/reward-icon.svg` | `legacy/APP/public/img/svg/reward-icon.svg` | 2026-09-28 | Reward/points illustration (512 pt). Not referenced by any main view; candidate for Referrals/Points |
| `illustrations/image-placeholder.jpg` | `legacy/APP/public/img/explore/projects/1.jpg` | 2026-09-28 | Grey "no image" placeholder, 480×480. Used for projects without an image (`livewire/main/explore/projects/projects.blade.php`) |
| `illustrations/gita/gita.png` | `legacy/APP/public/gita.png` | 2026-09-28 | `/ka/gita` pitch page, polygon "gem" graphic, 389×300 |
| `illustrations/gita/market.png` | `legacy/APP/public/market.png` | 2026-09-28 | `/ka/gita` "Freelance market" infographic (English text) |
| `illustrations/gita/price.png` | `legacy/APP/public/price.png` | 2026-09-28 | `/ka/gita` price-scale graphic (English text) |
| `illustrations/gita/problems.png` | `legacy/APP/public/problems.png` | 2026-09-28 | `/ka/gita` "Freelance platform problems" infographic (English text) |
