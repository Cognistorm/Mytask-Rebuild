# 4.1.23a Mobile: public profile + report user

From: mobile-engineer · To: mobile-engineer (4.1.23b/4.1.24), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

4.1.23 was split on 2026-10-03: **a** = public profile + report user (this), **b** = edit profile + availability.

## What I did
Built spec 02 AC-8…AC-14, AC-18 (folding), AC-28/AC-42 (owner's preview marks) and EC-10 in the app. I followed the screens table ("Profile screen: card stacks on top, native share sheet"; "Report user: bottom sheet"), design §7.4/§7.6/§7.7/§7.8/§5.14/§8.1, and the web 4.1.17 + 4.1.20c (same data, order, keys and rules).

- **Screen** `src/app/profile/[username].tsx`, outside the tab layout, so guests can open it too. The API answers as the visitor (optional user):
  - **Card:** avatar (image, or the first letter; online dot), the name as the only header, verified mark, `@username`, online/offline as text, headline.
    - Actions: "Share profile" opens the native share sheet with `{APP_URL}/profile/{username}`. "Report user" is not shown on the own profile (AC-13).
    - Facts: local time from the API's IANA zone (refreshed every minute, `—` for an unknown zone), last delivery, member since.
    - Lists: verifications (ID, email), languages with level, and linked accounts when the API sends them (S-123; "Visit profile" opens the browser).
  - **Main:**
    - availability notice with the date (`d.m.Y`) and message;
    - "As a freelancer" / "As a client" rating blocks (average in tenths → one decimal, partly filled stars, count, 5→1 bars, or `t_no_reviews_yet`);
    - About me folded to 6 lines with More/Less (the toggle shows only when the text is cut);
    - the owner's empty gigs block (EC-10);
    - portfolio preview of 6 in 2 columns (the owner also sees Pending / Rejected pills, and `t_no_portfolio_yet` when empty);
    - skill chips (level in the accessible name).
  - **States:**
    - loading skeleton;
    - 404 (pending, banned, deleted, unknown user, AC-9): `t_user_not_found` + "Go back";
    - error: notice + "Try again".
  - **Expired session:** a stored session that reads as a guest gets one `getMe` (the client refreshes the token), then the profile is read again. This is the app version of the web `SessionRefresh`.
- **Report user** `src/components/report-user.tsx` (AC-14), in a bottom sheet:
  - the reason is trimmed, required (`t_validator_required`, no request sent) and at most 1,500 characters;
  - `createUserReport` → `t_profile_has_been_successfully_reported`. The first report (201) and a replacing one (200) show the same message;
  - API errors (e.g. the 429 limit) show in the sheet, and the text stays;
  - guests, or a 401: `t_u_must_login_to_report_this_profile` + Login.
- **Shared pieces** `src/components/profile.tsx`: `Avatar`, `OnlineStatus`, `VerifiedMark`, `RatingStars`, `RatingSummary`, `ExpandableText`, `Chip`, `Pill`, `PortfolioCard`, `LocalTime`, `BottomSheet` (scrim, ✕ and system back close it; `accessibilityViewIsModal`), `OutlineButton`. The 4.1.23b availability sheet and 4.1.24 reuse them.
- **Entry point:** "View profile" (`t_view_profile`) on the Account tab opens your own profile. Other users' profiles will open from search, gig and chat screens in later slices.

## Files created/changed
- New:
  - `apps/mobile/src/app/profile/[username].tsx`
  - `apps/mobile/src/components/profile.tsx`, `report-user.tsx`
  - `apps/mobile/src/lib/profile.ts`: level and linked-account maps as the web `levels.ts`, `PREVIEW_SIZE`, `isGuestView`
- Changed:
  - `apps/mobile/src/lib/format.ts`: `formatDateOnly`, `formatClock`
  - `lib/web-pages.ts`: `profileUrl`
  - `components/form.tsx`: `Input` takes a `placeholder`
  - `src/app/(tabs)/account.tsx`: "View profile"
  - `docs/SETUP-LOCAL.md` §4: new step 11 (how to open another profile in Expo Go: `exp://<LAN IP>:8081/--/profile/<username>`)
- No new i18n key. All 66 keys used exist in en and ka.

## Checks
- Mobile typecheck + lint: OK. Repo typecheck 10/10, lint 10/10.
- Prettier: clean. i18n check: OK.
- `expo export` iOS + Android: OK.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 11.

## What the next agent must do
- **4.1.23b:**
  - add "Edit profile" (`t_edit_profile` → `/account/profile`) to the own profile's actions (where "Report user" is hidden) and to the Account tab;
  - build the availability bottom sheet with `BottomSheet`.
- **4.1.24:**
  - make `PortfolioCard` tappable → item viewer;
  - add "View my portfolio" when the preview has more (the web shows it on `nextCursor`; the screen does not keep the cursor yet);
  - give the owner's empty portfolio its "Create" action;
  - add Portfolio to the Selling nav (`lib/dashboard.ts` `screen`).
- **QA:** on a phone, compare with the web `/profile/{username}`: signed in / out / own, 404, report (empty, sent, second, guest), share, folding, local time.
- **Security 4.1.27:** linked-account URLs open via `Linking.openURL` straight from the API. The API accepts only http/https (4.1.9), so no other scheme can reach the phone. The report reason is plain text.

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Hidden until their screen exists** (as 4.1.22, no dead ends):
  - "Contact me" (AC-11): chat comes in slice 08;
  - skill chips are not tappable (`/hire/{slug}`): slice 03;
  - "Create a new gig" in the owner's gigs block: slice 03;
  - "Request an offer": slice 11.
  - If the Owner prefers, "Contact me" could send guests to login now.
- **Deviation (same as the web):** the report success shows inside the sheet (no toast component yet). The screens table says "success toast".
- **Deep links:** `https://…/profile/{username}` does not open the app yet; the Android intent filters cover only auth paths. Adding profile links means App Links/Universal Links for public pages, which is Phase 6 with the store identifiers.
- The legacy ka value of `t_user_not_found` starts with a Mtavruli capital ("Მომხმარებელი"). Left for the Owner's text pass.
- The star/seal icons and the bottom sheet have not been seen on a device yet. Check them in Expo Go (step 11).
