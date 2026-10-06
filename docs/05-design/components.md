# Component inventory: `packages/ui` (P2-C2)
Status: **proposal, awaiting Owner approval** (visual check in the preview page, P2-C3) | Author: ui-ux-designer | Date: 2026-09-28
**Updated 2026-10-06 (ROADMAP 3X.6):** §0.5 maps every component to the visual-refresh tokens. Behaviour, props, variants, sizes, placement and class names do not change; only the look does (spec 3X "Must not change").
Inputs: [audit.md](audit.md) (§1.12 component systems, §3 screens, §4 principles), [tokens.md](tokens.md), approved specs [00](../02-specs/00-platform-rules.md)–[04](../02-specs/04-gigs.md), [architecture.md](../03-architecture/architecture.md) §4 and §8, ADR-001 (UI sharing), ADR-006 (i18n).
Rule applied: **modernise, don't reinvent.** Each component keeps the placement and behaviour users know from the live site; it fixes looks, consistency, accessibility and mobile behaviour.

---

## 0. How to read this document

### 0.1 Package shape (ADR-001)
- `packages/ui` has two entry points: **`@mytask/ui/web`** (React DOM, used by `apps/web` and `apps/admin`) and **`@mytask/ui/native`** (React Native, used by `apps/mobile`).
- Both entries export the **same component names with the same props, variants and sizes**. Variant definitions (which token each variant/state uses) live once in `packages/ui/src/shared/variants/*.ts` and are imported by both renderers. Only the rendering differs.
- Components read **only tokens** (`@mytask/tokens/web` CSS variables, `@mytask/tokens/native` theme). No hex, px or font names inside components.
- Components receive **already-translated strings** (or i18n keys through a `t` prop helper); they never contain hard-coded text. Built-in texts (e.g. "Close", "Loading", "Show password") come from `packages/i18n` keys listed per component (`t_ui_*`, new keys, English first + Georgian per Q-058; the product-analyst adds them to the text tables).
- Business rules stay in the API (architecture §1). A component can hide or disable a control, but it never decides permissions or amounts.

### 0.2 Shared state vocabulary
Every interactive component defines these states. Token names are from `theme.*` (see tokens.md §4).
| State | Web trigger | Native trigger | Visual rule |
|---|---|---|---|
| default | – | – | variant tokens |
| hover | `:hover` on `(hover: hover)` devices only | none | one step darker (`*Hover`) or `bg.hover`; `motion.duration.fast` |
| focus-visible | `:focus-visible` (keyboard) | accessibility focus (screen reader / external keyboard) | 2 px `focus.ring` + 2 px offset; never removed |
| active / pressed | `:active` | `Pressable` pressed | `*Pressed` colour; native also scale `motion.scale.pressed` (0.98) unless reduced motion |
| selected / checked | `aria-selected` / `aria-checked` / `aria-current` | `accessibilityState.selected/checked` | `bg.selected`, `border.brand`, `text.brand`; never colour alone (icon, weight or indicator bar too) |
| disabled | `disabled` / `aria-disabled` | `disabled` + `accessibilityState.disabled` | `action.disabled` / `action.onDisabled`, `cursor: not-allowed`; no hover; still readable (≥ 4.5:1) |
| loading | `aria-busy="true"` | `accessibilityState.busy` | spinner replaces or precedes the label; the width does not jump; control not re-clickable |
| error / invalid | `aria-invalid="true"` + `aria-describedby` → error text | `accessibilityInvalid` (RN ≥ 0.76) + error text in the label/hint | `border.danger` + `text.danger` message with an icon; not colour only |
| read-only | `readOnly` | `editable={false}` | `bg.subtle`, no border emphasis, text still `text.primary` |

### 0.3 Size vocabulary
| Size | Height | Font | Use | Hit area |
|---|---|---|---|---|
| `sm` | `size.control.sm` 36 | `text.buttonSm` 14 | desktop dense areas (tables, filter bar) | extended to 44 on `pointer: coarse`; native never uses `sm` |
| `md` (default) | `size.control.md` 44 | `text.buttonMd` 16 | everything else | 44 |
| `lg` | `size.control.lg` 52 | `text.buttonMd` 16 | primary CTAs, sticky bars, hero search, auth submit | 52 |

### 0.4 Accessibility baseline (applies to every component)
Zoom allowed (no `user-scalable=0`). Every interactive element ≥ 44×44 hit area and ≥ 8 px from the next target. Every icon-only control has an accessible name. Focus order follows the visual order. Nothing is hover-only. Motion respects reduced-motion settings. Georgian first: labels wrap instead of truncating; widths are tested with the longest Georgian string. `lang` is set on content that is in the other language (e.g. a Georgian-fallback gig on an English page, ADR-006 §6).

