# Handoff: mobile engineer → mobile QA, 4.3.15 gig create/edit wizard (app)

ROADMAP 4.3.15 was split on 2026-10-07 into 4.3.15a–d. This file grows with each step.

## What I did

### 4.3.15a: entry, frame, step 1 Overview and step 2 Pricing (2026-10-07)
- **Route `/create`** (`app/create.tsx`, also `mytask://create`), the same URL as the web wizard:
  - no stored session, or 401 → login;
  - `ACCOUNT_RESTRICTED` → `/restricted` (spec 01 AC-19);
  - `canCreate` false → EmptyState `t_plan_gig_limit_reached` with the limit and "Upgrade to Premium". The button opens the website's `/subscription?gigs=true` until the app has a subscription screen. The form is not shown (AC-2).
  - `getGigCreationEligibility` and `listCategories` are requested together. A failure shows an error with Try again.
- **Form model `lib/gig-form.ts`**: a copy of the web `components/gig-wizard/gig-form.ts`, with the same field names (`title.ka`, `upgrades[i].price`, …), rules, message keys and request builders. The one difference is the descriptions, which are held as marked-up text.
- **Descriptions (`lib/gig-markup.ts`)**: components.md §5.5 "Native" says a plain multiline field with Markdown-like lists.
  - Marks: `- ` / `• ` / `* ` = bulleted item, `1. ` / `1) ` = numbered item, a blank line = new paragraph, a line break = `<br>`, `**bold**`, `*italic*` (an asterisk inside a word such as `2*3` stays literal), `***bold italic***`.
  - `markupToHtml` builds the same `user_text` HTML the web editor sends. Text is escaped, and bold and italic tags never cross.
  - `htmlToMarkup` turns stored HTML back into marks, for the edit in 4.3.15d. Nothing on the allow-list is lost.
  - `htmlPlainText` gives the plain text for the length and language checks.
  - The round trip was checked with an ad-hoc esbuild script: Georgian text, lists, escaping, nesting, empty input, stored web HTML with `&nbsp;`, `<b>`, `<p>` inside `<li>`, a dropped `<script>` and an unwrapped `<h2>`.
- **Controls `components/gig-wizard/fields.tsx`**:
  - `TextField`: label, hint or counter, error announced politely, `accessibilityLanguage`.
  - `PriceField`: ₾ prefix, decimal keypad, 2 decimals when the field is left (as the web `PriceInput`).
  - `SelectField`: opens a BottomSheet of radio rows; long lists scroll at 60 % of the screen height.
  - `QuantityField`: − / + buttons or typed digits, kept within min…max.
  - `CompactStepper`: "Step n of 5" as a progressbar.
- **Wizard `components/gig-wizard/gig-wizard.tsx`** (screen 03 "native app"):
  - Header ✕ + "Create a new gig".
  - "Discard changes?" sheet (Keep editing / Discard) once anything was entered, on ✕, the iOS swipe back or the Android back on step 1 (`beforeRemove`). On a later step, the Android back goes to the previous step.
  - "Step n of 5" with a bar, and a sticky Back / Next bar that rises above the keyboard.
  - **Step 1 Overview**: English-optional notice (`t_english_fields_optional_notice_v2`), titles ka/en (≤ 100, counter), Category / Subcategory / Child category sheets (a lower level is disabled until the level above is chosen; changing a level resets the levels below and announces `t_ui_lower_category_levels_cleared`), and the descriptions ka/en with the format hint.
  - **Step 2 Pricing**: price, delivery time sheet (legacy list incl. "None"), revisions 0…S-041 with the hint.
  - "Next" shows the errors of the current step only, scrolls to the first one and reads its message out. Changing step scrolls to the top and announces "Step n of 5". Errors show once a field is left or after "Next".
  - Steps 3–5 show only their headings, and "Create" is disabled, until 4.3.15b/c.
- **i18n**: 1 NEW key (en + ka), `t_ui_description_format_hint`.

