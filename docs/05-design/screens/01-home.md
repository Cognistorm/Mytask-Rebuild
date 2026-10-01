# 01 — Home
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 03 AC-5 (visible categories), AC-18 (Featured badge), AC-24…26 (home rows, best sellers); 17 AC-35…37 (hero, featured categories, logo cloud, recent articles, announcement, footer); 09 (invite banner → referrals); 00 AC-11 (feature disabled). Audit §3.1, §3.2. Preview: `docs/05-design/preview/index.html` → "Home, old vs new".

## Kept from the live site
- Header row 1: hamburger (below lg), logo, pill search with the category menu inside, theme toggle, cart, "გამოწერა" (Subscription), "აღმოაჩინე" (Explore) menu (Gigs / Projects / Support centre), Login + Register. Row 2: the 7 top categories.
- Header is transparent over the teal hero and turns white with a bottom border on scroll.
- Hero: h1 "იპოვე საუკეთესო ფრილანსერი", search field + "ძებნა" button, "Invite and earn points" banner, two round shortcut tiles Gigs / Projects.
- Section order: Featured categories carousel → Projects row → Top gigs row → one row per category, each with "See more" → optional blocks → footer (4 columns).

## Changes (all from approved specs or the audit)
- Shortcut tiles stay visible on phones as a compact 2-button row (audit §3.2, legacy hid them).
- "See more" visible on every size (03 AC-25).
- Invite banner uses the `promo` Banner (teal family) instead of sky blue `#2EBFF6` (Q-078).
- Gig cards show a quiet `t_no_reviews_yet` instead of the loud amber "შეფასების გარეშე ( 0 )".
- Hero height: min 520 desktop / 360 phone instead of a fixed 600.
- Premium gigs: orange frame + "Featured" badge (03 AC-18).

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Announcement bar (S-112, only when set)                          [✕ close]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Logo]  ( ▾Categories | Search gigs…            🔍 )  ◐  🛒  Subscription    │  header 72,
│                                                   Explore▾  Login [Register] │  transparent
│ Design · Video & Animation · Digital Marketing · Programming · Business · …  │  category bar 48
├──────────────────────────────────── HERO (bg.hero teal) ─────────────────────┤
│                                                                              │
│   იპოვე საუკეთესო ფრილანსერი                       ┌──────┐   ┌──────┐     │
│   ┌──────────────────────────────────────┬───────┐  │ Gigs │   │Proj- │     │
│   │ Search label (visible to SR)  …       │ ძებნა │  │  ◯   │   │ects ◯│     │
│   └──────────────────────────────────────┴───────┘  └──────┘   └──────┘     │
│   ┌ promo Banner: Invite and earn points  [Invite friends] ┐                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ Featured categories                                               ‹  ›       │  SectionHeader
│ ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐       │  CategoryTile ×7
│ │ image  ││        ││        ││        ││        ││        ││        │       │  (gradient +
│ │ Title  ││        ││        ││        ││        ││        ││        │       │   white title)
│ └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Projects                                                       See more →    │
│ ┌ProjectCard (home)┐┌──────────────────┐┌──────────────────┐┌─────────────┐  │  carousel, 4 visible
│ │category · title  ││                  ││                  ││             │  │
│ │₾700.00 – ₾1,000.00│ …                                                    │  │
│ └──────────────────┘└──────────────────┘└──────────────────┘└─────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Top gigs                                                       See more →    │
│ ┌GigCard──────┐┌GigCard──────┐┌GigCard──────┐┌GigCard──────┐                 │  4 cards, grid
│ │[★Featured] ♡││             ││             ││             │                 │  gap 24
│ │ image 3:2   ││             ││             ││             │                 │
│ │ ◉ user ✓    ││             ││             ││             │                 │
│ │ Title 2 lines│             ││             ││             │                 │
│ │ ★ 4.8 (12)  ││             ││             ││             │                 │
│ │ Starting at ₾250.00│       ││             ││             │                 │
│ └─────────────┘└─────────────┘└─────────────┘└─────────────┘                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ <Category name>  (one row per visible category, random order)  See more →    │
│ 4 × GigCard …                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Best sellers (S-108)  │ Logo cloud (S-109) │ Recent articles (S-119)          │  optional blocks,
│ FreelancerCard × ≤12  │ logos with links   │ 3 article cards                  │  only when ON/filled
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer: Company | Legal | Links | Support centre · logo · © MyTask · f · lang │
└──────────────────────────────────────────────────────────────────────────────┘
```
Container: hero content 1280, home rows `containerWide` 1400. Section spacing `space.12` (48) between rows.

The optional blocks (best sellers, logo cloud, recent articles) appear in the order of the legacy home template. The web-engineer checks that order against `legacy/.../home.blade.php` in Slice 16 (17 AC-35). Each block is hidden when its setting is OFF or it has no content.

## Mobile web (360)
```
┌──────────────────────────────────┐
│ ☰  [Logo]            🔍  🛒(2)   │  header 56; 🔍 opens full-screen search
├────────── HERO (min 360) ────────┤
│ იპოვე საუკეთესო ფრილანსერი       │  text.display scaled (h1)
│ ┌──────────────────────────────┐ │
│ │ Search gigs…                 │ │  SearchBar hero, full width
│ └──────────────────────────────┘ │
│ [        ძებნა (lg)           ]  │
│ [ Gigs ]          [ Projects ]   │  compact 2-button row (kept on phones)
│ ┌ Invite and earn points     → ┐ │  promo Banner
├──────────────────────────────────┤
│ Featured categories   See more → │
│ ┌──────────┐┌───                 │  carousel: 80 % width + snap, next item peeks
│ └──────────┘└───                 │
│ Projects              See more → │
│ ┌ProjectCard (compact)──┐┌──       │
│ Top gigs              See more → │
│ ┌GigCard 80 %────────┐┌──         │
│ … category rows …                │
│ Footer: 4 Accordions (one open)  │
└──────────────────────────────────┘
```
The slide-over menu (NavDrawer left) holds Join/Login, Gigs, Projects, categories Accordion with search, Subscription, language, theme. "Become a freelancer" is removed (Q-013).

## Native app
- Tab 1 "მთავარი" (Home). Native stack header: logo left, Bell (count badge) and Cart right. No web header, no category bar, no footer (footer links live in Account → Help & legal, 17 AC-37).
- Same section order as the web. The hero is a compact teal block (search field that opens the Explore search screen, the 2-button Gigs/Projects row, invite banner). Rows are horizontal FlatLists with "See more".
- The announcement (S-112) shows as a dismissible Banner at the top of Home. Closing it hides it for 3 days on that device (17 AC-36).
- Pull to refresh.

## Components
| Region | Component | Notes |
|---|---|---|
| Header, category bar, drawer | Header, MegaMenu, NavDrawer, SearchBar `header`/`compact`, LanguageSwitcher, ThemeToggle, Menu (Explore, Account) | MegaMenu opens on click/Enter, not hover only |
| Announcement | Banner `page` (info) | S-112; dismiss remembered 3 days |
| Hero | Hero layout helper, SearchBar `hero`, Button `lg`, Banner `promo` | invite → `/account/referrals` when logged in, login when guest |
| Featured categories | Carousel + CategoryTile | admin artwork (Q-077) |
| Projects row | Carousel + ProjectCard `home` | Price range with en dash |
| Gig rows | SectionHeader + GigCard (+ Featured variant) | favourite IconButton 44 |
| Best sellers | FreelancerCard | S-108 |
| Logo cloud, articles | Card, Link | S-109, S-119 |
| Footer | Footer (+ Accordion on phones) | |

## States
| State | What shows |
|---|---|
| Loading | Hero renders at once (server-rendered); each row shows its Skeleton (`GigCardSkeleton` ×4, `ProjectCardSkeleton` ×4) |
| Row empty | The whole row (title included) is hidden (03 screens table) |
| Row error | Row hidden, error logged; the page never shows a broken row |
| Guest | Login + Register in the header; invite banner links to login |
| Logged in | Bell, messages, cart, avatar AccountMenu replace Login/Register; the dashboard entry sits in the AccountMenu (screen 07) |
| Projects OFF (S-075) | Projects row, Projects shortcut and Explore → Projects hidden (10 AC-1) |
| Announcement closed | Bar hidden for 3 days on that browser |
| Dark mode | `bg.hero` dark variant. The wordmark sits on the light plate (Q-106) |
| English (`/en/`) | Same layout. Category names and gig titles fall back to Georgian where English is missing |

## Accessibility
- Skip link first. One h1 (hero). Each row is a `section` with an h2.
- Carousels: no auto-advance, prev/next buttons labelled, items reachable by Tab in DOM order.
- The hero search has a label (visually hidden) and `role="search"`.
- Category tile titles are guaranteed ≥ 4.5:1 by the gradient token.

## Georgian length
- Category names in the second header row wrap to a "More ▾" menu when they don't fit; they are never truncated.
- Card titles clamp at 2 lines.
- SectionHeader titles wrap; "See more" stays on the right.
