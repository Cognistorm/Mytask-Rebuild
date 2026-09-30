# Design audit: current MyTask.ge (P2-C1)
Status: ready for Owner review | Author: ui-ux-designer | Date: 2026-09-28
Rule applied: **modernise, don't reinvent.** Everything listed under "Keep" stays where it is in the new web and mobile apps.

## How this audit was made
- **Live site, read-only GETs on 2026-09-28** (no forms, no login): `/`, `/?locale=en`, `/?theme=dark`, `/service/logo-animatsia-67A110628F121F396311`, `/explore/projects`, `/project/702146/ai-videografi`, `/profile/vakhtangi_`, `/subscription`, `/search?q=ლოგო`, `/categories/graphics-design`, `/categories/graphics-design/logo-brand-identity`, `/help/contact`, `/page/about-company`, `/auth/login`, `/auth/register`, `/sellers`, `/start_selling`, `/ka/gita`. I also fetched the compiled CSS (`/build/assets/app-efd0fd27.css`, `app-26c28349.css`, `app-8c802bcc.css`).
- **Legacy code (read-only):** `legacy/APP/tailwind.config.js`, `resources/css/*`, `resources/scss/*`, `public/css/*`, the Blade views in `resources/views`, `public/img`, the `settings_appearance` usage.
- **Screenshots:** `docs/05-design/screenshots/` was **empty**, so I had no pixel images. The values below come from the HTML and CSS the live server sends, and from the source. Anything that depends on how a page looks when rendered (e.g. exact wrap points) is marked *(inferred from code)*. If the Owner adds screenshots, I will check these points against them in P2-C2.
- **Screens that need a login, audited from Blade only (not seen live):** buyer `/account/*`, freelancer `/seller/*`, the dual-dashboard switcher, inbox/chat (`/inbox`), cart contents, checkout (`/checkout`, `/checkout/{uid}/{type}`), the proposal modal on a project page, order detail/delivery, and settings pages.
- Many Blade files are minified onto a single line (e.g. `livewire/main/includes/header.blade.php`, `livewire/main/project/project.blade.php`, `livewire/main/profile/profile.blade.php`, `livewire/main/checkout/checkout.blade.php`, `livewire/main/seller/home/home.blade.php`). For those I cite the file and quote the class string, because a line number would always be `:1`.

---

## 0. Top findings (read this first)
1. **The brand colour fails contrast when used with white text.** On live, primary is `#35A29F` (`--color-primary`, inline `<style>` on every page). It is set by the admin in `settings_appearance.colors.primary`; the seeder default is `#4F46E5` (`database/seeders/SettingsAppearanceTableSeeder.php:25`). White on `#35A29F` is **3.08:1**, which fails WCAG AA for normal text. Every primary button uses 12–13 px white text on it (`components/forms/button.blade.php:1-22`: `text-xs … bg-primary-600 … text-white`). The logo has a darker teal, `#0D696C`, which gives **6.45:1** with white. The fix is already in the brand.
2. **The fonts don't match what the code intends.** Tailwind and the admin setting say `BPG Nino Mtavruli Bold` (`tailwind.config.js:81`, live inline `html{font-family:BPG Nino Mtavruli Bold}`). But the font file is **404 on live** (`https://mytask.ge/fonts/bpg_nino_mtavruli_bold.ttf`, and it is linked with `rel="stylesheet"`, which is wrong anyway). What actually renders is **FiraGO Regular**, forced by `body{…!important}` (`resources/css/bpg-font.css:16-18`). The bold file is registered under a *different family name* (`'FiraGo Bold'`, `bpg-font.css:9-13`), so every `font-bold`, `font-semibold` and `font-extrabold` is **faux bold** drawn by the browser.
3. **FiraGO 1.001 covers all 43 Mkhedruli letters and ₾, but has 0 of 43 Mtavruli (U+1C90–1CBF) glyphs.** I checked this with fontTools on `resources/fonts/FiraGO-*.otf`. Tailwind `uppercase` on Georgian text becomes Mtavruli in modern browsers, so those glyphs fall back to a system font. The live site does this on section titles (`home.blade.php:170,210` `uppercase tracking-wider`), on the gig-card price label (`.gig-card-price small{text-transform:uppercase}` in `public/css/style.css`) and on the "შეუერთდი" button.
4. **Too many overlapping systems.** Neutrals come from three Tailwind palettes (gray 4,982 uses, zinc 3,082, slate 659) plus **77 distinct near-grey hex values** in `public/css/style.css`. There are **4 button systems, 3 modal systems, 3 toast systems, 4 icon sets** and **3 different dark-mode palettes**.
5. **Accessibility basics are missing.** Zoom is disabled (`maximum-scale=1.0, user-scalable=0`, `components/layouts/main-app.blade.php:11`). Focus rings are removed 493 times (`focus:outline-none`), 91 times with `focus:ring-0`, and `focus-visible` is never used. Auth inputs have placeholders but no labels. The category mega-menu opens on **hover only** (`group-hover:visible`). Status pills use `-400` text on `-50` backgrounds (1.6–2.5:1). Footer links are `text-gray-400` on white (2.54:1).
6. **Mobile problems.** The "See more" links on home sections are hidden below `sm` (`home.blade.php:213,464,534,594` `hidden … sm:block`). The dashboard role switcher is a fixed `w-[25rem]` (400 px) in the header (`dashboard-app.blade.php:437`), and below `md` it shows icons only with no text or label. Favourite buttons are 32×32. Checkbox and radio targets are 16–20 px. Chat uses `height:100vh` (breaks with mobile browser toolbars). The hero has a fixed 600 px height on every screen.
7. **Copy and i18n bugs you can see on the page.** The Georgian legal-consent links are broken on `/help/contact`: `lang/ka/messages.php:1054-1058` uses typographic quotes `’` in `href=’:terms_link’`. Some English strings are hard-coded in the Georgian UI: "Home" (gig breadcrumb), "Verifications" (profile), "Open menu", "Close menu", "Close panel", "Open sidebar" (screen-reader text). The register page subtitle says "please log in" ("გთხოვთ გასაგრძელებლად გაიარეთ ავტორიზაცია"). The language modal on live lists **only ქართული**, even though `?locale=en` works.

---

## 1. Real design values (evidence)

