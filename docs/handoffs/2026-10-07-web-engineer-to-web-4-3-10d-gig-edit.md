# 4.3.10d Web: gig edit mode
From: web-engineer · To: web-engineer (4.3.10e), qa-engineer + security-reviewer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

## What I did
I added **`/seller/gigs/{uid}/edit`** (spec 04 AC-10, AC-18, AC-21…AC-25). It is the same page as `/create`, as screen 03 says: site header and footer, private zone, `noindex`.

**Loading (`GigEditor` in `gig-wizard.tsx`)**
- First `lookupGig?uid=`. The owner also gets pending and rejected gigs from it.
- If `viewer.isOwner` is true, then `getGigOwnerView(id)`, which has both languages, the file ids and the rejection reason.
- These all show "Page not found" (`t_page_not_fount`) with a "My gigs" link:
  - a 404 or 400 from either call;
  - an active gig of someone else, where the lookup succeeds but `isOwner` is false.
- 401 → login with `?next=` back here. `ACCOUNT_RESTRICTED` → `/restricted`.
- There is no plan-limit check, because the limit never blocks an edit (AC-25).

**The form (`GigForm` with `gig`)**
- `draftFromGig` fills every field:
  - prices as "250.00";
  - an empty English title or description stays empty;
  - upgrades keep their `id` (contract `GigUpgradeInput.id`);
  - FAQ, SEO, and the gallery ids in order.
- Stored descriptions go through the new `@mytask/ui/web` `richTextFromHtml`, which uses the same cleaning as the editor. So the loaded HTML and its plain text match what the editor would report, and the pre-check works before any typing.
- Changes to the page:
  - the heading is "Edit gig" (`t_edit_gig`);
  - the button is "Save changes" (NEW `t_save_changes`);
  - a **rejected** gig shows a danger Alert at the top: `t_has_been_rejected_for_this_reason`: reason (AC-18).
- **AC-10:** a stored number of revisions above today's S-041 is shown as it is. On Save it gets the range error and the focus, and nothing is sent.
- **Migrated gigs with no stored revisions** (data model: `revisions_allowed` is null only for legacy rows): the field may stay empty. `revisionsAllowed` is then left out of the PATCH, and the API keeps fields that are not sent. A value, once typed, is checked as usual. **I did not make "required" apply here**, because that would be a new rule.
- **Gallery (AC-23):** `GigFiles` takes `initial` (stored files).
  - Stored files start as ready, with their CDN thumb as the preview. Their names are "Thumbnail", "Images n", or the PDF's file name.
  - They can be moved and removed. Removing a stored file **only takes it off the list**; it is never deleted, because the gig keeps it until the save.
  - New files upload as on `/create`. Replacing the thumbnail works the same way.
- **Save** sends `updateGig` with every field (`toUpdateRequest`). The lists replace the stored ones in order. `documentFileIds` is sent only while S-080 is ON; otherwise the stored documents stay as they are (EC-8).
- Server errors, file errors and the busy state work as on create.
- **After saving,** the legacy card (`EditComponent.php:442`) shows `t_gig_updated` with:
  - the active text and "View gig" (S-070 ON), or
  - the "reviewing" text and "My gigs" (S-070 OFF → pending, AC-22).
- **"Discard changes?"** compares against the form as it opened. An unchanged edit form lets links work without asking.

## Files created/changed
- `apps/web/src/app/[locale]/(private)/seller/gigs/[uid]/edit/page.tsx` (new)
- `apps/web/src/components/gig-wizard/gig-wizard.tsx` (`GigEditor`, edit mode in `GigForm`, `storedFilesOf`, updated success card)
- `apps/web/src/components/gig-wizard/gig-form.ts` (`draftFromGig`, `toUpdateRequest`, `UpgradeDraft.id`, `validateDraft` option `revisionsOptional`)
- `apps/web/src/components/gig-wizard/gig-files.tsx` (`initial` / `StoredFile`)
- `packages/ui/src/web/inputs.tsx`, `index.ts` (`richTextFromHtml`)
- `packages/i18n/en.json`, `ka.json` (`t_save_changes`)
- `apps/web/e2e/gig-wizard.spec.ts`: `fakeEdit` and 4 tests:
  - filled form, gallery changes, PATCH body, pending card;
  - rejected reason, AC-10, active card, axe;
  - migrated revisions left empty, an unchanged form leaves without asking;
  - someone else's and unknown gigs.
- `docs/ROADMAP.md`, `docs/STATUS.md`

**Checks:**
- web typecheck, lint and prettier are green; ui typecheck and lint are green; the i18n checker is OK.
- `gig-wizard.spec.ts`: 21/21.
- Full web e2e (chromium): 168 passed, 3 skipped, 1 flake. The flake was `category-pages.spec.ts` "filters and sort live in the URL", which failed once in a slow full run and then passed 24/24 when run alone (3 repeats).
- Like 4.3.10c, this was tested only against routed fakes, not the real API.

## What the next agent must do
**4.3.10e (phone step mode + baselines):**
- Below 768 px, show one block per screen with a compact Stepper and Back/Next, and a final "Review & publish" step that holds the SEO fields (screen 03).
- "Next" checks only the current step. Create/Save checks everything and jumps to the first step with an error.
- Add `/create` and an edit page to `e2e/screens.ts` for the visual and contrast baselines. The baselines are made on the production build with `=all` (see the e2e notes).

**4.3.12 (My gigs):**
- Link "Edit" to `/seller/gigs/{uid}/edit`.
- The legacy id forms of the edit URL 301 to it.

## Open questions / risks
- **Owner question Q-183 (`docs/01-discovery/open-questions.md`):** may the owner of a migrated gig with no stored revisions save without choosing a number? I allowed it (the field is left unchanged), because the opposite would be a new rule. If the Owner wants it required, it is a one-line change: drop `revisionsOptional`.
- **Security (4.3.18):**
  - Ownership is checked by the API on both reads and on PATCH. The client's `isOwner` check is only for the "not found" screen.
  - Stored HTML is rebuilt in an inert document (`cleanHtml`) before it reaches the editor.
- A gig whose page is open in two tabs: the second save wins (no version check in the contract). This is the same as legacy.