### 4.3.15b: step 3 Extras and step 4 Gallery (2026-10-07)
- **Steps stay mounted.** Each step is a View that is hidden (`display: none`) when it is not the current one, as the web's hidden blocks. Text and running uploads survive Back / Next. "Next" scrolls to the first error using the step's own top plus the field's position. A row's fields share the row card's position.
- **Step 3 Extras.**
  - Upgrades: cards "Upgrade #n" with Upgrade title (≤ 100), Price (₾, decimal keypad), Delivery time sheet with the placeholder "And an additional", and "Remove upgrade" (its screen-reader label names the row). "+ Add service upgrade" is disabled at 10, with `t_upgrades_limit_reached`.
  - FAQ: subtitle, then cards "Question #n" with Question (≤ 100), Answer (≤ 300, counter) and Remove. "+ Add FAQ" is disabled at 10, with `t_faq_limit_reached`.
  - Removing a row moves the shown errors up with the rows (`shiftRowFields`, as the web). The same pre-check as the web runs: title and price required, price as AC-8, extra days required, question and answer required.
- **Step 4 Gallery**, new `components/gig-wizard/gig-files.tsx` (`GigFiles`, the web `gig-files.tsx` rules):
  - Thumbnail: one file; a new pick replaces it.
  - Images: 1…S-077, from "Take a photo" or "Choose from gallery". Multi-select is limited to the room left, and iOS hands over a JPEG instead of HEIC. 3:2 previews, with "Move left" / "Move right" named with the file (AC-23 order = display order).
  - Documents: PDF from the files app, only while S-080 is ON; hidden until the public config loads (EC-8).
  - Per file: Waiting → Uploading n % with a bar → Processing → ready, or its message. A wrong type or size is refused before any request; storage, API or scan refusals show after. Try again appears when the file can still pass, and Remove deletes the unattached file.
  - At most 3 uploads at once. "n of m uploaded" is shown. `initial` (stored files, for 4.3.15d) is only dropped from the list, never deleted.
- The route now passes the API client and the public config to the wizard. No new keys.

### 4.3.15c: step 5 Review & publish and the submit (2026-10-07)
- **Review**: a card listing Overview, Pricing, Upgrades (optional), FAQ (optional) and Gallery. Each shows its status in text (Not started / In progress / Completed / Has errors) and an "Edit" button (named with the block) that goes back to its step.
- **SEO** (optional), inline on this step as on the web phone mode:
  - title ≤ 100 and description ≤ 150, each with a counter;
  - `t_seo_both_fields_required` under the description when the field is left with only one filled (AC-15);
  - the legacy "Search engine Gig preview" once both are filled.
- **Create** (`createGig`, AC-19):
  - It shows every error and jumps to the first step with one. The scroll waits a few frames for the newly shown step's layout, and the top notice plus the first message are read out.
  - While an upload is still running, it shows `t_pls_wait_until_uploading_finish`.
  - While sending, the form is read-only, Back is disabled and the button reads "Please wait..." (busy).
- **Refusals**:
  - Server `details.fields` land on the same fields (kept until the value changes; the pre-check wins) and jump to the first step with an error.
  - FILE_* naming no list shows a notice at the top of the Gallery step.
  - PLAN_LIMIT_REACHED shows a danger notice with the limit and "Upgrade to Premium" (website) at the top (AC-3).
  - ACCOUNT_RESTRICTED goes to `/restricted`.
  - Anything else shows its message.
- **Success** (AC-16) replaces the wizard:
  - active: `t_gig_created_subtitle` + "View gig", which replaces the wizard with the gig screen;
  - pending: `t_gig_created_subtitle_pending_approval` + "My gigs", which opens the website (`myGigsUrl`) until 4.3.16.
  - "Discard changes?" no longer asks.
- No new keys.

### 4.3.15d: edit mode (2026-10-07)
- **Route `/seller/gigs/[uid]/edit`** (`app/seller/gigs/[uid]/edit.tsx`):
  - No session, or 401 → login.
  - `getMe` runs first. It refreshes an expired token, so the owner's pending or rejected gig is not read as a guest. A restricted account goes to `/restricted`.
  - Then `lookupGig` + `listCategories`. Not the owner, 404 or 400 → "Page not found" + "My gigs" (website until 4.3.16).
  - Then `getGigOwnerView`. A failure shows an error with Try again.
  - No eligibility check: the plan limit never blocks an edit (AC-25).