### 1.1 Brand colours
| Role | Hex | Evidence | Notes |
|---|---|---|---|
| **UI primary (live)** | `#35A29F` = hsl(178 51% 42%) | live `<style>:root{--color-primary:#35a29f;--color-primary-h:178;--color-primary-s:51%;--color-primary-l:42%}` on every page. Source: `components/layouts/dashboard-app.blade.php:62-68`, `admin-app.blade.php:60-64` from `settings('appearance')->colors['primary']` | Admin-editable at runtime. White text on it = 3.08:1 (fails AA) |
| Primary scale (generated) | 100 `#93DCDA` · 200 `#7CD5D2` · 300 `#65CDCA` · 400 `#4EC6C2` · 500 `#3CB9B5` · **600 `#34A29E`** · 700 `#2D8B87` · 800 `#257471` · 900 `#1E5C5A` | `tailwind.config.js:84-95` (lightness ±6% steps from the base). Hex values computed | 600 = base. White on 700 = 4.07 (still fails), on 800 = 5.50 (passes). There is no `50` step |
| Seed default (not used live) | `#4F46E5` | `SettingsAppearanceTableSeeder.php:25` | Template leftover. Also in `public/css/chat.css` `--theme-color:#4f46e5` |
| **Home hero background** | `#29807E` | live inline `.home-hero-section{background-color:#29807e;height:600px}`; source `home.blade.php:919-925` from `settings('hero')->bg_color` | White on it = 4.68:1 (passes) |
| **Logo teal** | `#0D696C` | sampled from the live logo PNG, letter "M" | White on it = 6.45:1 |
| **Logo deep teal** | `#024249` | logo "S", "K" | White on it = 11.18:1 |
| **Logo coral** | `#E16A54` | logo "T" | White = 3.29:1 (large text only) |
| **Logo orange** | `#F48438` | logo "A" | White = 2.56:1 (decoration only) |
| Accent sky (off-brand) | `#2EBFF6` | `resources/scss/subscription.scss:2` (`$pricing-blue`); `home.blade.php:71` invite banner `bg-[#2ebff6]` | White on it = **2.12:1**. Used for the Premium buy button and the "Invite and earn points" banner |
| Pricing navy (off-brand) | `#231D4F` | `subscription.scss:1` | Plan titles only |
| Template leftovers | `#1DBF73` (21 uses), `#446EE7` (20), `#F74040`, `#FC832B` | `public/css/style.css` (frequency count) | These are Fiverr-clone template colours, not MyTask brand |
| Buyer / freelancer role colours | Buyer: `blue-50/700` (`#EFF6FF`/`#1D4ED8`). Freelancer: `green-50/700` (`#F0FDF4`/`#15803D`) | `buyer-app.blade.php:5`, `seller-app.blade.php:5`, switcher `dashboard-app.blade.php:359-383, 440-463` | Useful as a mental model (keep the idea); off-palette today |

### 1.2 Neutrals
- Page background light: `#FAFAFA` (`main-app.blade.php:180` `bg-[#fafafa]`). Auth pages use `bg-gray-50` `#F9FAFB` (live `/auth/login` body). The dashboard sidebar and top-bar border is `#E9EEF5` (`dashboard-app.blade.php:329,412`).
- Body text: `text-gray-600` `#4B5563` (main-app:180). That is 7.24:1 on `#FAFAFA` (good).
- Headings mix `text-gray-900`, `text-zinc-900`, `text-black`, `text-gray-700`, `text-zinc-700`, `text-slate-600` and `#231D4F` on the same pages. For example, the project page has `text-zinc-600` and `text-gray-600` headings side by side (live `/project/…`).
- Muted text mixes `gray-400` (fails), `gray-500`, `zinc-400`, `slate-400`, `#8F9095` (gig price label), `#707070` (scrolled header links), `#95979D`.
- Borders: `gray-200`, `gray-100`, `gray-50`, `zinc-200`, `#DEDEDE` (scrolled header), `#E9EEF5`, `#F0F0F0`.
- **Count:** 37 distinct Tailwind neutral shades across gray/zinc/slate/stone/neutral in the user-facing views, and 77 distinct near-grey hex values in `public/css/style.css`.

### 1.3 Semantic colours
- CSS variables in `public/css/style.css` (`:root`, start of file): success `13 148 136` = `#0D9488` (teal-600, which is **almost the same as primary**, so success and brand look alike); info `#06B6D4`; warning `#F59E0B`; pending `#F97316`; danger `#B91C1C`.
- In the views: red 717 uses, amber 239, green 233, blue 199, yellow 144, plus purple, orange, pink, emerald, indigo, cyan, violet, rose, teal, sky and lime used ad hoc.
- Status pills (buyer/seller dashboards) are mostly `bg-X-50 text-X-400`. Examples: green-400 on green-50 = 1.66:1, amber-400/amber-50 = 1.61:1, blue-400/blue-50 = 2.34:1, red-400/red-50 = 2.53:1. **All fail.**
- The "needs subscription" pill is `bg-amber-100 text-amber-600` = 2.86:1 (live `/project/…`).
- Toastr colours (`public/css/style.css`): success `#4E4E4E` bg (grey, not green), error `rgb(255 162 162)` / `#862222`, warning `#FFC436` / `#2D1E0D`, info `#89CBFF` / `#124166`.
- Rating: `text-amber-500` `#F59E0B`. The "no rating" label is 13 px `font-black tracking-widest` amber on white, 2.15:1 (`livewire/main/cards/gig.blade.php:59`).

### 1.4 Dark mode (Q-059: keep, light is the default)
- Mechanism: `<html class="dark">` when `current_theme()==='dark'` (`main-app.blade.php:4`). `?theme=dark|light` sets a 7-day cookie `default_theme` if `is_theme_switcher` is on (`app/Http/Middleware/SwitchTheme.php:21-34`). The toggle in the header is a link to `/?theme=dark` (live), so switching theme reloads the page.
- **Palette A (main site):** page `#161616` (`main-app:180`), cards `zinc-800 #27272A`, inputs/raised `zinc-700 #3F3F46`, borders `zinc-700/600`, text `zinc-300 #D4D4D8` / `gray-100`, muted `zinc-400 #A1A1AA`, scrolled header `#0F0F0F` with border `#262626` (compiled CSS `.dark .main-header-scrolling`).
- **Palette B (chat):** `#323232`, `#272727`, `#2C2C2C`, `#2F2F2F`, received bubble `#434343` / text `#DADADA` (`public/css/chatify/dark.mode.css`, `chatify/style.css .message-card .msg-card-content`).
- **Palette C (subscription):** Tailwind *gray* instead of zinc: `#1F2937`, `#374151`, `#F3F4F6`, `#9CA3AF` (`subscription.scss:67-69, 85, 95, 164`).
- Dark contrast is mostly fine. Primary on `#161616` = 5.88:1, on zinc-800 = 4.84:1. zinc-400 on zinc-800 = 5.81:1.
- Gap: the header role switcher has **no `dark:` classes** (`dashboard-app.blade.php:437-463`), so it shows light pills on a dark header.

