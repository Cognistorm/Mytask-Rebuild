# 4.3.10c Web: gig wizard submit, success screens, "Discard changes?"
From: web-engineer · To: web-engineer (4.3.10d), qa-engineer + security-reviewer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

## What I did
The **Create** button on `/create` now saves the gig with `createGig`. This covers spec 04 AC-3, AC-16 and AC-19 for server errors.

**Sending (`toCreateRequest` in `gig-form.ts`)**
- Create sends only after the pre-check finds nothing and no upload is running.
- What is sent:
  - **titles:** trimmed; an empty English title is sent as `null`;
  - **descriptions:** the editor's HTML; an empty English description is sent as `null`;
  - **prices:** in tetri, as `{amount, currency: 'GEL'}`, for the gig and each upgrade;
  - **numbers:** `deliveryDays`, `revisionsAllowed` and each upgrade's `extraDays`;
  - **FAQ:** the rows, trimmed;
  - **files:** `thumbnailFileId`, then `imageFileIds` in display order. `documentFileIds` is sent only while the documents list is shown (S-080 ON);
  - **SEO:** `{title, description}` when both are filled, otherwise `null`.
- While the request runs, the main column is `inert` and `aria-busy`. The button is disabled and reads "Please wait...".

**Answers**
- **201:** the success screen (AC-16, the legacy centred card). The heading `t_gig_created` gets the focus.
  - `status: active` (S-070 ON): `t_gig_created_subtitle` and "View gig" → `/service/{slug}`. That page is built in 4.3.11.
  - `status: pending` (S-070 OFF): `t_gig_created_subtitle_pending_approval` and "My gigs" → `/seller/gigs`. That page is built in 4.3.12.
- **400 `details.fields`:** each error goes on the field with the same name (`fieldValue` maps API names to draft values; `price.amount` → `price`).
  - Each server error remembers the value it was given for. It disappears as soon as that field changes.
  - The pre-check wins when both have an error on the same field.
  - The summary Alert shows, and the first invalid field gets the focus (AC-19).
- **422 `FILE_*`:** these errors name no list, so the message shows at the top of the Gallery block. It gets the focus, and the Gallery step shows "has errors".
- **422 `PLAN_LIMIT_REACHED`** (AC-3): a danger Alert at the top with `t_plan_gig_limit_reached {limit}` and an "Upgrade to Premium" link. The Alert gets the focus; nothing was saved, and the form stays editable.
- **403 `ACCOUNT_RESTRICTED`:** goes to `/restricted`.
- **Anything else** (or no answer): the API's message, or `t_toast_something_went_wrong`, in the same Alert.

**"Discard changes?"** (screen 03)
- Applies once the draft differs from the empty form, until the gig is created.
- A click on a link to another page of the same site is stopped, and a `Dialog` asks first, with "Keep editing" or "Discard".
  - Links on the same page (the summary steps) never ask.
  - Links that open a new tab, downloads and modified clicks are not stopped.
- Closing the tab or reloading gets the browser's own question (`beforeunload`).
- "Discard" goes to the link with a full page load.

**3 new keys (en + ka):** `t_ui_discard_changes_text`, `t_ui_keep_editing`, `t_ui_discard`. "Discard changes?" uses the existing `t_ui_discard_changes`.

## Files created/changed
- `apps/web/src/components/gig-wizard/gig-form.ts`: `toCreateRequest`, `fieldValue`, `formFieldName`; `gallery` added to the gallery block's fields.
- `apps/web/src/components/gig-wizard/gig-wizard.tsx`: submit, server errors, failure Alert, `GigCreated`, the leave guard.
- `apps/web/src/components/gig-wizard/gig-wizard.css`: success card.
- `packages/i18n/en.json`, `ka.json`: +3 keys.
- `apps/web/e2e/gig-wizard.spec.ts`: `fillValidGig`, `fakeCreate` and 5 new tests:
  - the body sent and the success screen with S-070 ON;
  - S-070 OFF, with axe;
  - server field errors and the file error;
  - the plan limit Alert;
  - "Discard changes?", with axe.
- `docs/ROADMAP.md`, `docs/STATUS.md`

**Checks:**
- web typecheck, lint and prettier are green; the i18n checker is OK.
- `gig-wizard.spec.ts`: 17/17.
- Full web e2e (chromium): 165 passed, 3 skipped.
- **Not yet run against the real API.** All of this was tested against routed fakes that follow the contract. Run one create through `pnpm local` before the 4.3.18 review.

## What the next agent must do
**4.3.10d (edit mode):**
- Reuse `GigForm` with a mode prop: the title "Edit gig", the button "Save changes" and `updateGig`.
- Load the draft from `getGigOwnerView`. `RichTextEditor` `value` = the stored HTML.
- `GigFiles` needs an `initial` prop for the stored thumbnail, images and documents (see the 4.3.10b handoff).
- The server-error mapping (`fieldValue`) and the leave guard work unchanged. In edit mode, `dirty` must compare against the loaded draft, not `EMPTY_DRAFT`.
- After saving: the legacy edit behaviour (spec 04 AC-21…AC-25).

## Open questions / risks
- **Security (4.3.18):**
  - The descriptions are sent as editor HTML. The API sanitises them with `user_text` (CONVENTIONS §19). The client never renders server HTML here except through `RichTextEditor`, which rebuilds it in an inert document.
  - The leave guard only reads link hrefs; it never changes them.
- `/service/{slug}` and `/seller/gigs` give 404 until 4.3.11 and 4.3.12 are built.
- "Please wait..." on the button is the legacy `t_please_wait_dots`.
