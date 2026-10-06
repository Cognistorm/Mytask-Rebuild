# 4.1.24a Mobile: public portfolio grid + item viewer

From: mobile-engineer · To: mobile-engineer (4.1.24b), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

4.1.24 was split on 2026-10-03:
- **a** = public portfolio grid + item viewer (this task);
- **b** = Selling → Portfolio owner list + create/edit;
- **c** = Account → Settings;
- **d** = Verification centre.

## What I did
Built spec 02 AC-28 and AC-42 (owner view) in the app. I followed the screens table ("Portfolio grid → item viewer (swipe gallery)"; empty "No work yet"). The data, order and keys match the web 4.1.17.

- **Routes** mirror the web URLs (useful for later deep links):
  - the profile moved from `profile/[username].tsx` to `profile/[username]/index.tsx` (imports one level deeper, no behaviour change);
  - new `profile/[username]/portfolio/index.tsx` and `profile/[username]/portfolio/[slug].tsx`.
  - All three sit outside the tab gate, so guests can open them.
- **Profile preview:** a work is now tappable and opens the item viewer (`accessibilityRole="link"`; the label includes Pending / Rejected). "View my portfolio" (`t_view_my_porfolio`, legacy key) shows when the preview has more than 6 works (the API's `nextCursor`), as on the web.
- **Portfolio screen** (`listPortfolioItems` + `getUserProfile`):
  - owner box (avatar, username, verified mark, headline, "View profile");
  - title `t_username_portfolio`;
  - 2-column grid newest first, with "Load more" in pages of 24 (duplicates skipped, error notice on failure);
  - empty state `t_no_portfolio_yet`; 404 → `t_user_not_found`;
  - re-reads on focus. The owner sees their pending/rejected works, marked. An expired session gets one `getMe` refresh, as the profile screen does.
- **Item viewer** (`lookupPortfolioItem`):
  - owner note on top: Pending + `t_portfolio_pending_review`, or Rejected + `t_portfolio_rejected_reason` with the reason;
  - swipe gallery: the thumbnail first, then the gallery images, one per page, with "n / total" under it. Each image is labelled "title (n/total)", as the web alt text;
  - title, then "Watch video" / "Live preview" (they open the browser) and "Share this project" (public works only; the native share sheet with `{APP_URL}/profile/{username}/portfolio/{slug}`, always the current slug);
  - description, owner box.
  - 404/400 and a username that is not the owner's (EC-4) → `t_page_not_fount` (legacy key) + "Go back". For a stored session, a 404 triggers one `getMe` refresh and a second read, because an owner whose token expired reads as a guest.
  - An old slug (the uid is its suffix) opens the item. The app has no address bar, so there is no redirect.
- **Shared pieces** `components/portfolio.tsx`: `PortfolioGrid`, `openPortfolioItem`, `StatusNote`, `OwnerBox`, `Gallery`. `PortfolioCard` in `components/profile.tsx` now takes `onPress`; its pressed state uses the `action.ghostPressed` token. 4.1.24b reuses `StatusNote` for the note above the form.

## Files created/changed
- New:
  - `apps/mobile/src/app/profile/[username]/portfolio/index.tsx`
  - `apps/mobile/src/app/profile/[username]/portfolio/[slug].tsx`
  - `apps/mobile/src/components/portfolio.tsx`
- Moved: `apps/mobile/src/app/profile/[username].tsx` → `profile/[username]/index.tsx` (preview uses `PortfolioGrid`, "View my portfolio")
- Changed:
  - `components/profile.tsx`: `PortfolioCard` is pressable;
  - `lib/profile.ts`: `PortfolioItem`, `UserSummary`, `PORTFOLIO_PAGE_SIZE`, `sameUser`;
  - `lib/web-pages.ts`: `portfolioItemUrl`;
  - `docs/SETUP-LOCAL.md` §4: new step 13.
- No new i18n key. All keys used exist in en and ka.

## Checks
- Mobile typecheck + lint: OK.
- Prettier: clean. i18n check: OK.
- `expo export` iOS + Android: OK.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 13.

## What the next agent must do
- **4.1.24b:**
  - Selling → Portfolio owner list + create/edit (camera/library, S-089/S-090, `StatusNote` above the form);
  - add Portfolio to the Selling nav (`lib/dashboard.ts` `screen`);
  - give the owner's empty preview its "Create" action (`t_create_project`, as the web);
  - after a save, the item viewer and grid re-read on focus already.
- **QA:** on a phone, compare with the web `/profile/{u}/portfolio` and `/…/{slug}`:
  - as owner, as another user and as a guest;
  - pending / rejected / public works;
  - more than 6 works (View my portfolio), more than 24 (Load more);
  - an unknown slug, another user's path, an old slug.
- **Security 4.1.27:** video and project links open via `Linking.openURL` straight from the API. The API accepts only http/https URLs for them (AC-24), so no other scheme can reach the phone.

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Deviation:** the web shows the thumbnail above a vertical gallery list. The app puts both in one swipe pager, as the screens table asks ("swipe gallery").
- "Contact me" in the owner box stays hidden until chat (slice 08), as on the profile.
- The gallery has no full-screen zoom. Add it later if QA asks.
- Not seen on a device yet. Check the swipe paging and the counter in Expo Go (step 13).