### 1.5 Typography
| Item | Value | Evidence |
|---|---|---|
| Rendered UI font | **FiraGO Regular 400** (OFL 1.1, v1.001) | `resources/css/bpg-font.css:1-7,16-18`; compiled `app-efd0fd27.css` `@font-face{font-family:FiraGo Regular;src:url(/build/assets/FiraGO-Regular-….otf)}` |
| Bold | FiraGO Bold 700 file exists but is registered as family `'FiraGo Bold'`, so it is **never used** by `font-bold`. All bold text is synthetic | `bpg-font.css:9-13` |
| Declared (dead) font | `BPG Nino Mtavruli Bold` (Tailwind `sans`, admin `font_family`) | `tailwind.config.js:81`; live `<link rel="stylesheet" href="https://mytask.ge/fonts/bpg_nino_mtavruli_bold.ttf">` returns **HTTP 404** |
| Seed default font | Noto Sans Display via Google Fonts | `SettingsAppearanceTableSeeder.php:31,33` |
| Chat font | `Heebo, 'Noto Kufi Arabic'` (**neither has Georgian**) for the legacy `/messages` pages | `public/css/chat.css` `--body-font` |
| Georgian coverage (FiraGO) | Mkhedruli 43/43, **Mtavruli 0/43**, ₾ U+20BE yes, 2,519 mapped code points | fontTools check of `resources/fonts/FiraGO-{Regular,Bold}.otf` |
| Formats | `.otf` only (no woff2), about 800 KB each, `font-display:swap` on Regular only | `bpg-font.css`; compiled CSS |
| **Size usage** (user-facing views) | `text-sm` 14px ×1208 · `text-xs` 12px ×953 · `text-[13px]` ×235 · `text-base` 16px ×129 · `text-lg` 18 ×75 · `text-xl` 20 ×72 · `text-2xl` 24 ×72 · `text-xs+` 13px ×40 · `text-[11px]` ×38 · `text-[10px]` ×24 · `text-[15px]`/`text-sm+` ×33 · `text-3xl` ×10 · `text-4xl` ×9 · `.gig-card-price small` **9px** | grep over `resources/views/livewire/main` + `components`; `resources/css/app.css:43-46` defines `.text-sm+ 15px`, `.text-xs+ 13px` |
| **Weight usage** | medium ×1161 · semibold ×479 · bold ×389 · normal ×208 · extrabold ×45 · light ×39 · black ×38 | same grep |
| Key sizes | Hero h1 `text-xl sm:text-3xl font-extrabold` white (`home.blade.php` hero). Gig h1 `text-xl sm:text-2xl font-extrabold` (live gig). Project list h1 `text-xl md:text-2xl font-bold`. Section labels `font-semibold uppercase tracking-wider`. Gig card title `font-semibold`, line-height 22px, clamped to 2 lines at a **fixed height of 43px** (`.gig-card-title`). Price `15px font-weight:900 letter-spacing:.8px #1A1A1A` (`.gig-card-price span`) | compiled CSS + live HTML |
| Pricing page | Title 1.75rem/700 `#231D4F`, price 2.75rem, description .9rem `#6B7280` | `subscription.scss:79,91,114` |

The base size for body and controls is effectively 13–14 px. For Georgian (tall ascenders, 20–40% longer words) this is small. 12 px and below appears about 1,000 times.

### 1.6 Spacing and layout
- The spacing values are mostly on the 4 px Tailwind grid. Top values: 4 (16px) ×1191, 2 ×722, 6 ×708, 3 ×659, 5 ×394, 8 ×319, 12 ×162, 10 ×104. Off-grid values: `4.5` (18px) ×84, `2.5` ×112, `1.5` ×75, `3.5` ×23, and arbitrary `mt-[3px]`, `py-[7px]`, `pb-[9px]` (header register pill).
- Fixed-header offset hack: `mt-[7rem]` ×45.
- Containers are inconsistent: `max-w-7xl` (1280) ×105, home body `max-w-[1400px]`, dashboard `max-w-container`, `max-w-10xl` ×2. Page gutters `px-4 sm:px-6 lg:px-8`, but the footer uses `lg:px-20` and the admin/auth layout uses `lg:px-36`.
- Header: fixed, `h-20` (80px) (live `nav … h-20`). The logo is drawn with inline `height:120px`, taller than the header. It works only because the logo PNG is 1125×963 with the wordmark filling just 27% of its height. So the visible wordmark is about 32px tall, and the image box overflows the header (*inferred from code*).
- Dashboard: sidebar `md:w-60` (240px) fixed (`dashboard-app.blade.php:326`), content header `h-16`.
- Grids: gig cards `col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3` (1/2/3/4 columns). Seller KPI tiles `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.

### 1.7 Radii
- In the views: `rounded-full` ×397, `rounded-md` 6px ×319, `rounded` 4px ×279, `rounded-lg` 8px ×265, `rounded-sm` 2px ×207, `rounded-3xl` 24px ×49, `rounded-xl` 12px ×26, `rounded-2xl` ×11, `rounded-[40px]` (project category chips).
- Same-role mismatches:
  - Primary buttons are `rounded` (gig CTA), `rounded-md` (x-forms.button, hero search), `rounded-full` (bladewind `bw-button`, plan button) or `rounded-3xl` (header register pill).
  - Cards are `rounded-lg` (gig card), `rounded-xl` (gig page panel), `rounded-md` (category tiles) or `1.5rem` (plan cards, `subscription.scss:39`).
  - Toasts are `rounded-lg` (WireUI) or `border-radius:0` (toastr).

### 1.8 Shadows
- `shadow-sm` ×424, `shadow` ×107, `shadow-none` ×102, `shadow-xl` ×27, `shadow-outline` ×21, `shadow-lg` ×18, `shadow-md` ×10, `shadow-2xl` ×6.
- Cards: `shadow-sm ring-1 ring-gray-200` (gig card, live). Plan cards `0 4px 12px -4px rgba(0,0,0,.08)`, hover `0 12px 24px -8px rgba(0,0,0,.12)` (`subscription.scss:43,48`). Mega-menu `shadow-xl ring-1 ring-black ring-opacity-5`.
- `focus:shadow-outline` is used 21 times. That utility doesn't exist in Tailwind 3, so those elements have **no focus style at all**.

### 1.9 Breakpoints
- Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280 · 1xl 1440 · 2xl 1536` (`tailwind.config.js:71-78`).
- Other breakpoints outside Tailwind: chat 576/680/700/980/1060 (`public/css/chatify/style.css`), pricing 767/768 (`subscription.scss:12,26,51,58`), toastr 720 (`public/css/style.css`).
- The mobile menu appears below `lg` (1024). The dashboard sidebar collapses below `md` (768).

