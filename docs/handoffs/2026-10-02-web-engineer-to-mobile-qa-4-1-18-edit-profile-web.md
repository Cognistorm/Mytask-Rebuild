# 4.1.18 Web: edit profile + availability modal

From: web-engineer · To: mobile-engineer (4.1.23), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27),
web-engineer (4.1.19+) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Spec 02 AC-15…AC-23 (P-23: the legacy edit screen that has no route on the live site) on the web, after the legacy
`Account/Profile/ProfileComponent.php` + `account/profile/profile.blade.php` (blocks, texts and messages kept),
design `components.md` §5.8 Radio, §5.11 DatePicker, §8.1 Dialog, and the screens table ("per-block saving,
inline errors, success message").

- **`/account/profile`** (private layout, inside the dashboard shell on the Selling side, no nav item active).
  Reads `getMyProfile` once; every block saves on its own and shows its own success message or error (AC-15):
  - **Left card:** avatar with **Change** (upload protocol → `putMyAvatar`) and **Remove** (`deleteMyAvatar`,
    initials shown); JPG/JPEG/PNG/WEBP ≤ 2 MB checked before any upload (`t_selected_file_extension_is_not_allowed`,
    `t_validator_max_file_size_2mb`), "Uploading / Processing" status, a rejected or unusable upload is deleted
    again (AC-16). Username + verified mark (KYC verified), full name, **headline** edited in place
    (`updateMyProfile`, AC-17), "Unavailable" pill while availability is set, member since, country.
  - Under the card: the legacy "Update profile" note with links to Account settings (`/account` until 4.1.20),
    Change password, Get verified (`/account/verification`, 4.1.20) and View profile.
  - **Main column:** Availability, About me (AC-18, line breaks kept), Linked accounts (only when
    `linkedAccountsEnabled`, S-123; all seven saved together, an empty field is sent as `null`, AC-21), Skills
    (AC-19) and Languages (AC-20): one form adds or updates the entry being edited, list newest first with
    Edit / Delete per entry, duplicates show the API's 409 text. The language name field suggests the legacy
    picker list (`legacy/APP/config/languages.php`, 137 names via `<datalist>`), free text stays allowed
    (contract: name ≤ 100).
- **Availability modal** (AC-22, AC-23): native date input starting tomorrow in Asia/Tbilisi + message ≤ 750;
  the API's `t_pls_select_availability_date_in_future` shows under the date inside the modal. While set, the block
  shows the pill, `t_u_wont_be_able_to_receive_orders_until_date` with the date, the message, **Change** (modal
  with the current values, `putMyAvailability` replaces) and **Remove** (`deleteMyAvailability`).
- **Entry points:** "Edit profile" in the dashboard account menu (AC-15 "web account menu") and on the `/account`
  placeholder; the public profile's "Edit profile" already pointed here (4.1.17).
- **Shared pieces:** `@mytask/ui/web` `RadioGroup` (fieldset + legend, native radios); `Field` gained `min`,
  `maxLength`, `placeholder`, `list`, `hint`; `TextArea` gained `placeholder`. Level / linked-account label maps
  moved to `components/profile/levels.ts` (public profile uses the same file). `platformToday()` / `addDays()` in
  `lib/format.ts`.

## Files created/changed
- `apps/web/src/app/[locale]/(private)/account/profile/layout.tsx`, `page.tsx` (new)
- `apps/web/src/components/profile-edit/edit-profile.tsx`, `card.tsx`, `availability.tsx`, `entries.tsx`,
  `block.tsx`, `languages-list.ts`, `edit.css` (new); `components/profile/levels.ts` (new)
- `apps/web/src/app/[locale]/(public)/profile/[username]/page.tsx` (imports the shared maps),
  `app/[locale]/(private)/account/page.tsx` and `components/dashboard/shell.tsx` (Edit profile link),
  `lib/format.ts`
- `packages/ui/src/web/form.tsx`, `form.css`, `index.ts`
- `packages/i18n/en.json`, `ka.json`: `t_u_wont_be_able_to_receive_orders_until_date` lost its legacy `<span>`
  markup (ADR-006 §3: no HTML in strings; same words). **No new keys.**
- `apps/web/e2e/edit-profile.spec.ts` (new, 8 tests)

Checks: web E2E 73 passed / 3 skipped (full-stack ones), repo typecheck + lint 10/10, Prettier clean, i18n check,
`next build` OK.

## What the next agent must do
- **Mobile 4.1.23:** same ops, keys and rules: avatar purpose rule is fixed (jpg/jpeg/png/webp, 2 MB; camera or
  library), headline/About me/linked accounts send trimmed values, availability date picker from tomorrow
  (Asia/Tbilisi) in a bottom sheet, Change prefills, Remove deletes; skills `experience` / languages `level` field
  names for errors; success keys `t_skill_updated`, `t_skill_has_been_deleted_from_profile`, `t_language_updated`,
  `t_language_has_been_deleted_from_profile` (legacy).
- **Web 4.1.20:** point "Account settings" and "Get verified" links (edit-profile card, `AccountLinks`) at
  `/account/settings` and the verification centre once they exist.
- **QA:** `e2e/edit-profile.spec.ts` covers AC-15…AC-23 on routed data. Full stack with `pnpm local`: sign in,
  account menu → Edit profile, upload a real JPG avatar, set availability and check the public profile notice.
- **Security 4.1.27:** avatar upload reuses the shared upload protocol (owner-only file, purpose `avatar`, API
  re-checks type/size/scan); linked-account URLs are user input shown on the public profile (rendered there with
  `nofollow ugc noopener noreferrer`, 4.1.17).

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Layout deviation (for QA/Owner):** legacy put every block in a narrow left column (4/12) and only the
  "Update profile" note in the wide right column. Here the blocks sit in the wide column and the note + links
  under the card, the same left-card/main-column layout as the public profile. Order of the blocks is kept.
- **Legacy "Change" on availability removed the notice.** Here "Change" edits it and "Remove" ends it (AC-23
  "remove early").
- **Legacy language values:** the legacy picker stored a language **code** (`en`, `ka`) as the name; the new
  contract stores a free name. The data migration (Phase 5) should map codes to names with the same list.
- `t_enter_vimeo_profile` says "Enter your Facebook profile" (legacy text bug, en + ka), so the link fields use the
  label only, without the legacy "Enter your … profile" placeholders. For the Owner's text pass.
- The section heading uses `t_about_me` (spec, public profile) instead of the legacy `t_description`.
- The test image of `e2e/profile.spec.ts` (`PNG` constant) is not a valid PNG; it passes there only because the
  server-rendered `<img>` errors before hydration. The new spec uses a valid one.