- **`GigWizard` with `gig`**:
  - `draftFromGig` fills every field: the stored HTML turns into the app's marks (`htmlToMarkup`), and upgrades keep their `id`.
  - Title "Edit gig". A rejected gig shows a danger notice "Has been rejected for the following reason: …" (AC-18).
  - Stored revisions above S-041 are refused on save by the pre-check (AC-10). A migrated gig with null revisions may stay empty and is left out of the PATCH (Q-183).
  - The gallery lists start with the stored files: thumbnail, "Images n", documents by name. Remove only drops a file from the list; Move works (AC-23).
  - "Review & save" / "Save changes" → `updateGig` (`toUpdateRequest`, documents only while S-080 ON). Server errors behave as on create.
- **Success** "Service updated", with the updated texts for active / pending. "View gig" goes back to the gig screen (which reloads on focus), or opens it.
- **Gig screen**: "Edit gig" now opens this screen; `gigEditUrl` was removed.
- No new keys.

## Files created/changed
- `apps/mobile/src/app/seller/gigs/[uid]/edit.tsx` (new, 4.3.15d); `apps/mobile/src/components/gig-page.tsx` (Edit gig, 4.3.15d)
- `apps/mobile/src/components/gig-wizard/gig-files.tsx` (new, 4.3.15b)
- `apps/mobile/src/app/create.tsx` (new)
- `apps/mobile/src/components/gig-wizard/fields.tsx` (new)
- `apps/mobile/src/components/gig-wizard/gig-wizard.tsx` (new)
- `apps/mobile/src/lib/gig-form.ts` (new)
- `apps/mobile/src/lib/gig-markup.ts` (new)
- `apps/mobile/src/lib/web-pages.ts` (`subscriptionUrl`)
- `packages/i18n/en.json`, `packages/i18n/ka.json` (1 key)
- `docs/ROADMAP.md` (split + tick), `docs/STATUS.md`

## Checks
4.3.15d: mobile typecheck, lint and prettier are green; `expo export` bundled iOS (1720 modules) and Android (1759 modules); not run on a device.

4.3.15c: 4.3.15c: mobile typecheck, lint and prettier are green; `expo export` bundled iOS (1702 modules) and Android (1809 modules); not run on a device.

4.3.15b: 4.3.15b: mobile typecheck, lint and prettier are green; `expo export` bundled iOS (1710 modules) and Android (1809 modules); not run on a device.

4.3.15a: Mobile typecheck, lint and prettier are green. The i18n check is OK. `expo export` bundled iOS (1718 modules) and Android (1808 modules). **Not run on a device or simulator.**

## What the next agent must do
- **No app entry point to `/create` yet.** "Create a new gig" belongs to My gigs (4.3.16). Until then, open `mytask://create` to test.
- Mobile QA, on a device: edit a gig made on the website with bold / lists / FAQ / upgrades / documents and save without changes (the description HTML must come back the same); edit a rejected gig (reason shown, saved → pending or active); move and remove stored images; the "Page not found" for someone else's uid. Also: a full create against the local stack with S-070 ON and OFF (both success screens); a server field error landing on its step (e.g. a category switched off in admin while the wizard is open); the plan-limit notice (create the last allowed gig on the website meanwhile). Also: upload progress and Try again with the network off; a 4th file waiting while 3 upload; the camera permission prompt; a PDF from iCloud / Google Drive (copied to cache first); images keep their order after Move left / right; text and uploads kept after Back / Next. Also: the category sheets with the real tree; the decimal keypad (some Android keyboards type `,`, which the price accepts); Discard on the iOS swipe back and the Android back; TalkBack / VoiceOver reading of the step change, the reset announcement and the first error.

## Open questions / risks
- A web description with a literal `*` around a word (e.g. `*note*` typed as text) becomes italic if it is saved again from the app. This is rare, and the stored text is otherwise unchanged.
- Product analyst: components.md §5.5 marked the native formatting as an "open point". The app now offers lists, bold and italic, which is the whole `user_text` allow-list. Please confirm, or narrow it.