### 1.10 Icons
- **Inline SVG, mixed families** (about 1,000 `<svg>` in the main views): Heroicons solid 20×20 ×468 and outline 24×24 ×399 (stroke 2 or 1.5); other 24×24 icons with `stroke-width="0"` ×247 (Remix/Boxicons style); 512×512 ×27; 256×256 ×10 (Phosphor).
- **Phosphor webfont from the unpkg CDN** (`main-app.blade.php:606` `@phosphor-icons/web@2.0.3`), used as `ph-fill`/`ph-duotone` (e.g. header caret).
- **Tabler webfont** bundled (`resources/js/app.js:20`, `package.json:46`) but almost unused in the user views. This is dead weight.
- Social brand colours are hard-coded (`#1877F2`, `#0A66C2`/`#0072b1`, `#25D366`, `#E60023`, `#FF5700`, …).
- Category icons are admin-uploaded PNG/WebP with a pink-purple gradient line style (see `packages/assets/categories/icons/`). They are off-brand next to the teal primary.

### 1.11 Motion
- `transition … duration-200/300 ease-linear/ease-out` everywhere. Cards and hero tiles use `hover:scale-105`. Portfolio thumbnails use `hover:scale-110 hover:rotate-3 duration-500` (profile, live).
- The mega-menu scales from 75% (`scale-75 → group-hover:scale-100 duration-300`).
- WireUI toasts: `ease-out duration-300`. The Livewire progress bar is `#2299DD` (not brand).
- `prefers-reduced-motion` is never respected.

### 1.12 Component systems in use (inconsistency inventory)
| Component | Systems found |
|---|---|
| Button | `x-forms.button` ×82 (`text-xs py-3 px-8 rounded-md`), `x-bladewind.button` ×13 (`bw-button … rounded-full`), 288 hand-written `<button>` (`text-[13px] py-4 px-8 rounded` on the gig CTA, `px-5 py-4 rounded-md` on search), `.plan-button` (`rounded-full #2EBFF6`) |
| Modal | `x-forms.modal` (Flowbite) ×48, `x-bladewind.modal` ×1, `wire-elements-modal` (mounted in `main-app.blade.php:599`), plus WireUI `x-dialog` |
| Toast / alert | WireUI notifications (top-centre card), toastr (full-width bar, `public/css/style.css`), `livewire-alert` (SweetAlert) |
| Inputs | `x-forms.text-input` ×77 (label above, `text-xs font-bold text-zinc-500`), 203 raw `<input>`, placeholder-only inputs on the auth pages, rawilk form-components, Select2, FilePond, Quill/CKEditor/TinyMCE |
| Breadcrumb | Gig page: plain `text-gray-400` with English "Home". Project page: white card with shadow and "მთავარი" |
| Price display | `₾700.00 / ₾1,000.00` (home project card), `₾700.00 - ₾1,000.00` (project list), `₾30.00 – ₾100.00` (project summary). Gig: `₾250.00` with a 9px uppercase "starting at" label. Pricing: "₾" + "9.99" + "/თვე" as separate spans |

### 1.13 Contrast measurements (WCAG 2.1, computed)
| Pair | Ratio | AA normal (4.5) |
|---|---|---|
| White on primary `#35A29F` (all primary buttons) | 3.08 | **fail** |
| Primary `#35A29F` text/links on white | 3.08 | **fail** |
| White on `#2EBFF6` (Premium buy, invite banner) | 2.12 | **fail** |
| `gray-400` on white (footer links, gig breadcrumb, card counts) | 2.54 | **fail** |
| `#8F9095` 9px on `#FDFDFD` (gig price label) | ~3.2 | **fail** |
| Status pills `-400` on `-50` | 1.61–2.53 | **fail** |
| `amber-600` on `amber-100` ("needs subscription") | 2.86 | **fail** |
| White on hero `#29807E` | 4.68 | pass |
| `gray-500` on white | 4.83 | pass |
| `gray-600` body on `#FAFAFA` | 7.24 | pass |
| Dark: primary on `#161616` | 5.88 | pass |
| White on logo teal `#0D696C` | 6.45 | pass |

---

## 2. Cross-screen problems