### 0.5 Visual refresh (Phase 3X): which tokens each component uses
Source: the approved [visual-refresh.md](visual-refresh.md) (§ numbers below) and [tokens.md](tokens.md) §6.8, §6.10, §6.11. This **adds** to the per-component tables below; where a table names a flat fill (`action.primary`), the refreshed look paints the matching gradient over it and keeps the flat colour as the fallback and the pressed/disabled colour. The restyle tasks 3X.9–3X.17 apply this; 3X.6 only provides the tokens.
| Component | Rest | Hover / open / selected | Pressed / motion | § |
|---|---|---|---|---|
| Button `primary` / `secondary` / `danger` / `accent` | `gradient.action.<variant>`, 1 px `border.action.<variant>`, `elevation.control` + `highlight.filled` (secondary: `highlight.secondary`) | `::before` layer `gradient.action.<variant>Hover` fades in; secondary border → `border.action.secondaryHover`; `glow.brand` (`accent` → `glow.accent`, `danger` → `glow.danger`); lift `distance.liftControl` | flat `action.<variant>Pressed` + `highlight.pressed`, `scale.pressed`, `duration.press` in / `fast` out | 4 |
| Button `ghost` / `outline` | transparent, 1 px `border.action.ghost` (outline keeps `border.brand`) | `gradient.action.ghostHover` | as above | 4.2 |
| Button loading / success | label kept, `opacity` 0.85, spinner (static "…" under reduced motion) | success: one `glow.success` pulse, 400 ms | — | 4.3 |
| IconButton | as Button `secondary`, round (`radius.full`) or square 8 | as secondary | as Button | 4.2 |
| Input, Select, Textarea, PriceInput, SearchBar | `gradient.input`, **`border.strong`** (≥ 3:1, kept — the preview's lighter `neutral.300` rest border fails WCAG 1.4.11), inset `0 1px 2px` | hover border `neutral.450` (= `border.strong`); focus `border.brand` + `glow.brand` + focus ring | invalid: `border.danger` + `glow.danger` half | 6.3 |
| Switch, Checkbox, Radio | track `gradient.track`; on/checked = `gradient.action.primary` | — | thumb slide `duration.fast` `emphasized`; check-mark draw 200 ms (shown at once under reduced motion) | 6.3 |
| Chip (skills, filters) | white → `neutral.50`, 1 px `border.default` | border `brand.400`, `glow.brandSoft`, lift 1 | selected: `bg.selected` → `bg.brandSoft`, `border.brand`, `badge.brandText`; on a category page the category `tint`/`ink` replaces brand | 6.2 |
| Badge / Pill / StatusBadge | own tint + soft top gradient + 1 px border a step darker; Featured = `gradient.action.accent` + `action.onAccent` | none (not interactive) | none | 6.2 |
| Tabs | text `text.secondary` | active: `text.brand` + 3 px `gradient.indicator` | indicator slides (`transform`, `duration.base`) | 6.2 |
| RoleSwitcher | track `gradient.track`, inset shadow | thumb = Button `primary` look | thumb slides `duration.base` `emphasized` | 6.2 |
| Card, GigCard, FreelancerCard, ProfileCard, PortfolioCard, StatTile, Panel | `gradient.surface`, 1 px `border.default`, `elevation.sm` + `highlight.surface`, **`radius.card` 16** | interactive cards only (`@media (hover: hover)`): lift `distance.liftCard`, `elevation.md` + `glow.brandSoft`, border `border.cardHover`; media zoom `scale.hover` | `scale` 0.99 for `duration.press` | 3.2, 6.1 |
| GigCard `featured` | keeps the orange 2 px frame (spec 03 AC-18) | `glow.accent` | — | 6.1 |
| Header | `bg.translucent` + `backdrop-filter: saturate(1.4) blur(12px)` (fallback `bg.surface`), hairline `border.translucent` | over the home hero: transparent, fades to translucent on scroll | `duration.base` | 3.3 |
| Category bar item (`.mt-category-bar-item`) | `.mt-cat` pill: `--mt-cat-tint` → `--mt-cat-tint-strong`, border `--mt-cat-tint-strong`, text `--mt-cat-ink` semibold, 8 px dot `--mt-cat-indicator`; over the hero `bg.overHero` + `border.overHero` + white | hover / `aria-expanded`: `--mt-gradient-category`, text + dot `--mt-cat-on-solid`, `--mt-glow-category`, lift 1 | current category: filled, no lift | 8.4 |
| MegaMenu / Menu / Dropdown / Select popover | `bg.translucent` + blur, `elevation.lg`; mega-menu 3 px `--mt-gradient-category` strip, headings `--mt-cat-ink` | items: `--mt-cat-tint` + `--mt-cat-ink` (`duration.fast`) | open: opacity + `translateY(-6px)` + `scale` 0.98 → 1, `duration.base` `enter`; close `duration.fast` `exit` | 6.4, 8.4 |
| NavDrawer | dot + 3 px `--mt-cat-indicator` start bar on expanded rows | sub-rows `--mt-cat-tint` | `translateX`, `duration.slow` `emphasized` | 6.4, 8.4 |
| Dialog | panel + 4 px `gradient.brandStrip` on top | — | scrim fade `duration.base`; panel opacity + 12 px + 0.98 → 1, `duration.slow` `emphasized` | 6.4 |
| Alert / Toast | feedback tint gradient + 4 px start bar in the feedback colour | — | fade + 4–8 px slide, `duration.base` `enter` | 6.4 |
| Skeleton | `gradient.skeleton` | — | shimmer `duration.shimmer` (off under reduced motion) | 6.4 |
| EmptyState | 64 px icon circle `bg.selected` → `bg.brandSoft` + static `glow.brandSoft` ring | — | — | 6.4 |
| Category tile, category row heading, category page band, breadcrumb, explore chips | `.mt-cat` + `categoryStyle(color)`: tile label band `--mt-gradient-category` + `--mt-cat-on-solid`; row heading dot + 4 px `--mt-cat-indicator` bar; page band `--mt-gradient-category`; breadcrumb chips `--mt-cat-tint`/`--mt-cat-ink` | tile: `--mt-glow-category` + card hover | entrance stagger `stagger.step` × ≤ `stagger.max` | 8.5 |
| Hero | `gradient.hero` | — | radial layer drift `duration.drift` (off under reduced motion) | 3.4 |
| Native (all of the above) | same tokens from `@mytask/tokens/native`: `theme.gradient.*` as `expo-linear-gradient` props, `theme.glow.*` (iOS shadow; Android elevation + 1 px coloured border), `categoryTheme(color, scheme)` for category colours | — | Reanimated with `motion.spring.default`, `scale.pressed`, `FadeInDown` 300 ms + 40 ms stagger, `reduceMotion: ReduceMotion.System` | 10 |

---

## 1. One component per job (legacy systems merged)
| Job | Legacy systems (audit §1.12) | New component | Notes |
|---|---|---|---|
| Buttons | **4**: `x-forms.button` ×82 (`text-xs py-3 px-8 rounded-md`), `x-bladewind.button` ×13 (`rounded-full`), 288 hand-written `<button>` (gig CTA `text-[13px] py-4 px-8 rounded`, search `px-5 py-4 rounded-md`), `.plan-button` (`rounded-full #2EBFF6`) | **`Button`** (+ `IconButton`) | one radius (`radius.control`), 3 sizes, 6 variants |
| Modals | **3** (+1): `x-forms.modal` Flowbite ×48, `x-bladewind.modal` ×1, `wire-elements-modal`, WireUI `x-dialog` | **`Dialog`** (web) that presents as **`BottomSheet`** on phones/native; `ConfirmDialog` preset | dialog semantics + focus trap (legacy had neither) |
| Toasts / alerts | **3**: WireUI notifications (top-centre card), toastr (full-width bar), `livewire-alert` SweetAlert | **`Toast`** (transient) + **`Banner`** (inline, persistent) | one position rule; SweetAlert confirmations become `ConfirmDialog` |
| Icons | **4**: Heroicons inline (solid 20 + outline 24), Remix/Boxicons-style inline, Phosphor webfont (unpkg CDN), Tabler webfont (bundled, unused) | **`Icon`** from **Phosphor** (§2) | one set, SVG, no webfont, no CDN |
| Inputs | `x-forms.text-input` ×77, 203 raw `<input>`, placeholder-only auth inputs, rawilk form-components, Select2, FilePond, Quill/CKEditor/TinyMCE | **`Field`** + `Input` / `Textarea` / `Select` / `Checkbox` / `Radio` / `Switch` / `FileUpload` / `RichTextEditor` | visible label always |
| Breadcrumbs | plain grey with English "Home" (gig) vs white card "მთავარი" (project) | **`Breadcrumb`** | one style, translated |
| Price | `₾700.00 / ₾1,000.00`, `₾700.00 - ₾1,000.00`, `₾30.00 – ₾100.00`, `₾` + `9.99` + `/თვე` spans | **`Price`** | one format |
| Dark palettes | 3 (main, chat, pricing) | tokens `theme.dark` | automatic via role tokens |

**Count: 58 components** in 8 groups (§3–§10), listed in the index (§11).

---

## 2. Icon set: Phosphor Icons
**Decision:** [Phosphor Icons](https://phosphoricons.com) v2, **MIT licence**, for web and mobile. Weights used: **Regular** (default, 1.5 px stroke at 24) and **Fill** (selected/active states only). Sizes from tokens: 16 / **20** (inside controls) / **24** (standalone) / 32 / 48.

Why Phosphor:
1. **Continuity:** the live site already uses Phosphor (`@phosphor-icons/web@2.0.3` webfont, `main-app.blade.php:606`, `ph-fill`/`ph-duotone`, and 256×256 inline icons ×10). Keeping it is the "evolve" option; users see familiar glyphs.
2. **Regular + Fill pairs for every icon.** The tab bar (active tab = filled), favourite heart (saved = filled), rating stars (filled/empty), and selected nav items need a filled twin. Lucide and Heroicons outline sets do not provide consistent filled versions.
3. **Both platforms, same paths.** Web: `@phosphor-icons/react` (official). Native: `@phosphor-icons/core` (official raw SVGs) rendered through `react-native-svg`. To keep web and native pixel-identical and ship only the icons we use, `packages/ui` generates its own `Icon` components from `@phosphor-icons/core` at build time (a small script in Phase 3). The community `phosphor-react-native` package is an acceptable fallback, not a dependency we rely on.
4. **Coverage:** about 1,500 icons, including everything in the list below (cart, wallet, seal-check, chat, paperclip, currency-free price display, etc.).
5. **Licence:** MIT, no attribution needed in the UI; the licence text ships in `packages/ui` (and is recorded in `packages/assets/SOURCES.md` when the first icon file is added in Phase 3).

Alternatives considered: **Lucide** (ISC, official RN package, but no filled weight and a different look from what users know); **Heroicons** (MIT, used inline in legacy, but only ~300 icons and no official RN package); **Material Symbols** (Apache 2.0, large, but a Google look and a variable-font pipeline). Rejected for the reasons above.

Rules: icons use `currentColor` (colour comes from the text role). Decorative icons are `aria-hidden` / `accessible={false}`. An icon never carries meaning alone: a label, `aria-label`, or visible text goes with it. Social brand logos (Facebook, X, LinkedIn, WhatsApp, Google) are the only non-Phosphor icons (their official marks, `color.social`).
Canonical icon names (one icon per meaning, so web and mobile match):
| Meaning | Phosphor | Meaning | Phosphor |
|---|---|---|---|
| search | `MagnifyingGlass` | cart | `ShoppingCart` |
| menu (hamburger) | `List` | close | `X` |
| home | `House` | gigs / explore | `SquaresFour` |
| projects | `Briefcase` | messages | `ChatCircleDots` |
| notifications | `Bell` | account | `UserCircle` |
| dashboard | `SquaresFour` / `Gauge` | wallet / balance | `Wallet` |
| HOLD / pending | `HourglassMedium` | withdraw | `ArrowCircleUpRight` |
| favourite | `Heart` (Fill = saved) | rating | `Star` (Fill / Regular / `StarHalf`) |
| verified | `SealCheck` (Fill) | Premium / Featured | `Crown` (Fill) |
| share | `ShareNetwork` | report | `Flag` |
| filter | `SlidersHorizontal` | sort | `ArrowsDownUp` |
| delivery time | `Clock` | revisions | `ArrowsClockwise` |
| calendar | `CalendarBlank` | attachment | `Paperclip` |
| send | `PaperPlaneRight` | upload | `UploadSimple` |
| download | `DownloadSimple` | image | `Image` |
| document | `FileText` | camera | `Camera` |
| edit | `PencilSimple` | delete | `Trash` |
| more actions | `DotsThree` (`DotsThreeVertical` in tables) | add | `Plus` |
| expand / collapse | `CaretDown` / `CaretUp` | back / next | `CaretLeft` / `CaretRight` (mirrored never; both languages LTR) |
| external link | `ArrowSquareOut` | copy | `Copy` |
| show / hide password | `Eye` / `EyeSlash` | lock / security | `LockSimple` |
| success | `CheckCircle` | warning | `Warning` |
| error | `WarningCircle` | info | `Info` |
| language | `Globe` | theme light / dark | `Sun` / `Moon` |
| settings | `Gear` | log out | `SignOut` |
| buying role | `ShoppingBag` | selling role | `Storefront` |
| online | (dot, no icon) | empty results | `MagnifyingGlassMinus` / illustration |

---

## 3. Foundations
### 3.1 Icon
- **Purpose:** render a Phosphor icon by canonical name (§2).
- **Props:** `name`, `size` (`xs|sm|md|lg|xl` = 16/20/24/32/48), `weight` (`regular|fill`), `label?` (if given the icon is meaningful: web `role="img" aria-label`, native `accessibilityLabel`; otherwise hidden from assistive tech).
- **States:** none (inherits colour).
- **Web vs mobile:** web inline SVG; native `react-native-svg`. Same paths.
- **Used by:** every component and screen.

### 3.2 Logo
- **Purpose:** the MyTask wordmark (header, footer, auth panel, emails per Q-076) and the square mark (favicon, app icon, compact places) once approved (Q-075, proposal in `packages/assets/brand/`).
- **Variants:** `wordmark` (current trimmed PNG until a vector exists; sized by real height `size.layout.logoHeight` 32 desktop / 28 mobile, fixing the 120 px padded image in an 80 px header), `mark` (proposal), `mono-white` (on hero/dark if needed).
- **A11y:** link to home with `aria-label` = site name (`t_ui_home_link`), image `alt=""` inside the labelled link.
- **Web vs mobile:** native uses the mark on the splash screen and the wordmark in the Home tab header.
- **Used by:** Header, Footer, auth pages (spec 01), emails (spec 15).

### 3.3 Text and Heading
- **Purpose:** apply `text.*` styles; guarantee one `h1` per page (audit: two h1 on profile, h2 as top heading on CMS pages).
- **Props:** `variant` (`display|h1|h2|h3|title|bodyLg|body|bodySm|label|caption|eyebrow`), `as` (web element), `color` (text role), `clamp?` (line count), `tabular?`.
- **Rules:** never uppercase; clamp by lines (web `-webkit-line-clamp`, native `numberOfLines`); `lang` prop for content in the other language.
- **Used by:** everywhere.

### 3.4 Divider
- `hairline` 1 px `border.default` horizontal/vertical; `labelled` variant for the auth "or" divider (text centred, `text.muted`). Decorative (`role="separator"` only when it separates menu groups).
- **Used by:** auth (spec 01), menus, cards.

### 3.5 Spinner and ProgressBar
- **Spinner:** sizes 16/20/24/32, colour `currentColor`; `role="status"` with `t_ui_loading` text for screen readers when standalone; inside a Button it is decorative (the button carries `aria-busy`).
- **ProgressBar:** determinate (upload %, wizard progress, profile completeness) and indeterminate (top page loader replacing the blue `#2299DD` Livewire bar). Track `bg.subtle`, fill `action.primary`, height 4 (page) or 8 (upload). `role="progressbar"` with `aria-valuenow/min/max` and a label.
- **Reduced motion:** indeterminate animation becomes a static striped bar.
- **Used by:** FileUpload (specs 02, 04), gig wizard progress (04), page navigation.

### 3.6 VisuallyHidden
- Screen-reader-only text (translated; legacy `sr-only` texts were English). Native: use `accessibilityLabel` instead.

---

## 4. Actions
### 4.1 Button
- **Purpose:** every clickable action that is not navigation text. Replaces the 4 legacy button systems.
- **Variants:**
  | Variant | Tokens (bg / text / border) | Use |
  |---|---|---|
  | `primary` | `action.primary` / `action.onPrimary` | one main action per view: Add to cart, Send a proposal, Confirm, Log in, Publish, Filter/Show results |
  | `secondary` | `action.secondary` / `action.onSecondary` | "Contact freelancer", Cancel, Go back (legacy grey buttons) |
  | `outline` | `bg.surface` / `action.onGhost` / 1 px `border.brand` | secondary brand action next to a primary: "Send a proposal" on project list rows (legacy outlined), "Switch to buying" |
  | `ghost` | transparent / `action.onGhost`, hover `action.ghostHover` | low-emphasis: "See more", toolbar actions, "Reset filter" |
  | `danger` | `action.danger` / `action.onDanger` | destructive confirmation: delete gig, delete account, cancel order |
  | `accent` | `action.accent` / `action.onAccent` | **promotional only**: Premium "Buy", "Upgrade to Premium", "Invite and earn points" (replaces sky blue `#2EBFF6`, Q-078). Max one per screen |
- **Sizes:** `sm` 36 (web dense only) · `md` 44 · `lg` 52. Padding x: 12 / 16 / 24. Radius `radius.control` (8) for all. Min width 88 (so short Georgian words such as "დიახ" still look like buttons).
- **3X look:** gradient fill, always-visible border, lit top edge and glow on hover (§0.5). Sizes, padding and radius unchanged.
- **Options:** `iconStart`, `iconEnd` (20 px), `fullWidth` (auth, sticky bars, mobile dialogs), `loading`, `href` (renders a link styled as a button: `<a>` on web, Link on native).
- **States:** hover `*Hover`; focus-visible ring; pressed `*Pressed` (+ scale 0.98 native); disabled `action.disabled` / `action.onDisabled` for **all** variants; loading = spinner before the label, label kept (width stable), `aria-busy`, clicks ignored; there is no error state (errors show on the form or as a Toast).
- **Text:** `text.buttonSm/Md`, weight 600, **wraps to two lines** rather than truncating (Georgian); never uppercase.
- **A11y:** native `<button type="button|submit">`; `aria-disabled` + focusable when a disabled button needs a tooltip explaining why (e.g. "Premium required" on Send a proposal, spec 11); loading announced by `aria-busy`, success/failure announced by the Toast/Field.
- **Web vs mobile:** web hover states; native `Pressable` with Android ripple (`bg.pressed` colour) and iOS opacity-free pressed colour. Native minimum `md`.
- **Used by:** every spec. Specs 01 (submit, social), 02 (switcher actions, save blocks), 03 (Filter, Reset filter), 04 (Add to cart, Contact seller, wizard Next/Publish, Upgrade to Premium on the plan-limit screen AC-2).

### 4.2 IconButton
- **Purpose:** icon-only actions: close ×, favourite ♥, share, more ⋯, carousel prev/next, password eye, theme toggle, cart, hamburger.
- **Variants:** `ghost` (default), `secondary` (filled grey circle), `overlay` (white `bg.surface` circle with `shadow.sm`, used on images: favourite on gig cards, gallery arrows), `primary` (e.g. chat Send).
- **Sizes:** visual 32 / 40 / 44, **hit area always ≥ 44×44** (padding or pseudo-element). Icon 20 (visual 32/40) or 24 (44). Shape `radius.full` for overlay/secondary, `radius.control` for ghost in toolbars.
- **Toggle mode:** `pressed` prop → `aria-pressed` (favourite, theme toggle, "save"), icon switches Regular → Fill, colour `status.favourite` for the heart.
- **States:** as Button; loading shows a spinner in place of the icon.
- **A11y:** `label` prop is **required** (type-enforced) → `aria-label` / `accessibilityLabel`, e.g. `t_add_to_favourites` / `t_remove_from_favourites`, `t_ui_close`. Tooltip shows the same label on hover/focus (web), long-press (native), linked with `aria-describedby` only if it adds information.
- **Fixes:** legacy favourite 32×32 (`gig.blade.php:79`), header language/theme 32×32, 32 px social share buttons, unnamed modal close buttons.
- **Used by:** GigCard (spec 03/04 favourite), gig page Actions (04), Header, Dialog close, chat Composer, gallery.

### 4.3 Link
- **Purpose:** navigation text. Web `<a>` / Next.js Link with locale-aware href helper (ADR-006); native Expo Router `Link`.
- **Variants:** `inline` (inside text: `text.link`, underlined, hover `text.linkHover`), `standalone` (e.g. "See more", "Forgot password?": `text.link`, weight 500, no underline until hover, optional `CaretRight` icon), `subtle` (footer, breadcrumb: `text.secondary` → hover `text.link` + underline), `onDark` (hero/footer dark areas: `text.onHero`).
- **States:** hover underline + colour; focus-visible ring (radius `sm`); visited = same colour (app, not documents); disabled not allowed (render text instead); `aria-current="page"` for the current page in nav lists.
- **External links:** `target="_blank"` gets `rel="noopener noreferrer"`, an `ArrowSquareOut` icon and `t_ui_opens_in_new_tab` hidden text.
- **Rules:** a link must look like a link inside running text (underline); colour-only links fail WCAG 1.4.1. **No HTML in translation strings:** links inside sentences are passed as components to i18next `Trans` (fixes the broken curly-quote consent links, audit §3.13).
- **Hit area:** standalone links in lists/footers get ≥ 44 px row height on touch (legacy footer links 14 px with `mb-2`).
- **Used by:** everywhere; "See more" on home rows is visible on **all** sizes now (audit §3.2).

---

## 5. Forms
### 5.1 Field (label + control + help + error)
- **Purpose:** the wrapper every form control uses. Guarantees a visible label (legacy auth inputs were placeholder-only).
- **Anatomy:** `Label` (`text.label`, `text.primary`, required marker `*` in `text.danger` + hidden `t_ui_required`; optional marker "(optional)" text `t_ui_optional` when most fields are required), control, `HelpText` (`text.bodySm`, `text.muted`), `ErrorText` (`text.bodySm`, `text.danger`, `WarningCircle` icon), optional `Counter` ("0/2500", `text.caption`, right-aligned).
- **Layout:** label above the control (all sizes; long Georgian labels wrap, **never truncate**, fixing the contact form). Gap 8 label→control, 4 control→help/error. Fields stack with 16–20 gap; two-column only from `md` and only for short pairs (name + email on contact, price min/max).
- **A11y:** `<label for>`; help and error linked by `aria-describedby` (error first); `aria-invalid`; `aria-required`. On submit with errors: an `ErrorSummary` Banner at the top listing the errors as links, focus moves to it (or to the first invalid field on short forms), announced via `aria-live="assertive"` (spec 01 "errors are announced"). Counter uses `aria-live="polite"` only when within 10 % of the limit.
- **Native:** label `Text` + `accessibilityLabel` on the input combining label and state; error appended to `accessibilityHint`; screen reader announcement via `AccessibilityInfo.announceForAccessibility` on submit errors.
- **Used by:** every form (specs 01–04, contact form spec 17).

### 5.2 Input
- **Types:** text, email, password (`PasswordInput`: show/hide IconButton `Eye`/`EyeSlash` with label `t_ui_show_password`/`t_ui_hide_password` and `aria-pressed`), number/decimal (`inputmode="decimal"`, never the invalid legacy `type="integer"`), tel, url, search (see SearchBar).
- **Anatomy:** height 44 (`md`) or 52 (`lg`, auth and hero); padding x 12; radius `control`; bg `bg.surface`; border 1 px `border.strong`; text `text.body` 16 (prevents iOS zoom); placeholder `text.muted` (examples only, never the label); optional prefix/suffix slot (e.g. `₾` prefix in PriceInput, unit "დღე" suffix).
- **States:** hover border `text.secondary`; focus border `border.brand` + focus ring; invalid border `border.danger` (+ 2 px on focus); disabled `action.disabled` bg, `action.onDisabled` text; read-only `bg.subtle`.
- **Autofill:** correct `autocomplete` tokens (`email`, `username`, `current-password`, `new-password`, `one-time-code`, `name`); native `textContentType`/`autoComplete` equivalents.
- **Used by:** auth (01), settings/profile (02), search price filters (03, with visible labels "მინ." / "მაქს."), wizard (04).

### 5.3 PriceInput and QuantityInput
- **PriceInput:** Input with a `₾` prefix, `inputmode="decimal"`, accepts `,` or `.` and normalises to 2 decimals on blur (spec 04 AC-8 format `^\d+(\.\d{1,2})?$`); value handed to the API in tetri by the app, not by the component. Shows a read-only "You will receive" companion field when needed (proposal form, spec 11).
- **QuantityInput:** − / value / + with IconButtons (44 hit area each), min/max, typed input allowed, `role="spinbutton"` semantics on the value. **Not used on the gig page or in the cart at launch:** quantity is always 1 (spec 06 P-46, spec 04 AC-26 as revised). It **is** needed at launch for the "number of revisions" field (0…S-041): gig wizard pricing (spec 04 AC-9) and proposal form (spec 11 screens: "revisions (stepper 0…S-041)"). (Updated in P2-C3; revisions use added in P2-C4, 2026-09-29.)
- **Used by:** gig wizard pricing/upgrades (04), proposal (11), withdrawals (14), top-up (05).

### 5.4 Textarea
- As Input, min height 120 (4 lines), auto-grows up to 320 then scrolls; Counter optional (contact message 0/2500, FAQ answer ≤ 300, spec 04). Native: `multiline` with `textAlignVertical="top"`.
- **Used by:** contact (17), wizard description/FAQ (04), proposal description (11), appeal message (01), report dialogs (02, 04), delivery message (06).

### 5.5 RichTextEditor
- **Purpose:** restricted rich text for gig descriptions and similar long content (legacy used three editors: Quill, CKEditor, TinyMCE).
- **Scope:** bold, italic, bulleted and numbered lists, links, paragraphs. No colours, fonts, headings sizes or images. Output sanitised by the API.
- **Toolbar:** IconButtons with labels and `aria-pressed`; keyboard shortcuts (Ctrl/Cmd+B, I).
- **Native:** a plain multiline Textarea with Markdown-like list support at launch (rich editing on phones is error-prone); the API stores one format. **Open point:** the exact allowed formatting follows spec 04 (legacy stored HTML); engineer and product-analyst confirm in slice 3.
- **Used by:** gig wizard (04), project posting (10), CMS/blog in admin (17).

### 5.6 Select
- **Purpose:** choose one option from a list (category levels, delivery time, number of revisions, language level, sort).
- **Web:** a custom listbox button (to match styling and allow long Georgian options) with full ARIA combobox/listbox keyboard support (Up/Down, Home/End, type-ahead, Esc, Enter); falls back to native `<select>` on `pointer: coarse` for the best phone experience. Searchable variant (`Combobox`) for lists > 10 items (country, skills, categories). Multi-select variant with removable Chips (skills).
- **Native:** opens a BottomSheet list (searchable when > 10 items) with radio semantics; the trigger looks like an Input with `CaretDown`.
- **Anatomy/states:** as Input; menu uses `bg.surfaceRaised`, `shadow.md`, radius `card`; option rows 44 high, selected row `bg.selected` + `Check` icon.
- **Dependent selects:** the 3 category levels (spec 04) disable the next level until the previous is chosen, with help text explaining why.
- **Used by:** wizard (04), search sort (03, as a Menu on web / BottomSheet on native), profile languages (02), settings.

### 5.7 Checkbox
- **Visual:** 20×20 box, radius `xs`, border 1.5 `border.strong`; checked fill `action.primary` with white `Check`; indeterminate bar. **Hit area 44×44** including the label (the whole row is clickable).
- **States:** hover border `border.brand`; focus ring on the box; disabled; invalid (`border.danger` + Field error, e.g. terms checkbox on register).
- **Row variant `CheckboxCard`:** bordered card row used for gig **upgrades** in the purchase box (title, "+ ₾20.00", extra days line); checked = `border.brand` 2 px + `bg.selected`.
- **A11y:** native `<input type="checkbox">`; native RN `accessibilityRole="checkbox"` + `accessibilityState.checked`.
- **Fixes:** legacy 16 px checkboxes with `focus:ring-0` (filters, upgrades, terms).
- **Used by:** register terms, remember me (01), search filters (03), purchase box upgrades (04), settings notifications.

### 5.8 Radio and RadioCard
- **Radio:** 20 px circle, checked inner dot `action.primary`; row hit area 44. Group uses `role="radiogroup"` with a visible group label (`fieldset`/`legend`); arrow keys move selection.
- **RadioCard:** bordered selectable card (payment method list in checkout: Wallet with balance, BOG card with "+2.5%" note; plan selection monthly/yearly; KYC document type). Selected = `border.brand` 2 px + `bg.selected` + check icon.
- **Rating filter** (spec 03): radio rows show RatingStars + text "4+ ვარსკვლავი" (not a bare number, audit §3.3).
- **Used by:** search filters rating and delivery time (03), checkout payment method (05/06), verification centre step 1 (02), plans (09).

### 5.9 Switch
- **Purpose:** immediate on/off settings (2FA toggle, notification preferences, availability, "remember me" is a Checkbox not a Switch).
- **Visual:** 44×24 track (`size.switch`), off `border.strong` outline + `bg.subtle`, on `action.primary`, white knob with `shadow.sm`; label on the left (text), switch on the right; the whole row is the hit area.
- **Behaviour:** applies immediately with an inline saving spinner and a Toast on success/failure (spec 02 "per-block saving spinner"); if a confirmation is needed (turning 2FA off) it opens a ConfirmDialog.
- **A11y:** `role="switch"` + `aria-checked`; native `Switch` with `accessibilityLabel`. Never colour only: knob position + optional "ON/OFF" text is not needed because position is non-colour.
- **Used by:** Security card 2FA (01), availability (02), notification settings (15).

### 5.10 CodeInput (2FA / verification code)
- 6 boxes of 48×56, `text.h2` digits, mono tabular; paste fills all boxes; auto-advance; backspace goes back; `inputmode="numeric"` `autocomplete="one-time-code"` (web) / `textContentType="oneTimeCode"` (iOS) and SMS/email autofill; one hidden real input for screen readers labelled `t_ui_verification_code`.
- **States:** error (all boxes `border.danger` + message: wrong / expired / too many), loading after the 6th digit, disabled during lockout with a Countdown ("Resend in 0:45").
- **Used by:** 2FA login step (01 AC for 2FA), staff 2FA (16).

### 5.11 DatePicker
- Minimal date selection (availability "unavailable until", spec 02). Web: native `<input type="date">` styled as Input (accessible by default) with min = tomorrow; native: platform date picker inside a BottomSheet. Error "date must be in the future".
- **Used by:** availability modal/sheet (02), admin filters (16).

### 5.12 SearchBar
- **Purpose:** keyword search for gigs (header pill with category menu inside, hero search, explore projects search, chat contact search, menu accordion search).
- **Variants:** `header` (pill `radius.full`, height 44, with an optional category Menu trigger on the left, as live), `hero` (height 52, radius `xl`, large with a primary "ძებნა" Button attached), `inline` (lists, chat), `compact` (mobile header icon that expands to a full-screen search screen on phones).
- **Behaviour:** submit on Enter/button → `/search?q=` (spec 03); clear button (`X`, label `t_ui_clear_search`) when not empty; optional suggestions listbox (recent searches, categories) with combobox ARIA; debounce 250 ms for live filtering lists only.
- **A11y:** `role="search"` landmark on the form; visible or `aria-label` label (`t_search_placeholder` is not a label); results count announced politely on list pages.
- **Mobile:** the header search is currently hidden on phones (audit §3.1). New: a search IconButton in the mobile header opens a full-screen search view with recent searches and the category list; native app has search in the Explore tab.
- **Used by:** Header, Home hero (03), search/category pages (03), Explore projects (10), chat list (08), category menu accordion (03).

### 5.13 FileUpload and MediaGallery editor
- **Purpose:** upload images/documents with progress, validation and ordering (gig gallery, portfolio, KYC photos, appeal files, chat attachments, deliveries).
- **Variants:** `dropzone` (dashed `border.strong`, radius `card`, icon + "Drag files here or choose", accepted types and max size as help text), `button` ("Attach" Button + list), `avatar` (circle preview + "Change"), `gallery` (grid of thumbnails 3:2 with order handles, "Cover" badge on the first, remove IconButton, add tile).
- **Per-file states:** queued, uploading (ProgressBar + % + cancel), done (thumbnail/file chip), error (type/size message per file, retry/remove), pending moderation note when applicable (spec 02 S-071 off).
- **A11y:** the dropzone is a real button that opens the file dialog; drag-and-drop is optional sugar; reorder by keyboard with "Move left/right" menu items (not drag only); live region announces "3 of 5 uploaded".
- **Native:** action sheet with **Camera**, **Photo library**, **Files** (spec 01 appeals, spec 02 KYC "camera first"); images compressed client-side before upload to the signed URL (ADR-009).
- **Used by:** wizard gallery + documents (04), portfolio (02), avatar (02), verification centre (02), appeals (01), chat (08), deliveries (06), disputes (13).

### 5.14 Chip (filter chip, tag, input chip)
- **Variants:** `filter` (toggle, e.g. "Popular" project categories on Explore, active filters row with ×), `link` (skill chips linking to `/hire/{skill}`, spec 02/03), `input` (selected skills in a multi-select, removable).
- **Visual:** height 32 visual (hit 44 via padding), radius `full`, `bg.brandSoft` + `text.brand` for skills; `bg.surface` + `border.default` for filters, selected = `bg.selected` + `border.brand` + `Check` icon. Replaces legacy `rounded-[40px]` category chips.
- **A11y:** filter chips are toggle buttons (`aria-pressed`); removable chips have a remove button labelled "Remove {name}".
- **Used by:** Explore projects chips (03/10), profile skills (02), search active filters (03), wizard tags (future).

---

## 6. Navigation
### 6.1 Header (web) and Mobile header
- **Keep (audit §3.1):** left→right hamburger (below lg), Logo, pill SearchBar with the category menu, theme toggle, cart, "გამოწერა" (Subscription), "აღმოაჩინე" (Explore) dropdown with 3 described links (Gigs / Projects / Support centre), Login and a Register button. Logged in: notifications Bell with count badge, messages, cart, avatar AccountMenu, and the dashboard link.
- **Second row:** the 7 top categories (`CategoryBar`, height 48) opening the MegaMenu (§6.3).
- **Signature behaviour kept:** transparent over the hero, turns `bg.surface` + `border.default` bottom + `shadow.sm` on scroll (`.main-header-scrolling`), transition `motion.duration.base`.
- **Changes:** height 72 (desktop) / 56 (mobile), logo sized by real height; Register becomes `Button` `primary` `sm/md` (legacy off-palette `bg-[#f8f7f4] rounded-3xl pb-[9px]` pill); theme toggle is an IconButton with `aria-pressed` (no page reload); header links use `text.bodySm` 500 consistently; the header icon buttons get 44 hit areas. Language switcher shows **both ქართული and English** (audit §0.7, ADR-006).
- **A11y:** `<header>` landmark; skip link "Skip to content" (`t_ui_skip_to_content`) as the first focusable element; Explore and Account menus are buttons with `aria-expanded`, opened by click/tap/Enter (not hover-only).
- **Mobile web:** hamburger opens the `NavDrawer` (§6.4); search icon opens full-screen search; cart icon stays.
- **Native app:** no web header; each tab has a native stack header (title `text.h3`, back button, contextual actions) and the TabBar (§6.9).
- **Used by:** all public pages; specs 01–04 screens.

### 6.2 Footer
- **Keep:** 4 columns (Company / Legal / Links / Support centre), logo, "© MyTask {year}", Facebook, language selector.
- **Changes:** links `text.muted` → hover `text.link` (legacy `gray-400` 2.54:1 fails); link rows ≥ 44 px on touch; in dark mode links use `text.secondary` (legacy made links brighter than headings). Below `md` the 4 columns become an **Accordion** (one open at a time) so the page does not end with a long list.
- **A11y:** `<footer>` landmark, each column a `<nav aria-label>`.
- **Native:** none; links live in Account → About / Legal.

### 6.3 MegaMenu / CategoryMenu
- **Purpose:** browse the 3-level gig category tree (header "სარჩევი" and CategoryBar).
- **Behaviour (fixes hover-only):** opens on **click/tap** and on Enter/Space/ArrowDown; on devices with hover it also opens after a 150 ms hover intent and stays open while the pointer is inside; closes on Esc (focus returns to the trigger), outside click, or Tab out. Arrow keys move between top categories; Tab moves into the sub-category columns.
- **Visual:** panel `bg.surfaceRaised`, `shadow.md`, radius `card`, category icons (admin artwork, Q-077 kept) 24 px, sub-category links `text.bodySm`. Animation: fade + 4 px slide, `motion.duration.base` (legacy `scale-75 → 100`).
- **A11y:** disclosure pattern (`button aria-expanded aria-controls` + lists of links), not an ARIA `menu` (these are navigation links).
- **Mobile:** inside the NavDrawer as an Accordion with a SearchBar filter at the top (spec 03). Native: Explore tab → category list screens.
- **Used by:** Header (spec 03), category pages.

### 6.4 NavDrawer (slide-over)
- **Purpose:** mobile web navigation (keep the live slide-over model), the dashboard sidebar below `md`, the cart slide-over, and the mobile filter panel.
- **Variants:** `left` (nav, dashboard sidebar), `right` (cart), `full` (filters on phones).
- **Behaviour:** scrim `bg.scrim`; slides in `motion.duration.slow` `easing.emphasized` (fade only with reduced motion); focus trap; Esc and scrim tap close; close IconButton labelled; body scroll locked; height uses `100dvh` (legacy `100vh` bug).
- **Content (nav):** Join/Login (guest) or account block, Gigs, Projects, categories Accordion with search, Subscription, language, theme. "Become a freelancer" is **removed** (Q-013).
- **A11y:** `role="dialog" aria-modal="true" aria-labelledby`; the trigger has `aria-expanded`.
- **Used by:** Header (mobile), DashboardShell (below md), cart (06), search filters (03).

### 6.5 Breadcrumb
- One style everywhere: `text.bodySm`, `text.secondary` links, `CaretRight` separators (decorative), current page `text.primary` with `aria-current="page"`; first item is translated "მთავარი"/"Home" (fixes hard-coded English "Home"). Wraps on two lines rather than truncating; on phones shows only the parent level as a back link ("‹ ლოგო და ბრენდინგი").
- `nav aria-label="Breadcrumb"` + ordered list; JSON-LD BreadcrumbList is emitted by the page (spec 17).
- **Used by:** gig page (04), category pages (03), project page (10), CMS pages (17).

### 6.6 Tabs
- **Purpose:** switch between sibling panels on one page (gig page: Description / FAQ / Reviews / Documents; dashboard lists: Active / Completed / Cancelled; profile sections on mobile).
- **Visual:** underline tabs: label `text.label`, inactive `text.secondary`, active `text.brand` + 2 px `border.brand` indicator (moves with `motion.duration.base`); height 44; horizontally scrollable with fade edges when overflowing (Georgian labels are long), never truncated. Optional count badge ("Reviews 12").
- **A11y:** WAI-ARIA tabs: `role="tablist"`, `tab` with matching `aria-controls`/`id` (fixes the mismatched ids on the gig page), arrow keys move, automatic activation for light panels, manual for heavy ones.
- **Mobile:** gig page on phones shows the sections stacked with headings instead of tabs (spec 04 "tabs as sections"); dashboards keep scrollable tabs. Native: a top tab bar component with the same tokens.
- **Used by:** gig page (04), dashboards (02, 06, 10), inbox filters (08).

### 6.7 SegmentedControl and RoleSwitcher (Buying / Selling)
- **SegmentedControl:** 2–4 mutually exclusive options in a track (`bg.subtle`, radius `control`), selected segment `bg.surface` + `shadow.sm` + `text.primary` 600, others `text.secondary`; height 44; equal-width segments; labels always visible, wrap if needed. `role="radiogroup"` (settings choice) or tablist (view switch). Used for plan period Monthly/Yearly (09), theme Light/Dark/System (settings), list/grid view.
- **RoleSwitcher (dual-dashboard switch, vision priority 4, spec 02):** a SegmentedControl with two options **"ყიდვა" (Buying)** with `ShoppingBag` and **"გაყიდვა" (Selling)** with `Storefront`. Selected segment uses the role colours (`role.buyingBg/Text/Accent` or `role.sellingBg/Text/Accent`) plus a check-less filled icon, keeping the legacy blue/green mental model but at AA contrast.
  - Web desktop: centred in the dashboard top bar, width fits content (max 400, no fixed `w-[25rem]`).
  - Web below `md` and native: **full-width** under the top bar / at the top of the Account tab, **labels always visible** (legacy was icon-only with no name).
  - Each option is a link to that dashboard's home; the current one has `aria-current="page"`. Switching keeps the user on the equivalent page when one exists (spec 02).
  - Dark mode styles included (legacy had no `dark:` classes).
- **Used by:** DashboardShell (02), Account tab (native).

### 6.8 DashboardShell and SidebarNav
- **Keep (audit §3.9/3.10):** fixed 240 px left sidebar (logo, nav), top bar 64 (hamburger on mobile, RoleSwitcher centre, AccountMenu right), role badge on top of the nav.
- **SidebarNav items:** icon 20 + label (`text.bodySm` 500), height 44, radius `control`; active = `bg.selected` + `text.brand` + 3 px left indicator `border.brand` + `aria-current="page"` (legacy used colour only); count badges (new orders, unread) on the right. Groups with headings (`text.caption` `text.muted`, not uppercase).
- **Buying nav:** Projects, Orders ("შეძენილი სერვისები"), Personal offers, My reviews, Refunds, Favourites. **Selling nav:** Home, Orders, Gigs, Projects (awarded / proposals), Offers, Reviews, Refunds, Unblock requests, Portfolio, Withdrawals. (Labels from legacy; one source of truth for mobile and desktop, fixing the duplicated sidebars that already differ.)
- **Role badge:** Badge `role` variant with the **legacy texts** `t_buyer_dashboard` "დამკვეთის პროფილი" / "Buyer dashboard" and `t_seller_dashboard` "ფრილანსერის პროფილი" / "Seller dashboard" (`legacy/APP/lang/ka/messages.php`), fixing the `bg-cpx-2` typo. Sidebar labels also use the legacy keys (e.g. `t_portfolio` "ჩემი ნამუშევრები", `t_withdrawals` "განაღდება", `t_offers` "მორგებული შეთავაზებები", `t_unblock_money_requests` "ფულის განბლოკვის მოთხოვნები"). (Corrected in P2-C3: the earlier draft invented new Georgian labels.)
- **Mobile web:** sidebar inside a left NavDrawer. **Native:** the Account tab shows the RoleSwitcher and the nav items as a grouped list (spec 02 "each dashboard is a list of sections").
- **Used by:** all `/account/*` and `/seller/*` screens (02, 04 My gigs, 06, 10–14).

### 6.9 TabBar (native app) 
- **Tabs (5):** **მთავარი** Home (`House`), **ძიება** Explore (`MagnifyingGlass`: gigs, projects, categories), **შეტყობინებები** Messages (`ChatCircleDots`, unread badge), **პანელი** Dashboard (`SquaresFour`, opens the last used role; RoleSwitcher at the top), **ანგარიში** Account (`UserCircle`: profile, settings, wallet, subscription, language, theme, help). Same destinations as the web header (audit §4.11); guests see Login in Account.
- **Visual:** height 56 + bottom safe area, `bg.surface` + top `border.default`; icon 24 (Regular inactive, **Fill** active), label `text.caption` always visible (Georgian labels are short enough at 13 px; if a label exceeds the width it wraps to 2 lines rather than truncates); active colour `text.brand`, inactive `text.secondary`; unread/count uses the count Badge (§7.6), max "99+".
- **A11y:** `accessibilityRole="tab"`, selected state, label includes the count ("Messages, 3 unread").
- **Web:** not used on the mobile website (the slide-over stays, audit §2.2).
- **Used by:** native app root.

### 6.10 Menu / Dropdown
- **Purpose:** a list of actions or links opened from a trigger: Explore dropdown, AccountMenu, Sort menu, row "more" (⋯) actions in tables, language menu.
- **Behaviour:** opens on **click/tap**, Enter, Space or ArrowDown (never hover-only); Esc closes and returns focus; typeahead; closes on selection and outside click; positions itself inside the viewport (flip/shift).
- **Visual:** `bg.surfaceRaised`, `shadow.md`, radius `card`, padding 4; items 44 high, radius `sm`, icon 20 + label + optional description (Explore items have a title and a one-line description, as live) + optional shortcut/check; destructive items `text.danger`; separators; group labels `text.caption`.
- **A11y:** ARIA menu button pattern for actions (`role="menu"`, `menuitem`, `menuitemradio` for Sort); disclosure + list of links for navigation menus (Explore, Account links).
- **Mobile:** below `md` and in native, menus open as a **BottomSheet** with the same items (large rows, Cancel).
- **Used by:** Header Explore + AccountMenu, Sort (03), My gigs row actions (04), orders (06).

### 6.11 Pagination and InfiniteList
- **API reality:** cursor pagination (architecture/openapi convention), so no "page 7 of 20" jumps.
- **`LoadMore` (default for public lists, SEO-friendly):** results grid + "მეტის ჩვენება" (Load more) secondary Button + "Showing 24 of 312" `text.bodySm`; the web also renders crawlable `?cursor=` next links (`rel="next"`) for SEO (spec 17 decides canonical rules).
- **`InfiniteList` (native, chat, notifications):** loads the next page when 80 % scrolled, footer Spinner, "You've reached the end" caption, pull-to-refresh on native; web chat/notifications use it with a visible "Load older" fallback button for keyboard users.
- **`Pagination` (numbered):** only for admin tables where the API offers offset paging (spec 16); Prev/Next + page numbers, 44 hit areas, `nav aria-label`, `aria-current="page"`.
- **States:** loading next page (skeleton rows/cards appended), error ("Couldn't load more. Retry" inline Button), end of list.
- **Used by:** search/category results (03), explore projects (10), dashboards lists (02, 06), chat (08), notifications (15), admin (16).

### 6.12 Stepper (gig wizard, verification centre)
- **Purpose:** show progress through a multi-step flow and let the user move between steps.
- **Web desktop (spec 04):** the gig wizard stays **one page with blocks** (Overview, Pricing + revisions, Upgrades, FAQ, Gallery, SEO dialog) and a **side summary** Stepper (vertical list) with each block's status: not started / in progress / complete (`CheckCircle` Fill `text.success`) / has errors (`WarningCircle` `text.danger`), plus a ProgressBar "3 of 5 complete". Clicking a step scrolls to its block.
- **Mobile web + native:** one block per screen (Overview → Pricing → Extras → Gallery → Review & publish), a compact horizontal Stepper at the top ("ნაბიჯი 2 / 5" + segmented progress), and a **StickyActionBar** with Back / Next (Publish on the last step). Unsaved changes prompt on leaving.
- **Verification centre (spec 02):** 3 steps (document type → document photos → selfie) then a status screen, same component.
- **A11y:** `nav aria-label` with an ordered list; current step `aria-current="step"`; step status in text ("completed", "has errors"), not only icons; focus moves to the step heading on change.
- **Used by:** gig create/edit (04), verification centre (02), project posting (10), checkout steps if needed (06).

### 6.13 LanguageSwitcher and ThemeToggle
- **LanguageSwitcher:** shows both **ქართული** and **English** with flags (`packages/assets/flags/country-*-live.svg`, decorative) and the language names as text (flags are not languages). Web: Menu in the header/footer; each item is a link to the same page in the other language (`/…` ↔ `/en/…`, ADR-006) with `hreflang` and `lang` attributes. Native: Account → Language (RadioCard list), switches without restart.
- **ThemeToggle:** IconButton `Sun`/`Moon` with `aria-pressed` and label `t_ui_dark_mode`; settings page offers Light / Dark / System (SegmentedControl). Default light (Q-059).
- **Used by:** Header, Footer, Account settings.

---

## 7. Data display
### 7.1 Card (base)
- `bg.surface`, radius `card` (12), `border.default` 1 px, `shadow.sm`; padding 16 (mobile) / 20–24 (desktop panels). Interactive cards: the **title link** is the primary target (the whole card is clickable via a stretched link), with secondary actions (favourite) layered above; hover `shadow.md` + image scale 1.02 (web only); focus-visible ring around the card; pressed scale 0.98 (native).
- Variants: `plain`, `outlined` (no shadow), `selected` (2 px `border.brand`), `featured` (2 px `border.featured`).

### 7.2 GigCard (with Featured badge)
- **Anatomy (keep, spec 03 "Gig card"):** image 3:2 (`size.layout.cardImageRatio`, `object-fit: cover`, radius on top corners, placeholder `illustrations/image-placeholder.jpg` or `bg.subtle` + `Image` icon) with the **favourite IconButton** (`overlay`, top-right, 44 hit area); seller mini-row (Avatar `sm` 32 with online dot, username `text.bodySm` 500, verified `SealCheck` 16); title `text.title` **clamped to 2 lines by line count** (legacy fixed 43 px height); rating row (RatingStars `sm` + "4.9" + "(128)"), or `t_no_reviews_yet` in `text.caption` `text.muted` (quiet, replacing the loud amber `font-black tracking-widest` label); footer row with "დან" (starting at) `text.caption` `text.muted` **not uppercase** and the Price `price` style right-aligned.
- **Featured variant (Premium owner, Q-069, spec 03 AC-18):** 2 px `border.featured` frame (legacy highlight frame kept, now orange from the logo) **and** a **Featured Badge** ("გამორჩეული", `Crown` Fill icon + text, `badge.featured*`, top-left over the image) with a Tooltip `t_featured_badge_hint` ("This freelancer has a Premium plan.") on hover/focus/long-press. The badge is text + icon, not colour only.
- **Layouts:** grid (1/2/3/4 columns at <640 / 640 / 1024 / 1280, gap 24), carousel item in home rows (width 272 desktop, 80 % of viewport on phones with snap), list row (profile gigs, spec 02: thumbnail left 128×85, text right, "დაწყება" Button).
- **States:** default, hover (web), focus-visible, loading = `GigCardSkeleton`, favourite toggling (optimistic with rollback Toast on error), unavailable (owner inactive: not listed at all per spec 03, so no state needed).
- **A11y:** one link (title) with the accessible name = title; the card's other text is plain; favourite is a separate button; image `alt` = gig title (or empty if the title is adjacent and the image is decorative, chosen: `alt=""` because the title link follows).
- **Native:** full-width card in lists (spec 03), 2-column grid on tablets; long-press opens a quick-action sheet (Save, Share).
- **Used by:** home rows (03), search/category results (03), profile gigs (02), favourites (04), "You may also like" (04), `/sellers` not (uses FreelancerCard).

### 7.3 ProjectCard (project row)
- **Anatomy (keep, audit §3.5):** thumbnail 128 px (hidden below 400 px width to avoid the cramped layout, or moved above the text), category link `text.caption` `text.brand`, title `text.title` 2-line clamp, meta row (proposals count with `Users` icon, time ago `text.caption`), excerpt `text.bodySm` 2 lines, budget Price range ("₾700.00 – ₾1,000.00", en dash, one format), "Send a proposal" `outline` Button (`primary` on the project page).
- **States:** default, hover, focus, skeleton; closed/awarded projects show a StatusBadge and no CTA; the CTA for Standard users follows spec 11 (Premium required: `aria-disabled` Button + Premium pill + explanation link to `/subscription`).
- **Home variant:** compact card for the home "Projects" row (same Price format; legacy used "/" there).
- **Native:** full-width list item; CTA moves to the project screen's StickyActionBar.
- **Used by:** home Projects row (03), Explore projects (10), buyer dashboard projects (02/10).

### 7.4 FreelancerCard and ProfileCard
- **FreelancerCard (lists):** Avatar `lg` 64 with online dot, name + verified, username, headline/top skill, rating summary (stars + average + count, freelancer role), "Member since", optional "Premium" pill, "View profile" link (card is clickable). Used by `/sellers`, `/hire/{keyword}` (03).
- **ProfileCard (public profile left column, spec 02, keep audit §3.6):** Avatar 64 (96 on mobile), name (the page's single `h1`), username, OnlineStatus text + dot, Share IconButton (native: system share sheet), "Member since", Verifications list (email, ID: `SealCheck` + translated "ვერიფიკაცია" heading, fixing English "Verifications"), languages with level, and the **two RatingSummary blocks** (§7.8). Level badges are **removed** (Q-014). On phones the card stacks on top.
- **Share list:** the 10 × 32 px social buttons become one "Share profile" Button that opens the Share dialog/sheet (Facebook, X, LinkedIn, WhatsApp, Copy link; 44 px targets) (spec 04 share list).
- **Used by:** public profile (02), sellers/hire pages (03), gig page seller block (04, compact variant).

### 7.5 StatTile (KPI) and MoneyTile (available / HOLD)
- **StatTile:** label `text.bodySm` `text.secondary` (**wraps to 2 lines**, never truncated: "შეკვეთები მიმდინარეობს"), value `text.h2` tabular, optional delta/trend or link ("View all"), optional icon 24 in a `bg.brandSoft` circle. Card base; grid 2 columns on phones, 3 at `md`, 4 at `xl` (legacy grid kept); min height equalised per row. Skeleton state; "—" with `t_no_data_yet` for no data (spec 04 analytics).
- **MoneyTile (spec 00 money glossary, spec 05/14):** the freelancer's **Available balance** (`t_available_balance`, `Wallet` icon, value `priceLg`, primary action "Withdraw" / buyer "Top up"), **HOLD / Pending** (`t_pending_balance`, `HourglassMedium`, warning-tone Badge "HOLD", help Tooltip/InfoButton explaining "Paid by buyers for your active orders; moves to Available on completion or auto-release"), **Withdrawn** (`t_withdrawn`), and **Points** (`t_points`, separate tile, not money: shows "120 ქულა", never with ₾). Amounts through `Price` (tetri → `₾1,234.50`), negatives shown with a minus and `text.danger` (migrated negative balances, R-3.6). Buyer side shows no HOLD tile (spec 00: buyer never sees escrow).
- **A11y:** each tile is a group with the label as its name; values are text (not images); tooltips reachable by keyboard (InfoButton).
- **Used by:** Selling home (02), wallet/billing (05), withdrawals (14), points/referrals (09), gig analytics (04).

### 7.6 Badge, Pill and StatusBadge
- **Badge (count):** small pill on icons (unread messages, cart count, notifications): solid `action.danger` + `action.onDanger`, `text.badge`, min 20×20, max "99+", 2 px ring in the surface colour; inside lists and nav rows it uses the softer `badge.dangerBg` / `badge.dangerText`. The count is announced through the parent's label ("Messages, 3 unread"), the badge itself is `aria-hidden`.
- **Pill (label):** height 24, padding x 8, radius `full`, `text.badge`, optional leading icon 16. Tones: `neutral`, `brand`, `success`, `warning`, `danger`, `info` (`badge.<tone>Bg/Text`, 6.37:1 or better), plus `featured` (orange, `Crown`) and `premium` (`badge.premium*`, "პრემიუმ"), and `role` (buying/selling).
- **StatusBadge:** maps domain statuses to tones **with the status text always visible** (never colour only). Proposed mapping (engineers extend it per spec): draft/closed/expired → neutral; active/published/in progress/awarded → brand; completed/delivered-accepted/approved/verified → success; pending/pending review/HOLD/awaiting acceptance/submitted → warning; rejected/cancelled/refunded/banned/declined → danger; delivered/new/offer sent → info. Restrictions centre chips (pending, submitted, approved, rejected; spec 01) use this.
- **Fixes:** legacy `-400 on -50` pills (1.6–2.5:1), `rounded-sm` vs `rounded-3xl` mix.
- **Used by:** GigCard (Featured), gig page title (04), dashboards (02, 04 My gigs, 06, 10–14), restrictions centre (01), profile (02), plans (09).

### 7.7 Avatar and OnlineStatus
- **Avatar:** sizes 24/32/40/64/96, radius `full`, image `object-fit: cover`; fallback = initials (first letter of the username, Georgian or Latin) on `bg.brandSoft` with `text.brand` (replaces random pastel colours); broken image falls back to initials; `alt` = username when alone, empty when next to the name.
- **Online dot:** 12 px (`size.onlineDot`, scaled 8/10 for 24/32 avatars), `status.online` green or `status.offline` grey, 2 px ring in the surface colour, bottom-right. The status is also given as text ("ონლაინ" / "ბოლოს აქტიური: 2 სთ წინ") in the profile and chat header, and as the avatar's accessible description, never colour only (legacy "არ არის აქტიური" grey-only text).
- **Group:** overlapping avatars (proposals count) with "+12".
- **Used by:** GigCard, ProfileCard, chat list/header (08), comments/reviews (07), header AccountMenu, proposals (11).

### 7.8 RatingStars, RatingSummary (two blocks) and ReviewItem
- **RatingStars (display):** 5 stars, sizes 16 (cards) / 20 / 24; filled `rating.star` (`Star` Fill), empty `rating.starEmpty` (Regular), half `StarHalf`; always followed by the numeric average text ("4.8") and optionally the count "(128)". The star graphic is `aria-hidden`; the group has a text label "Rating 4.8 out of 5, 128 reviews" (`t_ui_rating_label`).
- **RatingInput (leave a review, spec 07):** 5 radio buttons styled as stars, 44 hit areas, arrow keys, labels "1 star … 5 stars", hover/focus preview, required validation.
- **RatingSummary:** big average `text.h1`, stars, count, and a 5→1 distribution (bars `action.primary` on `bg.subtle`, counts tabular); empty state `t_no_reviews_yet` quiet text.
- **Two rating blocks (Q-062, mutual reviews):** the profile shows **"როგორც ფრილანსერი"** (as a freelancer: reviews from buyers) and **"როგორც დამკვეთი"** (as a client: reviews from freelancers) as two RatingSummary blocks, side by side from `md`, stacked on phones, each with its own Reviews list/tab. Gig pages and GigCards show only the freelancer rating of that gig. The exact labels, rounding and which lists appear come from spec 07 (not written yet); the component supports both blocks now.
- **ReviewItem:** Avatar 40, reviewer name (masked per BR-015 where required), role context ("bought: {gig title}"), RatingStars, date `text.caption`, text `text.body`, optional seller reply (indented, `bg.subtle`). Report link.
- **Used by:** GigCard (03), gig page stats + Reviews tab (04), profile (02), FreelancerCard (03), review forms (07).

### 7.9 Price (GEL ₾)
- **Purpose:** the only way to show money (ADR-006 §9, architecture §8). Input from the API: integer **tetri** + `GEL`.
- **Format (one rule, both languages):** `₾` prefix, thousands separator `,`, 2 decimals: **`₾1,000.00`**. Ranges with an en dash and spaces: **`₾30.00 – ₾100.00`** (fixes three legacy range formats). Negative: `−₾12.50`. Periods: `₾9.99` + `/თვე` (`/ month`) as one accessible string. Zero: `₾0.00` (or "უფასო" only where a spec says "Free", e.g. Standard plan). Implemented with `Intl.NumberFormat` (`minimumFractionDigits: 2`) and a fixed `₾` prefix so ka and en render identically (legacy parity), tabular numerals.
- **Variants:** `inline` (inherits text style), `card` (`text.price` 18/700), `large` (`text.priceLg` 24→32, purchase box, checkout total, balances, plan price), `strikethrough` (original price before a promo code, spec 09, with hidden "was" text), `from` (prefix label "დან"/"Starting at" `text.caption`, not uppercase, replaces the 9 px uppercase label).
- **A11y:** the ₾ sign is read by screen readers as "lari" in ka and "GEL" in en via a visually-hidden currency word; ranges read "from … to …".
- **Used by:** GigCard, gig purchase box (04), ProjectCard + project summary (10), proposals (11), checkout/cart (06), MoneyTile, plans (09), withdrawals (14), admin (16).

### 7.10 Table → mobile card list (ResponsiveTable)
- **Desktop (≥ `md`):** `<table>` with `thead` (`bg.subtle`, `text.caption` 600 `text.secondary`, sticky under the top bar), rows 56 high, `border.subtle` dividers, hover `bg.hover`, money right-aligned tabular (fixes inconsistent alignment), status as StatusBadge, row actions in a `DotsThreeVertical` Menu or inline Buttons, sortable headers as buttons with `aria-sort`, optional row selection with Checkbox.
- **Below `md`:** the same data renders as a **stacked card list** (legacy only scrolled sideways): each row becomes a Card with the primary cell as title (e.g. gig title / order ID), StatusBadge top-right, 2–4 key/value lines (`DescriptionList`), the amount on the right, and actions in a ⋯ Menu (BottomSheet). Columns declare `priority` (`primary | secondary | hidden-on-mobile`) so one definition drives both layouts.
- **States:** loading (skeleton rows/cards), empty (EmptyState inside the table area), error (Banner with Retry), paged (LoadMore / Pagination in admin).
- **A11y:** real table semantics on desktop, `caption` (visually hidden if a heading is present); card list is a `ul` of `article`s with headings.
- **Native:** always the card list (FlatList).
- **Used by:** My gigs (04), orders (06), projects/proposals (10, 11), withdrawals (14), sessions (01), restrictions (01), transactions/billing (05), admin (16).

### 7.11 DescriptionList (key/value summary)
- Label `text.bodySm` `text.secondary` / value `text.body` `text.primary`, rows separated by `border.subtle`; two columns (label left, value right) on wide panels, stacked on narrow. Values can be Price, StatusBadge, date, or a locked value with a Premium pill ("Average proposal: Premium only").
- **Used by:** project summary (10: budget, proposals, average proposal, status, posted), order detail (06), checkout summary (06), KYC status (02).

### 7.12 Gallery and Carousel
- **Gallery (gig page, spec 04):** main image 3:2 with prev/next IconButtons (`overlay`, labelled "Previous image" / "Next image", 44 hit areas), counter "2 / 6", thumbnails strip below (buttons with `aria-current`, selected = 2 px `border.brand`); swipe on touch; Arrow keys when focused; click opens a full-screen Lightbox (Dialog `full`, focus trap, Esc closes, pinch-zoom on native). Placement kept: gallery left (`lg:col-span-4`), purchase box right.
- **Carousel (home rows, featured categories, related gigs):** horizontal scroll-snap list (native: horizontal FlatList) with visible prev/next buttons on desktop, **no auto-advance** (legacy slick had no pause control); items are focusable in DOM order; section title + "See more" link on every size. Reduced motion: no smooth scroll animation.
- **CategoryTile (featured categories):** admin artwork (Q-077 kept), radius `2xl`, bottom gradient `color.alpha.imageGradient*` with white title `text.h3` (≥ 4.5:1 guaranteed by the gradient), hover image scale 1.02.
- **Used by:** gig page (04), home (03), portfolio viewer (02), "You may also like" (04).

### 7.13 Accordion
- Disclosure rows: header button 48+ high (`text.title`), `CaretDown` rotating (no rotation with reduced motion), panel `text.body`; single or multiple open; `aria-expanded`/`aria-controls`.
- **Used by:** gig FAQ (04), footer on mobile, category menu in the drawer (03), help centre (17), subscription feature comparison on phones (09).

### 7.14 Countdown / TimeLeft
- Shows time remaining for timers the API owns (auto-release 72 h, award acceptance 48 h, refund auto-reject 2 days, 2FA resend, login lockout): "დარჩა 2 დღე 5 სთ" `text.bodySm` with `Clock`; `warning` tone under 24 h. Updates once a minute (seconds only under 1 minute), `aria-live="off"` (screen readers read it on focus, not every tick). The deadline timestamp comes from the API (UTC); the component never computes business deadlines itself.
- **Used by:** 2FA/lockout (01), order detail (06), award acceptance (11), refunds (13).

### 7.15 Tooltip and InfoButton
- **Tooltip:** short text on hover (after 300 ms) and focus, `bg.inverse` + `text.inverse`, `text.bodySm`, radius `sm`, max width 280, Esc dismisses, never contains interactive content, never the only place for essential information.
- **InfoButton:** a 44-hit `Info` IconButton that toggles a Popover with the explanation (works on touch; tooltips do not). Native: opens a small BottomSheet.
- **Used by:** Featured badge hint (03), HOLD explanation (MoneyTile), disabled "Send a proposal" (11), card surcharge note (05).

---

## 8. Feedback and overlays
### 8.1 Dialog (Modal) and ConfirmDialog
- **Purpose:** one modal system for web (replaces Flowbite, bladewind, wire-elements-modal, WireUI dialog).
- **Sizes:** `sm` 440 (confirmations), `md` 560 (report, share, availability, appeal), `lg` 800 (proposal form, SEO dialog), `full` (lightbox, mobile forms).
- **Anatomy:** header (title `text.h3`, optional description, close IconButton labelled `t_ui_close`), scrollable body, footer with actions right-aligned (primary last) on desktop, full-width stacked on phones. Radius `dialog` (16), `bg.surfaceRaised`, `shadow.lg`, scrim `bg.scrim`. Max height `calc(100dvh - 48px)` (legacy `100vh - 15rem` left ~50 % of a phone screen).
- **Behaviour:** opens with fade + 8 px rise (`motion.duration.slow`, fade only with reduced motion); **focus trap**; initial focus on the first field (forms) or the least-destructive button (confirmations); Esc and the close button close (scrim click closes only non-form dialogs, to avoid losing typed text; forms with changes ask "Discard changes?"); focus returns to the trigger; body scroll locked; background `inert`.
- **A11y:** `role="dialog"` (or `alertdialog` for ConfirmDialog) + `aria-modal="true"` + `aria-labelledby` (title) + `aria-describedby` (description). Legacy modals had none of these.
- **Responsive rule:** below `md` (phones) a Dialog **presents as a BottomSheet** (§8.2) automatically, except `sm` confirmations, which stay centred dialogs.
- **ConfirmDialog:** preset with title, message, Cancel (`secondary`) and a confirm Button (`primary` or `danger`); replaces SweetAlert (`livewire-alert`) confirmations.
- **Used by:** share + report (04), report user (02), availability (02), appeal (01), proposal form (11, with step 2 "paid upgrades" removed), SEO dialog (04), delete account (02), cancel order (06).

### 8.2 BottomSheet (mobile)
- **Purpose:** the phone presentation of Dialogs, Menus, Selects, filters and sort (spec 02/03/04 "bottom sheet"), on native and mobile web.
- **Variants:** `auto` height (menus, sort, short forms), `half` (50 %, expandable), `full` (full-screen forms: proposal, filters with a sticky "Show results" bar, appeal).
- **Anatomy:** top radius `dialog`, grab handle 36×4 (`border.strong`) that is also a button ("Close sheet" for screen readers), title row with close IconButton, scrollable content, optional sticky footer (StickyActionBar) above the safe area and the keyboard.
- **Behaviour:** slide up `motion.duration.slow` `easing.emphasized`; swipe down to close (disabled when the form has changes → confirm); scrim tap closes non-form sheets; Android back closes; focus trap and return like Dialog; keyboard-aware (content scrolls, footer rises above the keyboard).
- **Implementation note:** native via a maintained sheet library or React Native `Modal` + Reanimated; the choice is the mobile-engineer's in Phase 3, the look and behaviour here are fixed.
- **Used by:** filters/sort (03), Select (native), Menu (mobile), report/share (04 on web mobile; native uses the system share sheet), availability (02), appeal (01), proposal (11).

### 8.3 Toast
- **Purpose:** short, transient confirmation or failure after an action ("Saved", "Link copied", "Added to favourites", "Couldn't save. Try again."). Replaces WireUI notifications, toastr and SweetAlert toasts.
- **Variants:** `success`, `error`, `warning`, `info` (icon + `feedback.*` tokens on `bg.surfaceRaised` with a 4 px left accent in the tone colour; text `text.primary`), optional action ("Undo", "Retry", "View cart"), close IconButton.
- **Position (one rule):** desktop **top-centre** under the header (legacy WireUI place); phones and native **bottom**, above the TabBar/StickyActionBar and the safe area. Width ≤ 400. Stack max 3, newest on top.
- **Timing:** success/info 5 s, warning 7 s, error stays until dismissed if it has an action; pauses on hover/focus; never auto-dismisses a toast containing a focusable action before 10 s (WCAG 2.2.1).
- **A11y:** container `role="region" aria-label="Notifications"`; success/info announced via `aria-live="polite"` (`role="status"`), errors via `role="alert"`; the toast does not steal focus; actions reachable by keyboard (F6/landmark) and also available elsewhere.
- **Native:** same component on top of the navigation, announced with `AccessibilityInfo.announceForAccessibility`.
- **Used by:** every spec (profile saves 02, favourites 04, copy link 04, reports 02/04, 2FA toggle 01).

### 8.4 Banner / Alert (inline)
- **Purpose:** persistent messages inside the page: "Beware of scams" on project pages, email-change pending (02 P-18), gig pending review (04, owner view), gig unavailable notice (04), language notice on the wizard (04 "content shown in Georgian"), `t_content_shown_in_georgian` fallback (ADR-006), plan limit (04 AC-2), feature disabled (00), maintenance, form ErrorSummary (§5.1), invite-and-earn promo on home.
- **Variants:** `info`, `success`, `warning`, `danger` (`feedback.*Bg/Border/Text/Icon`), `promo` (`bg.promo` + `text.onPromo`, `accent` Button; the home "Invite and earn points" banner, replacing sky blue, Q-078), `neutral`.
- **Anatomy:** icon 20, title (`text.title`, optional), message `text.bodySm`/`body`, optional actions (Buttons/Links), optional dismiss (only for non-critical ones; dismissal remembered). Radius `card`, 1 px border, padding 12–16. Full-width `page` variant (top of page, no radius) for site-wide notices.
- **A11y:** static banners are plain content (with a heading if they have a title); banners that appear after an action use `role="status"` or `role="alert"` (errors). Never colour only: icon + text.
- **Used by:** listed above (specs 00, 01, 02, 03, 04; 10 scam warning).

### 8.5 EmptyState
- **Purpose:** no data yet, no results, feature disabled, error pages (404).
- **Anatomy:** illustration or icon 48 (`text.muted`, or brand illustrations: `no-results.svg` recoloured to tokens; the Freepik `lock.svg` is **replaced** by our own simple Phosphor-based art, Q-079), title `text.h3`, message `text.body` `text.secondary`, primary action (e.g. "Create a gig", "Reset filters", "Browse gigs"), optional secondary link. Centred, max width 480, padding 48/24.
- **Variants:** `noResults` (search, with "Reset filter" and suggestions, spec 03 AC-21), `noData` (dashboards: "No orders yet", spec 02 AC-7; portfolio "No work yet"), `disabled` (`t_feature_disabled` + link home, spec 00), `error` (with Retry and the request ID from `X-Request-Id`, architecture §7), `notFound` (404 pages), `offline` (native, cached data notice).
- **A11y:** heading level fits the page; illustrations `alt=""`.
- **Used by:** every list screen; specs 00, 02, 03, 04.

### 8.6 Skeleton
- **Purpose:** loading placeholders that match the final layout (no layout jump).
- **Primitives:** `SkeletonText` (lines at the text style's line height, last line 60 %), `SkeletonBox` (image 3:2, avatar circle, button), and composed skeletons: `GigCardSkeleton`, `ProjectCardSkeleton`, `StatTileSkeleton`, `TableRowSkeleton`, `ProfileSkeleton`, `ChatListSkeleton`.
- **Visual:** `bg.skeleton` with a `bg.skeletonHighlight` shimmer (`motion.duration.shimmer` 1200 ms); **static** with reduced motion. Radius matches the real element.
- **A11y:** the loading region has `aria-busy="true"` and one visually hidden "Loading…" status; skeleton shapes are `aria-hidden`.
- **Used by:** every list and dashboard (specs 02, 03, 04: "loading skeleton").

### 8.7 StickyActionBar (Sticky CTA bar)
- **Purpose:** keep the main action reachable on phones (audit §3.4, §3.12, §4.11).
- **Placements:** gig page (**price "დან ₾250.00" + "Add to cart"**, spec 04), checkout (total + "Confirm"), filters sheet ("Show results (124)"), proposal form ("Continue"/"Send"), gig wizard (Back / Next / Publish), project page ("Send a proposal").
- **Visual:** fixed bottom, `bg.surface`, top `border.default` + `shadow.md` (upward), padding 12/16 + bottom safe-area inset, min height 72; left: context (Price `large`/summary text, 2 lines max), right: `lg` primary Button (full-width when there is no context). Appears only below `lg` on web (desktop keeps the purchase box in place); on the gig page it appears once the in-page purchase box scrolls out of view (IntersectionObserver), to avoid two identical buttons on screen.
- **Behaviour:** hides when the on-screen keyboard is open (except in forms where it holds the submit, then it rises above the keyboard); page content gets bottom padding equal to the bar height so nothing is covered.
- **A11y:** a `region` landmark labelled (e.g. "Purchase"); in DOM order after the main content but reachable; buttons keep their normal labels.
- **Used by:** gig page (04), wizard (04), search filters (03), checkout (06), project page + proposal (10, 11).

---

## 9. Chat (spec 08; audit §3.11)
### 9.1 ConversationList and ConversationItem
- **Keep:** two panes on desktop (list left, conversation right, collapsible info pane), list width 320 (`size.layout.chatListWidth`), search at the top, Favourites and conversations.
- **Item:** Avatar 40 with online dot, name `text.title` (1 line, ellipsis allowed for names only, full name in the accessible label), last message preview `text.bodySm` `text.secondary` 1 line, time `text.caption`, unread count Badge, context chip (order/project) when the thread belongs to one. Selected = `bg.selected`; unread = name 600 + dot.
- **Mobile:** one pane at a time below `md` (list → conversation push), no fixed 280/45 % split; native: Messages tab list → conversation screen.
- **A11y:** list of links/buttons; each item's label reads name, unread count, last message, time.

### 9.2 ChatBubble and SystemMessage
- **Bubble:** max width 75 % (85 % on phones), padding 8/12, radius `xl` (16) with the tail corner 4 (sent: bottom-right; received: bottom-left) keeping the legacy shapes; sent `chat.sentBg` + `chat.sentText` (6.45:1; legacy white on `#35A29F` was 3.08:1), received `chat.receivedBg` + `chat.receivedText`; text `text.body`, links underlined in the bubble's text colour; time + delivery state (sent / read, `Check`/`Checks` icons with text alternatives) `text.caption` inside the bubble bottom-right. Consecutive messages from the same sender group with 4 px gaps; date separators ("დღეს", "გუშინ", dates) centred `text.caption`.
- **Attachments:** image thumbnails (radius `lg`, tap → Lightbox), file chips (`FileText` + name + size + download), upload progress in-bubble.
- **SystemMessage:** order/project events inside a thread (order placed, delivered, revision requested, refund opened) as a centred pill/card `chat.systemBg` + `chat.systemText` with an icon and a link to the order.
- **Future-ready:** a "translated" affordance (vision: AI chat translation later) fits as a caption link "Show original" under the bubble text; no design change needed.
- **A11y:** the message list is `role="log"` with `aria-live="polite"` for new incoming messages (legacy had no live region); each message has sender + time in its accessible text.

### 9.3 Composer
- Textarea auto-growing 1–6 lines (16 px text), attach IconButton (`Paperclip`, label `t_ui_attach_file`), optional emoji IconButton, Send IconButton (`primary`, `PaperPlaneRight`, label `t_ui_send`, disabled when empty); Enter inserts a new line and Ctrl/Cmd+Enter or the Send button sends on desktop; on mobile the return key inserts a new line and the Send button sends (spec 08 AC-11; corrected in P2-C4, 2026-09-29); attachments preview row above the input with remove buttons; offline/"sending" state with retry per message.
- **Mobile:** pinned above the keyboard and the safe area; the conversation uses `100dvh` layout (legacy `100vh` hid the input under the browser toolbar).
- **Used by:** Inbox (08), order/project/refund threads (06, 11, 13), admin read-only view (16, composer hidden, banner "Read-only staff view").

---

## 10. Layout helpers
- **Container:** max width `containerMax` 1280 (`containerWide` 1400 for home rows, `prose` 720 for CMS), gutters 16/24/32 (one rule; legacy footer `lg:px-20`, auth `lg:px-36` removed).
- **Stack / Inline / Grid:** spacing only from `space.*` tokens; Grid presets for the gig grid (1/2/3/4) and KPI grid (2/3/4).
- **PageHeader:** Breadcrumb + `h1` + optional description + actions (e.g. "Create a new gig" Button); on phones actions move to a Menu or the StickyActionBar.
- **SectionHeader:** `h2` + "See more" Link (visible on all sizes, audit §3.2), optional description; used by every home row and dashboard block.
- **AuthLayout:** centred `max-w` 440 panel on `bg.canvas` (keep audit §3.8: logo, title + subtitle, fields, Remember me, full-width primary `lg` submit, "or" Divider, social Buttons (`secondary` with brand logo, full width), links, legal text, "Back to home" `Link` (not the one-off blue)).
- **Hero:** `bg.hero` teal, `display` h1 in `text.onHero`, hero SearchBar, invite promo Banner, and the Gigs/Projects shortcut tiles, which stay **visible on phones as a compact 2-button row** (legacy hid them below `md`); min-height 360 mobile / 520 desktop instead of a fixed 600.

---

## 11. Index (58 components)
| # | Component | Group | Web | Native | Main specs |
|---|---|---|---|---|---|
| 1 | Icon | Foundations | yes | yes | all |
| 2 | Logo | Foundations | yes | yes | all, 15 (email) |
| 3 | Text / Heading | Foundations | yes | yes | all |
| 4 | Divider | Foundations | yes | yes | 01 |
| 5 | Spinner | Foundations | yes | yes | all |
| 6 | ProgressBar | Foundations | yes | yes | 02, 04 |
| 7 | VisuallyHidden | Foundations | yes | (a11y props) | all |
| 8 | Button | Actions | yes | yes | all |
| 9 | IconButton | Actions | yes | yes | all |
| 10 | Link | Actions | yes | yes | all |
| 11 | Field (Label, HelpText, ErrorText, Counter, ErrorSummary) | Forms | yes | yes | 01–04 |
| 12 | Input / PasswordInput | Forms | yes | yes | 01–04 |
| 13 | PriceInput | Forms | yes | yes | 04, 05, 11, 14 |
| 14 | QuantityInput | Forms | reserved | reserved | none at launch (P-46) |
| 15 | Textarea | Forms | yes | yes | 01, 02, 04, 11 |
| 16 | RichTextEditor | Forms | yes | simplified | 04, 10, 17 |
| 17 | Select / Combobox / MultiSelect | Forms | yes | sheet | 02, 03, 04 |
| 18 | Checkbox / CheckboxCard | Forms | yes | yes | 01, 03, 04 |
| 19 | Radio / RadioCard | Forms | yes | yes | 02, 03, 05, 06, 09 |
| 20 | Switch | Forms | yes | yes | 01, 02, 15 |
| 21 | CodeInput | Forms | yes | yes | 01, 16 |
| 22 | DatePicker | Forms | yes | yes | 02 |
| 23 | SearchBar | Forms | yes | yes | 03, 08, 10 |
| 24 | FileUpload / MediaGallery editor | Forms | yes | yes | 01, 02, 04, 06, 08 |
| 25 | Chip | Forms | yes | yes | 02, 03, 10 |
| 26 | Header (+ AccountMenu, CategoryBar) | Navigation | yes | stack header | all public |
| 27 | Footer | Navigation | yes | – | all public |
| 28 | MegaMenu / CategoryMenu | Navigation | yes | list screens | 03 |
| 29 | NavDrawer | Navigation | yes | – | 03, 06, dashboards |
| 30 | Breadcrumb | Navigation | yes | back link | 03, 04, 10, 17 |
| 31 | Tabs | Navigation | yes | yes | 02, 04, 06, 08 |
| 32 | SegmentedControl | Navigation | yes | yes | 09, settings |
| 33 | RoleSwitcher (Buying/Selling) | Navigation | yes | yes | 02 |
| 34 | DashboardShell + SidebarNav | Navigation | yes | Account list | 02, 04, 06, 10–14 |
| 35 | TabBar | Navigation | – | yes | app root |
| 36 | Menu / Dropdown | Navigation | yes | sheet | 03, 04, 06 |
| 37 | LoadMore / InfiniteList / Pagination | Navigation | yes | yes | 03, 08, 10, 16 |
| 38 | Stepper | Navigation | yes | yes | 02, 04, 10 |
| 39 | LanguageSwitcher | Navigation | yes | yes | all |
| 40 | ThemeToggle | Navigation | yes | yes | all |
| 41 | Card (base) | Data display | yes | yes | all |
| 42 | GigCard (+ Featured) | Data display | yes | yes | 02, 03, 04 |
| 43 | ProjectCard | Data display | yes | yes | 03, 10 |
| 44 | FreelancerCard / ProfileCard | Data display | yes | yes | 02, 03, 04 |
| 45 | StatTile | Data display | yes | yes | 02, 04 |
| 46 | MoneyTile | Data display | yes | yes | 02, 05, 09, 14 |
| 47 | Badge / Pill / StatusBadge | Data display | yes | yes | 01–04, 06, 10–14 |
| 48 | Avatar + OnlineStatus | Data display | yes | yes | 02–04, 07, 08 |
| 49 | RatingStars / RatingInput / RatingSummary / ReviewItem | Data display | yes | yes | 02, 03, 04, 07 |
| 50 | Price | Data display | yes | yes | 04–06, 09–11, 14 |
| 51 | ResponsiveTable (table → card list) + DescriptionList | Data display | yes | card list | 01, 04–06, 10–14, 16 |
| 52 | Gallery / Carousel / CategoryTile / Lightbox | Data display | yes | yes | 02, 03, 04 |
| 53 | Accordion | Data display | yes | yes | 03, 04, 09, 17 |
| 54 | Countdown | Data display | yes | yes | 01, 06, 11, 13 |
| 55 | Tooltip / InfoButton / Popover | Feedback | yes | sheet | 03, 05, 11 |
| 56 | Dialog / ConfirmDialog / BottomSheet | Feedback | yes | yes | 01, 02, 04, 06, 11 |
| 57 | Toast / Banner / EmptyState / Skeleton | Feedback | yes | yes | all |
| 58 | StickyActionBar; Chat (ConversationItem, ChatBubble, SystemMessage, Composer); layout helpers (Container, PageHeader, SectionHeader, AuthLayout, Hero) | Feedback / Chat / Layout | yes | yes | 01, 03, 04, 06, 08, 10, 11 |

(Composite rows count once; the full export list in `packages/ui` will be about 75 named exports.)

---

## 12. New UI strings needed (for the product-analyst's text tables)
Built-in component texts, English first + Georgian (Q-058). Keys proposed with a `t_ui_` prefix; the product-analyst confirms naming and adds them to `packages/i18n`:
| Key | en | ka |
|---|---|---|
| `t_ui_close` | Close | დახურვა |
| `t_ui_loading` | Loading… | იტვირთება… |
| `t_ui_skip_to_content` | Skip to content | მთავარ შინაარსზე გადასვლა |
| `t_ui_show_password` | Show password | პაროლის ჩვენება |
| `t_ui_hide_password` | Hide password | პაროლის დამალვა |
| `t_ui_required` | required | სავალდებულო |
| `t_ui_optional` | optional | არასავალდებულო |
| `t_ui_clear_search` | Clear search | ძიების გასუფთავება |
| `t_ui_opens_in_new_tab` | opens in a new tab | იხსნება ახალ ჩანართში |
| `t_ui_rating_label` | Rating {{rating}} out of 5, {{count}} reviews | შეფასება {{rating}} 5-დან, {{count}} შეფასება |
| `t_ui_verification_code` | Verification code | დამადასტურებელი კოდი |
| `t_ui_attach_file` | Attach file | ფაილის მიმაგრება |
| `t_ui_send` | Send | გაგზავნა |
| `t_ui_previous_image` / `t_ui_next_image` | Previous image / Next image | წინა სურათი / შემდეგი სურათი |
| `t_ui_dark_mode` | Dark mode | მუქი რეჟიმი |
| `t_ui_load_more` | Show more | მეტის ჩვენება |
| `t_ui_retry` | Try again | ხელახლა ცდა |
| `t_ui_discard_changes` | Discard changes? | გავაუქმოთ ცვლილებები? |
| `t_ui_as_freelancer` / `t_ui_as_client` | As a freelancer / As a client | როგორც ფრილანსერი / როგორც დამკვეთი |
| `t_ui_sending` | Sending… | იგზავნება… |
| `t_ui_message_not_sent` | Not sent. Try again. | არ გაიგზავნა. სცადეთ ხელახლა. |
| `t_ui_send_shortcut_hint` | Press Ctrl+Enter to send | გასაგზავნად დააჭირეთ Ctrl+Enter-ს |
| `t_ui_staff_read_only_view` | Read-only staff view | პერსონალის ხედი, მხოლოდ წასაკითხად |
| `t_ui_client_name_hidden` | Client name hidden | დამკვეთის სახელი დამალულია |
| `t_ui_form_progress` | Form progress | ფორმის შევსების პროგრესი |
| `t_ui_purchase` | Purchase | შეძენა |
(Rows `t_ui_sending` … `t_ui_purchase` added in P2-C4, 2026-09-29, for the key screen layouts.)

Georgian values are designer drafts for the Owner's review.
