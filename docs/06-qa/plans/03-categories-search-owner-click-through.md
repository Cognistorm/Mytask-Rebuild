# Slice 2 (spec 03 Categories and search): Owner click-through, ROADMAP 4.2.20

About 30 minutes. Restart the platform first so it runs the new code (`pnpm local`, SETUP-LOCAL §3).
Web: http://localhost:3100 · Admin: http://localhost:3200 · App: Expo Go (SETUP-LOCAL §4).

Gigs can only be created from slice 3 on, so the gig lists on your computer are **empty** for now. You will see
the empty states ("გთხოვთ სცადეთ ხელახლა") and the empty home rows are hidden. The lists with gig cards were
tested with sample data in the browser tests.

Tick each line. Anything that looks wrong: write one line under "Notes" at the bottom (what, where, what you expected).

## Admin (http://localhost:3200): the catalogue
- [ ] Top bar: **სარჩევი** (Categories), **პროექტის კატეგორიები** (Project categories), **უნარები** (Skills).
- [ ] **Categories**: the tree shows the live site's categories, indented by level, with counts.
- [ ] "შექმენი კატეგორია": create a test category with a Georgian and an English name, a slug (e.g. `test-owner`), an "SEO text above the list" and an icon + image (JPG/PNG). Save: "ოპერაცია წარმატებით შესრულდა".
- [ ] On that row, "ქვეკატეგორიის დამატება": add a sub-category (no icon/image fields at this level), then a child under it. A child has no "add" button (3 levels only).
- [ ] Edit the test category and change its slug: the row lists the old slug ("ძველი slug-ები").
- [ ] **Project categories**: create one linked to your test category ("დაკავშირებული მიმართულება" lists only top-level categories).
- [ ] **Skills**: add a skill in that project category; filter the list by the project category and search by name.
- [ ] Try to delete the test category: refused, "ეს ელემენტი ჯერ კიდევ გამოიყენება და ვერ წაიშლება." (it has a sub-category and a project category).

## Web: header, menus and the new pages
- [ ] Home `/`: the teal hero "იპოვე საუკეთესო ფრილანსერი" with the search and the "განცხადებები" / "პროექტები" buttons; the footer with the logo, © and the language switch.
- [ ] Header: logo, the search with "სარჩევი", the moon/sun theme button, "აღმოაჩინე" (Explore), Login + "შეუერთდი" (Join).
- [ ] Second row: the categories. Click one with sub-categories: the panel shows sub- and child categories and "დაათვალიერე …". Esc closes it. Narrow the window: the last categories move into "მეტი ▾".
- [ ] Your test category from the admin is there at once (no waiting). Its page shows the title, the breadcrumb, your SEO text above the list, the filters on the left and the sort menu.
- [ ] Filters: pick "4+ ვარსკვლავი", type a min price 50 and a max price 10, "გაფილტვრა": refused with the message, the page stays. Fix the prices: the address bar shows `min_price=…`; "ფილტრის გასუფთავება" clears all.
- [ ] Search from the header for a word: `/search?q=…` with "ძიების შედეგი …".
- [ ] `/sellers`, `/hire/<a skill of a real user>` (e.g. from a profile's skill chips), `/explore/projects` (chips of the project categories; "Latest projects" empty until slice 9).
- [ ] `/en/...` versions show English texts; a Georgian-only category shows the note "This content is not available in English yet…".
- [ ] Old links: `/?locale=en` jumps to `/en`; `/?theme=dark` turns the site dark.
- [ ] Phone-width window (or your phone's browser): ☰ opens the menu with the category list and its search box; 🔍 opens a full-width search; filters open full-screen with "შედეგების ჩვენება".
- [ ] Signed in: the header shows your photo/username with Dashboard, View profile, Account settings, Logout.

## App (Expo Go, SETUP-LOCAL §4 steps 17–18)
- [ ] After login the app opens **Home** ("მთავარი"); the Explore tab, Filter and Sort sheets work; "მიმართულებები" opens the category tree with its search; a category opens its page.
- [ ] Your profile's skill chip opens "Hire the best … experts".
- [ ] **Decision Q-167**: should guests (not signed in) be able to browse Home/Explore in the app like on the website? (recommended: yes)

## Decisions for you
- [ ] Header over the home hero: keep it white (as now), or make it transparent over the teal hero (needs the white logo)?
- [ ] `/hire/<unknown>` sends visitors to the search with a temporary redirect 307 instead of the old 302 (same effect for visitors): OK?

## Clean up
- [ ] Delete the test skill, project category, child, sub-category and category in the admin (bottom-up).

## Decision
- [ ] **Slice 2 approved** (ROADMAP 4.2.20 ticked; next: 4.3 Gigs), or
- [ ] **Not yet**: the notes below become fixes.

Notes:
-