### 2.1 Accessibility (all screens)
- **Zoom blocked:** `maximum-scale=1.0, user-scalable=0` in `main-app.blade.php:11`, `admin-auth.blade.php:1`, and the dashboard and auth layouts (live pages confirm). Fails WCAG 1.4.4.
- **Focus invisible:** 493× `focus:outline-none`, 91× `focus:ring-0`, 21× the non-existent `focus:shadow-outline`, 0× `focus-visible`. `public/css/chat.css` also sets `*{outline:none}`. Keyboard users can't see where they are on the search inputs, card favourite buttons, the gig CTA or the tabs.
- **Hover-only navigation:** the category mega-menu in the header ("სარჩევი") and the secondary category bar use `invisible group-hover:visible` (live header). Keyboard and touch users can't open the sub-levels.
- **Labels:** the login and register inputs rely on placeholders only (live `/auth/login`, `/auth/register`). The header and hero search have no label. The price filter uses the invalid `type="integer"` (`search.blade.php:157,160,430,433`).
- **Icon-only controls without names:** modal close buttons (`components/forms/modal.blade.php:9-13`), the share-modal close, the favourite heart (the tooltip is a separate `role="tooltip"` element and is not linked by `aria-describedby`), the related-gigs prev/next buttons, and the dashboard switcher below `md`. Only 59 `aria-label` and 43 `sr-only` exist in the whole user UI, and the `sr-only` texts are in English.
- **Landmarks and semantics:** nested `<main>` elements on the search and category pages (live: `main.flex-grow > … > main.px-4`). Modals have no `role="dialog"`, `aria-modal` or `aria-labelledby`, and no focus trap (`components/forms/modal.blade.php`). Gig tabs have `role="tab"` but mismatched ids (`id="tab-reviews"` on the Description tab, live gig page).
- **Small targets:** favourite 32×32 (`gig.blade.php:79` `h-8 w-8`), radios/checkboxes 16px (search filters, gig upgrades), social share 32px (profile), header language and theme buttons 32px (`h-8 w-8`, live header), footer links 14px text with `mb-2`.
- **Contrast:** see §1.13.
- **Language:** `<html lang>` switches correctly (`ka`/`en`). But English strings are hard-coded in Georgian pages (see §0.7). The language selector modal offers only Georgian live.

### 2.2 Mobile (all screens)
- There is no bottom tab bar. Mobile navigation is a slide-over from the hamburger (live header `lg:hidden` button). This works and is the model to keep for web mobile. The native app gets a tab bar (see principles).
- Fixed 80px header + `mt-[7rem]` offsets waste about 112px of vertical space on phones.
- Tables in the dashboards (seller orders, gigs, withdrawals, client projects) only scroll sideways (`overflow-x-auto` in `seller/orders/orders.blade.php`, `account/projects/projects.blade.php`, `seller/gigs/gigs.blade.php`). There is no card layout on phones.
- `100vh` layouts (chat `.messenger{height:100vh}`, modal body `max-h-[calc(100vh-15rem)]`) break when the mobile browser toolbar shows or hides.
- Toasts: toastr is a full-width top bar and WireUI is a bottom card on mobile. Two different places.
- Disabling zoom hurts mobile users most.

---

## 3. Screen-by-screen audit

### 3.1 Header, navigation, footer (live)
**Keep**
- Order left to right: hamburger (below lg), logo, pill search with the category menu inside it, then theme toggle, cart, "Subscription" (გამოწერა), "Explore" (აღმოაჩინე) dropdown with 3 described links (Gigs / Projects / Support centre), then Login and a Register pill.
- Second row: the 7 top categories with a hover panel of sub-categories.
- The header is transparent over the hero and turns white with a bottom border on scroll (`.main-header-scrolling`). This is a signature behaviour, so keep it.
- Mobile slide-over: "Join" (შეუერთდი), Login, "Become a freelancer" (**remove per Q-013**), Gigs, Projects, categories accordion, search.
- Footer: 4 columns (Company / Legal / Links / Support centre), logo, "© MyTask 2023 V1.0.0", Facebook, language selector.

**Inconsistent**
- Nav links use three styles: `text-xs+` 13px semibold in the header, `text-sm` 14px on the Explore buttons, `text-[13px]` in the category bar. The register pill is `bg-[#f8f7f4] rounded-3xl pb-[9px]`, which is off-palette and off-grid.
- The logo image is 120px tall inside an 80px bar (see §1.6). The live favicon is the **same 1125×963 wordmark PNG** as the logo, so it is unreadable at 16px.
- Footer links `text-gray-400` (fail). In dark mode footer links are `gray-100`, which is lighter than the headings.

**A11y:** hover-only mega-menu. The search inputs have `focus:ring-0 outline-none`. English `sr-only` texts. The theme toggle is an `<a href="/?theme=dark">` (reloads, has no pressed state). The cart slide-over close is labelled "Close panel" in English.

**Mobile:** the search box is `hidden` in the header on phones. Search lives only in the hero and the slide-over. The categories in the slide-over are a long list with no search. The footer's 4 columns stack into a long list.

### 3.2 Home (live)
**Keep**
- Teal hero (`#29807E`) with the h1 "იპოვე საუკეთესო ფრილანსერი", a search field + "ძებნა" button, the "Invite and earn points" banner, and on desktop two round shortcut tiles (Gigs / Projects).
- Then: "Featured categories" carousel (7 image tiles with a black gradient and white title), "Projects" row, "Top gigs" row, then one row per category (Video & Animation, Digital Marketing, Business, Programming, Photography, Design, Music), each with "See more".

**Inconsistent**
- The invite banner is `#2EBFF6` (off-brand, 2.12:1) and links guests to `/auth/login`.
- Section title styles differ: the carousel title is centred uppercase `font-semibold text-black`, the row titles are left-aligned with a "See more" link.
- The hero container is `max-w-7xl`, the body `max-w-[1400px]`.
- Project cards on home use `₾700.00 / ₾1,000.00`, but the project list uses a dash.
- Gig cards show "შეფასების გარეშე ( 0 )" in amber 13px `font-black tracking-widest`. It is visually loud for an empty state, and repeated on nearly every card.
- Avatar fallback uses random pastel colours per user (inline `rgba(144,89,209,.1)`).

**A11y:** white on `#2EBFF6`. Uppercase Georgian titles fall back to another font (§0.3). The carousel (slick) has no pause control and no keyboard focus management *(inferred from code)*. The favourite button is 32px.

**Mobile:** the round Gigs/Projects shortcuts are `hidden md:flex` (`home.blade.php:88`), so phones lose the two main entry points. "See more" is `hidden … sm:block` (`home.blade.php:213,464,534,594`), so phones can't reach the full list from a section. The hero is fixed at 600px, which wastes a whole screen on a phone.

### 3.3 Search and category listing (live: `/search`, `/categories/{c}`, `/{c}/{s}`)
**Keep**
- Left filter column (Rating 5/4+/3+/2+/1+, Price min/max, Delivery time 1 day … 1 month, "Filter" button), results grid of gig cards on the right, "Sort" dropdown (Most popular, Best rating, Best selling, Newest, Price low→high, high→low) top right.
- On mobile the filters open as a slide-over from a filter icon.
- The category page title and the 3-level category URLs.

