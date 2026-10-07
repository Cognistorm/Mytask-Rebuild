# 4.3.10a Web: gig wizard Upgrades, FAQ and SEO
From: web-engineer · To: web-engineer (4.3.10b), qa-engineer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

## What I did
4.3.10 was too big for one step, so I first split it in `docs/ROADMAP.md` into five tasks:
- **a**: Upgrades, FAQ and SEO (this task);
- **b**: Gallery;
- **c**: submit, success screens and "Discard changes?";
- **d**: edit mode;
- **e**: phone step mode and the visual baselines.

This task added three blocks to `/create`, in this order after Pricing: **Upgrades**, **FAQ** and **SEO**. The Gallery block (4.3.10b) goes between FAQ and SEO.

**Upgrades (AC-11)**
- Each upgrade is a row, a `fieldset` with the legend "Upgrade #n".
- The fields use the legacy labels:
  - `t_upgrade_title`, up to 100 characters;
  - `t_price` in a `PriceInput`, with the same checks as the gig price (at least 1 GEL, 2 decimals, at most 10 characters);
  - `t_delivery_time` as a Select from the delivery list, with the placeholder `t_and_an_additional_days`. Choosing a value is required; "None" means 0 extra days.
- "Add service upgrade" adds an empty row and moves the focus to its title.
- "Remove upgrade" moves the focus to the Add button. When a row is removed, the rows below it move up and keep the errors already shown on them (`shiftRowFields`).
- With 10 rows, the Add button is disabled. The text `t_upgrades_limit_reached` below it explains why and is linked with `aria-describedby`.

**FAQ (AC-12)**
- Works the same way as Upgrades. Each row has the legend "Question #n" (NEW key `t_ui_faq_number`).
- The question uses `t_question` (up to 100 characters) and the answer uses `t_answer` in a `TextArea` (up to 300 characters). The legacy example texts are the placeholders.
- Both are required. The limit text is `t_faq_limit_reached`.

**SEO (AC-15)**
- A small block with the "SEO meta tags" button.
- The button opens a `Dialog` with:
  - SEO title, up to 100 characters;
  - SEO description, up to 150 characters;
  - the legacy "Search engine Gig preview" (`create.blade.php:361`). The preview shows only the title and the description, because the real URL is not known until the gig is created.
- The dialog is placed **outside the `<form>`**, so pressing Enter in its fields does not submit the gig.
- **Save** keeps the dialog open while only one of the two fields is filled, and shows `t_seo_both_fields_required`. Closing the dialog with ✕ or Esc keeps what was typed and shows the same error in the block.
- The SEO button gets `data-invalid="true"` when there is an error. The AC-19 rule (focus the first invalid field) now also looks for `[data-invalid="true"]`, because `aria-invalid` is not meant for buttons.

**Model and checks (`gig-form.ts`)**
- `GigDraft` gets `upgrades`, `faqs` and `seo`.
- The fixed `BLOCK_FIELDS` table is replaced by `blockFields(draft)`, because the number of rows changes. Field names are the API's:
  - `upgrades[i].title`, `upgrades[i].price`, `upgrades[i].extraDays`;
  - `faqs[i].question`, `faqs[i].answer`;
  - `seo`.
- The gig price and the upgrade prices share one check (`priceIssue`). `BLOCKS` lists the blocks in page order and marks which ones are required.

**Summary**
- The summary lists five blocks. The three optional ones show "(optional)".
- An optional block with no rows is shown as "not started".
- Progress counts only the required blocks. It stays "x of 2" until the Gallery is added in 4.3.10b, then becomes "x of 3".

## Files created/changed
- `apps/web/src/components/gig-wizard/gig-form.ts`, `gig-wizard.tsx`, `gig-wizard.css`
- `apps/web/e2e/gig-wizard.spec.ts`:
  - +2 tests: upgrades/FAQ rows, removal and the limit; the SEO dialog, both or none;
  - the axe test now adds rows and also checks the open dialog, in light and dark.
- `packages/i18n/en.json`, `ka.json`: `t_ui_faq_number` ("Question #{{number}}" / "კითხვა #{{number}}")
- `docs/ROADMAP.md` (4.3.10 split; 4.3.10a ticked), `docs/STATUS.md`

Checks:
- web typecheck, lint and prettier are green; the i18n checker is OK.
- `gig-wizard.spec.ts`: 10 of 10 pass.
- Full web e2e (chromium): 158 passed, 3 skipped. One run of `custom-code.spec.ts` "private → public is a full page load" failed under full-suite load. It passed 3 of 3 when run alone, so it is a timing flake and has nothing to do with this change.

## What the next agent must do
**4.3.10b (Gallery):**
- Add a `gallery` entry to `BLOCKS` (required, between `faq` and `seo`) and give its fields names in `blockFields`. Suggested names, matching the API: `thumbnailFileId`, `imageFileIds`, `documentFileIds`.
- Number the block "5.".
- For uploading, follow the portfolio `ImageUploader` pattern (`createFileUpload` → presigned POST → `completeFileUpload`).

**4.3.10c (submit):** the API's `details.fields` names for upgrades and FAQ are already the field `name`s here, so a server error can be shown on its field by name.

## Open questions / risks
- The legacy ka text for `t_upgrade_title` ("განაახლეთ სათაური") means "update the title", and `t_enter_upgrade_title` reads the same way. The Owner may want to refine both in `ka.json`.
- The upgrade's extra-days field uses the legacy label `t_delivery_time`, the same as the gig's own delivery field. The row legend "Upgrade #n" tells screen readers which field it is. A clearer label would need a new key; I did not add one, so the legacy label stays.
- QA (4.3.18), deliberate differences from legacy:
  - Upgrades and FAQ are edited inline as rows, not added through a modal and then listed;
  - FAQ is its own block, not part of Overview (screen 03);
  - the SEO preview has no URL line.