**Inconsistent**
- The filter headings use `text-gray-400` (fail) on `bg-gray-50` bars.
- The rating filter label is a plain number with no stars *(inferred from code)*.
- The delivery-time radios and rating radios use different label styles (`text-sm text-gray-600` vs `text-sm font-medium text-gray-700`).
- The "Filter" button is `text-xs py-3 rounded-md`, a different size from the other primary buttons.

**A11y:** nested `<main>`. `type="integer"`. Price inputs have placeholders only. 16px radios. The "Close menu" label is in English.

**Mobile:** the filter slide-over has an apply button at the bottom of a long list *(inferred from code)*, with no sticky apply bar. The sort menu items are `py-3 text-xs`, which is fine.

### 3.4 Gig page (live: `/service/{slug}`)
**Keep**
- Breadcrumb, title, seller mini-row, stats (orders in queue, delivery days, rating + review count).
- Main image carousel with thumbnails on the left (`lg:col-span-4`). Purchase box on the right (`lg:col-span-3`) with "starting at" price, optional upgrades (checkboxes), "Add to cart" (primary) and "Contact freelancer" (grey), plus Actions (Share, Report).
- Tabs: Description / Reviews (plus FAQ and documents when present). Then "Recommended gigs" slider.
- Share and report modals.

**Inconsistent**
- The breadcrumb says "Home" in English and uses the plain grey style (the project page uses a card style).
- The CTA is `text-[13px] py-4 px-8 rounded`, "Contact" is `rounded-md` with the same size, and the related-gigs arrows are `rounded-tl-md` squares.
- The seller card here is much smaller than on the profile. It has no avatar image fallback style that matches the cards.

**A11y:** white on primary (3.08:1) on the main CTA. Tab ids are mismatched. The carousel is splide with thumbnails; I can't confirm keyboard support. Upgrade checkboxes are 16px. The share buttons are round 48px (good).

**Mobile:** the purchase box stacks under the gallery and scrolls away. There is **no sticky "Add to cart / price" bar**, so on a long description the CTA is off-screen. The breadcrumb is hidden below md (fine).

### 3.5 Project listing and project detail (live) and proposal modal (Blade)
**Keep (list `/explore/projects`)**
- Search bar with "ძებნა", "Popular:" category chips, "Latest projects" h1, and a list of rows: thumbnail (128px), category link, title, proposals count, time ago, excerpt, budget range, "Send a proposal" button.

**Keep (detail `/project/{pid}/{slug}`)**
- Card breadcrumb + "Actions" (share/report).
- Left: "Project details" header with the "Send a proposal" button, description, client block (masked name "My**sk"), yellow "Beware of scams" alert, then the proposals section (visible to Premium users only, with a filter: newest/oldest/fastest/cheapest).
- Right: "Project summary" (budget, proposals count, average proposal, which needs a subscription, status, posted date).

**Keep (proposal modal, Blade `livewire/main/project/project.blade.php`, single-line, `<x-forms.modal id="modal-bid-container" … size="max-w-4xl">`)**
- Step 1: amount, "paid to you" read-only field, delivery days, proposal description. Step 2: optional paid upgrades. **Remove step 2** (paid promotions removed, per the Owner decisions in STATUS). "Go back" / "Continue" footer.

**Inconsistent**
- The "Send a proposal" button on the list is outlined `rounded border px-3 py-3`. On the detail page it is `rounded border px-4 py-2 shadow-sm`. In the modal it is `x-forms.button`.
- The budget is written three different ways (§1.12).
- The "needs subscription" amber pill is `rounded-3xl`, while other pills are `rounded-sm`.

**A11y:** the modal has no dialog role, focus trap or close label. Error text is `text-red-600` under the fields (good), but it isn't linked with `aria-describedby`. `amber-600/amber-100` fails contrast.

**Mobile:** `max-w-4xl` modal with `p-4` and a body of `max-h-[calc(100vh-15rem)]` on phones leaves only about 50% of the screen for a 4-field form with a textarea *(inferred from code)*. It should become a full-screen sheet. The list rows put a 128px thumbnail next to the text, which is cramped at 360px wide *(inferred from code)*.

### 3.6 Public profile (live: `/profile/{username}`)
**Keep**
- Left card: avatar 64px, name, username, online status, share button, "Member since", verifications (email), languages with level.
- Right: "About me", Gigs list (row cards with thumbnail, delivery days, reviews, starting price, "Start" (დაწყება) button), "My work" portfolio grid, Skills chips linking to `/hire/{skill}`, "share your profile" with 10 social buttons and copy link.
- **Remove:** level badges (Q-014), star rating only.

**Inconsistent**
- The heading "Verifications" is in English.
- Two h1 elements (the name and "Verifications").
- Portfolio thumbnails rotate 3° on hover, which is gimmicky and inconsistent with the cards elsewhere.
- Ten social share buttons, each 32px, in brand colours.

**A11y:** two h1s. Share buttons are 32px (the aria-labels exist, good). The status text "არ არის აქტიური" is grey only.

**Mobile:** the left card stacks on top. The 10 share buttons wrap into two rows. The gig rows are `md:w-32` thumbnails, full width on mobile *(inferred from code)*.

### 3.7 Subscription / plans (live: `/subscription`)
**Keep**
- Two plan cards side by side: Standard (free) and Premium (₾9.99/month **or** 100 points/month, "Buy" (შეძენა)), each with a feature list of ✓/✗ rows (withdrawal fee 10% vs 0%, number of gigs, chat, featured frame, top placement, proposals, see others' proposals, contact author).
- Auto-renew note under the Premium title.

**Inconsistent**
- A completely separate style: navy `#231D4F` titles, sky `#2EBFF6` buttons, `border-radius:1.5rem` cards, dark mode in Tailwind gray instead of zinc (`resources/scss/subscription.scss`).
- The Premium highlight uses a gradient `rgba(6,176,240,.79) → rgba(0,255,209,.79)` (`subscription.scss:206`) that appears nowhere else.

**A11y:** white on `#2EBFF6` = 2.12:1 on the only purchase button. ✓/✗ are icons; the features also need a text or `aria-label` for "not included" *(inferred from code)*.

**Mobile:** the cards stack below 768 (`subscription.scss:58`). The feature lists are long, and the Buy button of the second card is far down the page.

### 3.8 Auth pages (live: `/auth/login`, `/auth/register`; Blade `livewire/main/auth/*`)
**Keep**
- Centred `max-w-md` white panel on `gray-50`: logo, "Welcome" title + subtitle, fields, "Remember me", full-width primary submit, "or" divider, links (register / forgot password / resend verification), legal links, and on mobile a "Back to home" link.
- Register: full name, email, username, password (show/hide), referral code (optional), terms checkbox.
- Social login buttons exist in the code (`login.blade.php`, `bg-zinc-200 hover:bg-[#eeeded] rounded-sm`) and depend on `settings_auth`. None are visible live.

**Inconsistent**
- "Back to home" uses `text-blue-600`, the only blue link on the site.
- The submit is `py-4.5 text-[13px] rounded-md`.
- The register subtitle is wrong copy (asks the user to log in).
- `login.svg` (an illustration) is in `public/img/auth` but is not used.

**A11y:** no visible labels (placeholders only). The password toggle button has no name. Errors show red borders and messages, but they aren't announced. White on primary on the submit.

**Mobile:** good overall (single column). `user-scalable=0` blocks zoom on the input fields.

### 3.9 Buyer dashboard `/account/*` (Blade only, not seen live)
Files: `components/layouts/buyer-app.blade.php` (sidebar items), `components/layouts/dashboard-app.blade.php` (shell), `components/main/account/sidebar.blade.php` (settings sidebar), `livewire/main/account/*`.

**Keep**
- Shell: fixed 240px left sidebar (logo, role switcher on mobile, nav), top bar (hamburger on mobile, **Freelancer / Buyer segmented switcher in the centre**, account menu on the right: "Logged in as", view profile, settings, password, logout).
- Buyer nav: Projects, Buy services (orders), Personal offers, My reviews, Refunds, Favourites. A blue "Buyer dashboard" badge sits on top.
- Account settings sidebar: avatar + change, verified badge, then Settings, Password, Billing, Payment methods, My subscription, Referrals, Verification centre, Sessions, Logout.
- Orders page: order history cards with status, "contact seller", request refund, delivered work, review, requirements form.

**Inconsistent**
- The "Buyer dashboard" badge class is **`bg-cpx-2`**, a typo that joins `bg-c` and `px-2`, so it has no background and no padding (`buyer-app.blade.php:5`).
- The sidebar markup is duplicated for mobile and desktop (`buyer-app.blade.php:9-91` vs `103-170`, `seller-app.blade.php:8-208` vs `215-420`), and the two copies already differ in labels ("Buy services" vs "My orders").
- The status pills use -400 on -50 (fail). Radii mix `rounded-sm`, `rounded-3xl` and `rounded-full`.

**A11y:** no `aria-current` on the active nav item (only border and colour). The switcher links show state by colour only. Status is shown by colour + text (good), but with low contrast.

**Mobile:** sidebar in a slide-over (`dashboard-app.blade.php:158`, with `aria-modal`, good). The top-bar switcher is fixed `w-[25rem]` (400px, `:437`), which is wider than a 360–390px phone. Below md its labels are `hidden md:block`, so it is icon-only with no accessible name. Tables scroll sideways.

### 3.10 Freelancer dashboard `/seller/*` (Blade only, not seen live)
Files: `components/layouts/seller-app.blade.php`, `livewire/main/seller/home/home.blade.php` (single-line) and the other `seller/*` views.

**Keep**
- Green "Freelancer dashboard" badge. Nav: Home, Orders, Gigs, Projects (awarded / proposals), Offers, Reviews, Refunds, Unblock requests, Portfolio, Withdrawals.
- Home: "Welcome back" + verified + member since, "Switch to buying", "Create a new gig", KPI tiles (earnings, pending clearance, awarded projects, total gigs, completed/pending/in-progress/cancelled orders), new messages, latest orders table, latest awarded projects table.

**Inconsistent:** the same pill and radius problems as the buyer side. KPI tiles are `grid-cols-2` on mobile, so long Georgian labels ("შეკვეთები მიმდინარეობს") wrap to 2–3 lines *(inferred from code)*.

**A11y / Mobile:** the same as §3.9. Tables with 5–6 columns scroll sideways on phones. Money values are not right-aligned consistently *(inferred from code)*.

### 3.11 Inbox / chat `/inbox` (Chatify, Blade only, not seen live)
Files: `resources/views/vendor/Chatify/pages/app.blade.php`, `layouts/*`, `public/css/chatify/{style,light.mode,dark.mode}.css`. The old `/messages` pages use `public/css/chat.css`.

**Keep**
- Two panes: contact list on the left (search, Favourites, conversations; `max-width:280px`), conversation on the right (header with user, messages, send form with attachment and emoji), plus a collapsible info pane (shared photos, delete conversation).
- Bubble shapes: received `20px 20px 20px 0`, sent `20px 20px 0` in the primary colour (the messenger colour is taken from `settings('appearance')->colors['primary']`, `app/Http/Controllers/Chat/MessagesController.php:95`).

**Inconsistent**
- A separate CSS world: its own greys (`#333`, `#222`, `#F1F1F1`), its own dark palette (`#323232`/`#272727`), its own breakpoints, and yellow/orange emoji-panel colours.
- The sent-bubble text is white on primary (3.08:1).
- `chat.css` defines `Heebo` (no Georgian) and theme `#4F46E5`.

**A11y:** `chat.css` has `*{outline:none}`. The messages area has no live region, so new messages aren't announced. The icon buttons (attach, emoji, send, info) have no names *(inferred from code)*.

**Mobile:** the list pane is 45% wide / max 280px until the breakpoints (576/680/700) switch to one pane *(inferred from code)*. `height:100vh` pushes the send box under the mobile browser toolbar.

### 3.12 Cart and checkout (Blade only, not seen live)
Files: `livewire/main/checkout/checkout.blade.php` (single-line), `unified-checkout.blade.php` (projects/offers), the header cart slide-over (live, empty state "კალათა ცარიელია").

**Keep**
- Cart slide-over from the header, then `/checkout`: left "Choose your payment method" (radio list: Wallet, BOG), right "Order summary" (gigs subtotal, fee, total) with "Confirm" and "Your transaction is secure".
- **Remove:** tax row, exchange rate and the non-BOG gateway buttons (flutterwave/paystack/razorpay/stripe…), per the Owner decisions.

**Inconsistent:** the "My shopping cart" heading is `text-red-800` in both themes. Radio `focus:ring-0`.

**A11y:** payment radios have no visible focus. The total isn't announced on change.

**Mobile:** the summary stacks under the methods, so "Confirm" is at the very bottom. It needs a sticky total + confirm bar.

### 3.13 Help / contact (live: `/help/contact`)
**Keep:** title "დაგვიკავშირდით", intro, 2-column form (name, email; subject; message with 0/2500 counter), "Send" button, reCAPTCHA notice.

**Inconsistent / bugs:**
- The consent sentence renders broken links, `href="’https://mytask.ge/page/terms-of-service’"`, caused by curly quotes in `lang/ka/messages.php:1054-1058`. This is a real legal-consent bug. In the new i18n, strings must not contain HTML.
- The labels are `text-xs font-bold text-zinc-500 truncate`, so long Georgian labels are cut off.
- The button is bladewind `rounded-full`, unlike every other form's `rounded-md`.

**A11y:** the labels exist (good), but `truncate` can hide text. The counter isn't announced.

**Mobile:** single column (good).

### 3.14 CMS page (live: `/page/{slug}`, e.g. `about-company`)
**Keep:** "Home" (მთავარი) eyebrow link, h2 title, "last updated" line, long-form content with a drop-cap first letter per section.

**Inconsistent:** the drop-cap is done by splitting the text ("ვ" + "ინ ვართ ჩვენ:"), so screen readers read the word in two parts. The "last updated" line is `text-gray-400` (fail). The page uses h2 as its top heading (no h1).

**Mobile:** fine. Line length is uncapped on desktop *(inferred from code)*.

### 3.15 Other live pages noted (not in scope to redesign now)
- `/sellers` (top freelancers grid) follows the card patterns above.
- `/start_selling` is **removed** (Q-013).
- `/ka/gita`, `/en/gita` is a standalone pitch page with its own images (`public/gita.png`, `market.png`, `price.png`, `problems.png`, `Team-Member.png`).

---

## 4. Modernisation principles (input for P2-C2 tokens and components)
1. **Same places, cleaner surfaces.** Every region, order and flow in §3 "Keep" stays. That means the header rows, the hero, the section order on home, the filter-left/results-right listing, gallery-left/purchase-right on the gig page, details-left/summary-right on the project page, the sidebar + top switcher dashboards, and two-pane chat. We change the look, not where things are.
2. **One accessible teal.** Keep teal as the brand. Use an accessible dark teal (from the logo, around `#0D696C`, or a tuned 700/800 step) for filled buttons and links. Keep `#35A29F` for accents, focus rings and large text. Coral `#E16A54` and orange `#F48438` from the logo become optional accents (badges, highlights), never text on white. Retire `#2EBFF6`, `#231D4F`, `#4F46E5`, `#1DBF73` and `#446EE7`. Success must be distinguishable from brand (a green, not teal-600).
3. **One neutral ramp, one dark palette.** Replace gray/zinc/slate/77 hex values with a single 10-step neutral scale, and one dark theme derived from palette A (`#161616` page / `#27272A` surface) that also covers chat and pricing. Light stays the default (Q-059).
4. **FiraGO done properly.** Use one family, `FiraGO`, with real weights 400/500/600/700 in woff2 (OFL, Mkhedruli complete, ₾ included). Base text is 16px on mobile and 15–16px on desktop. Line-height is at least 1.5 for Georgian body text. **Never use `text-transform: uppercase` on Georgian** (FiraGO has no Mtavruli). Drop the BPG, Heebo and Noto Sans Display references. A fixed type scale replaces the 9/10/11/12/13/14/15px mix.
5. **Design for Georgian length.** Buttons and tabs are allowed to wrap to 2 lines or grow in width. No `truncate` on labels. Card titles clamp to 2 lines by line count, not a fixed pixel height. KPI and nav labels are tested with the longest Georgian string.
6. **4px grid, fewer sizes.** Spacing comes only from the scale. Remove `mt-[7rem]`-style hacks, and the header height becomes a token. Use one container width (1280 content, with the home rows allowed at 1400).
7. **One radius family.** Controls use a medium radius, cards a slightly larger one, pills and avatars full. The same role always gets the same radius (fixes the four button shapes today). Shadows: 3 elevation levels plus a focus ring.
8. **One component per job.** Use one Button (primary/secondary/ghost/danger × sm/md/lg, with loading), one Modal that becomes a **bottom sheet on mobile**, one Toast (top-centre on desktop, bottom on mobile), one Input with a visible label, one status Badge with AA-contrast pairs, and one Price component (`₾1,000.00`, range with an en dash `₾30.00 – ₾100.00`).
9. **One icon set** with an RN twin (e.g. Phosphor or Lucide; the choice is made in P2-C2). Icons are SVG, 20/24px, with one stroke weight. Social brand icons are the only exception.
10. **Accessibility by default.** Zoom is allowed. Visible `:focus-visible` rings on every interactive element. 44×44 minimum targets, including the favourite heart, checkboxes and share icons. Labels on every field. `aria-current` in navigation. Dialog semantics with a focus trap. Keyboard-openable mega-menu. Respect `prefers-reduced-motion`. AA contrast checked for every token pair in both themes.
11. **Mobile upgrades that don't move anything.**
    - Sticky bottom action bars: gig "price + Add to cart", checkout "total + Confirm", filter "Apply", proposal "Continue".
    - Show "See more" on all sizes.
    - Keep the Gigs/Projects shortcuts visible on phones (as a compact row).
    - Shorter hero.
    - A full-width segmented Freelancer/Buyer switcher with text labels.
    - Dashboard tables become stacked cards below md.
    - Use `dvh` instead of `vh`.
    - Native app: bottom tab bar mapping to the same header destinations (Home, Search/Explore, Messages, Dashboard, Account).
12. **Content hygiene carried into i18n.** No HTML inside translation strings (fixes the curly-quote links). No hard-coded English in Georgian screens. The language switcher shows both ka and en (Q-024 `/en/` prefix).
13. **Brand assets cleanup.** Use a trimmed wordmark (the transparent-padding PNG goes away; an SVG is ideal) and a real square favicon / app icon. Recolour or replace the pink-purple category icons to match the teal brand, or keep them as the Owner decides.
