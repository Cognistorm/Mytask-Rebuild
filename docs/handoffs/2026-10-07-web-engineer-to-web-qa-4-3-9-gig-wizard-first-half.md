# 4.3.9 Web: gig create wizard, first half
From: web-engineer · To: web-engineer (4.3.10), qa-engineer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

## What I did
I split the wizard into two micro-tasks, both described in `docs/ROADMAP.md`. This one (4.3.9) covers the entry, the page frame, and the Overview and Pricing blocks with their client-side checks. 4.3.10 covers the rest.

- **Route `/create`** is in the private zone (strict CSP, no custom code, `noindex, nofollow`). It still shows the site header and footer, because the legacy `/create` was a main-site page and screen 03 shows the site header. The category tree comes from the same cached server call the header already makes (`getCategoryTree`). **`/post/service`** answers 301 with `/create`, keeping the language and the query string.
- **On opening**, the page calls `getGigCreationEligibility`:
  - 401 → login with `?next=/create`;
  - 403 `ACCOUNT_RESTRICTED` → `/restricted`;
  - `canCreate: false` → an EmptyState with `t_plan_gig_limit_reached {limit}` and "Upgrade to Premium" linking to `/subscription?gigs=true`. The form is not shown (AC-2).
  - Any other failure → an error message with a Retry button.
- **Layout (screen 03, desktop):** the heading, then the AC-7 notice (`t_english_fields_optional_notice_v2`), then the blocks in an 8/12 column with a sticky 4/12 summary. The summary is a `Stepper` with each block's status, a progress bar and the Create button. Clicking a step scrolls to its block. Below 1024 px the summary stacks under the blocks; the phone step mode is part of 4.3.10.
- **Overview:**
  - Title in Georgian (required) and in English (optional). Both have `maxLength` 100 and a 0/100 counter. The labels are legacy `t_service_title` plus the new "in Georgian" / "in English" keys, as legacy appended the language name.
  - Category → Subcategory → Childcategory, using the legacy keys and placeholders. A lower level stays disabled with a hint until the level above is chosen. Changing a higher level resets the lower ones, and a polite status line announces the reset.
  - Description in Georgian and in English, in the new `RichTextEditor`.
- **Pricing:**
  - `PriceInput`: `₾` prefix, decimal keypad, `,` accepted as the decimal mark, rewritten with 2 decimals on blur.
  - Delivery time: a Select with the legacy list (`t_none` … `t_1_month`).
  - `QuantityInput` for revisions: 0…`config.revisions.maxAllowed` (S-041), falling back to 10 while the config loads.
- **Client-side checks** (`components/gig-wizard/gig-form.ts`) use the same field names and message keys as the API (`gig-input.ts`), so a server error can be put on the same field in 4.3.10:
  - lengths 3–100 and ≥ 10;
  - Georgian and English character rules;
  - all three category levels required;
  - price format (`t_validator_regex`), at least 1 GEL (`t_price_min`), at most 9,999,999.99 (`t_validator_max {max: 10}`);
  - delivery time required;
  - revisions `t_validator_revisions_range`. An empty revisions field is refused too (AC-9).
- **When errors show:** a field's error appears once the user leaves it, or for every field after Create. Create with errors shows the summary Alert `t_toast_form_validation_error`, marks the blocks "has errors" and focuses the first invalid field in page order (AC-19).
- **Create with no errors does nothing yet.** The upload check and `createGig` come in 4.3.10.
- **Shared language check:** `packages/i18n/src/content-language.ts`, exported from `@mytask/i18n` as `georgianFieldIssue`, `englishFieldIssue`, `normaliseContentText` and `contentLength`. It reads the same `content-language.json` file as the API. The API keeps its own copy of the logic, because it only imports the JSON from workspace packages, never their TS source. A new parity test in `apps/api/test/content-language.test.ts` makes both give the same result, message key and refused characters for the same inputs.
- **New shared components** (`@mytask/ui/web`):
  - `RichTextEditor` (components.md §5.5):
    - Toolbar with Bold, Italic, Bulleted list and Numbered list, with `aria-pressed`. Ctrl/Cmd+B and I work.
    - Paragraphs are written as `<p>`. Pasted content arrives as plain text, and dropping content into the editor is blocked.
    - A value given from outside is rebuilt in an inert `DOMParser` document, keeping only the `user_text` elements (`p br strong b em i ul ol li`) and no attributes. A stored value therefore cannot run anything when it is loaded in edit mode.
    - `onChange(html, text)` returns the HTML and its plain text; the plain text is used for the checks.
  - `PriceInput` and `QuantityInput` (§5.3). `QuantityInput` uses `role="spinbutton"`, Arrow keys, 44 px buttons, and its buttons stay within min…max.
  - `Stepper` (§6.12, vertical summary). Each step's name includes its status in words, e.g. "Overview, completed", and the current step has `aria-current="step"`. The progress bar is named by its visible text.
  - `Select` gains `disabled` and `hint`.
- **17 new keys (en + ka):**
  - field labels: `t_label_in_georgian`, `t_label_in_english`;
  - step statuses: `t_ui_step_not_started`, `t_ui_step_in_progress`, `t_ui_step_completed`, `t_ui_step_has_errors`;
  - progress: `t_ui_required_blocks_progress`;
  - editor: `t_ui_text_formatting`, `t_ui_bold`, `t_ui_italic`, `t_ui_bulleted_list`, `t_ui_numbered_list`;
  - revisions buttons: `t_ui_decrease`, `t_ui_increase`;
  - title counter: `t_ui_char_count`;
  - category levels: `t_ui_choose_level_above_first`, `t_ui_lower_category_levels_cleared`.

## Files created/changed
- `apps/web/src/app/[locale]/(private)/create/page.tsx` (new), `.../(private)/post/service/route.ts` (new)
- `apps/web/src/components/gig-wizard/gig-wizard.tsx`, `gig-form.ts`, `gig-wizard.css` (new)
- `packages/ui/src/web/inputs.tsx`, `inputs.css`, `stepper.tsx`, `stepper.css` (new); `form.tsx` (Select props); `index.ts`
- `packages/i18n/src/content-language.ts` (new), `src/index.ts`, `en.json`, `ka.json`
- `apps/api/test/content-language.test.ts` (+1 parity test)
- `apps/web/e2e/gig-wizard.spec.ts` (new, 8 tests: guest, restricted, 301, plan limit, noindex + header + notice, main flow, Georgian texts, axe WCAG 2 A/AA with errors shown)
- `docs/ROADMAP.md` (4.3.9 ticked, 4.3.10 detailed), `docs/STATUS.md`

Checks: web typecheck + lint green; ui and i18n typecheck + lint green; i18n checker OK; API `content-language` 12/12; web e2e (chromium) 156 passed / 3 skipped.

## What the next agent must do
**4.3.10 (web-engineer):**
- **New blocks:** Upgrades and FAQ blocks, Gallery and the SEO dialog. Add their fields to `BLOCK_FIELDS` and `validateDraft`, and their steps to the summary. The Gallery is required, so it also counts in the progress total.
- **Submit:**
  - upload the files, then send `createGig` with the price in tetri (`toTetri`);
  - put the API's `details.fields` errors onto the shown fields;
  - 422 PLAN_LIMIT_REACHED → danger Banner (AC-3);
  - show the success screens for S-070 ON and OFF (AC-16).
- **Edit mode** at `/seller/gigs/{uid}/edit` reuses the same form, loading it with `RichTextEditor` `value` = the stored HTML.
- **Leaving and phones:** "Discard changes?" on leaving the page, and the phone step mode.
- **Tests:** add the wizard to `e2e/screens.ts` for the visual and contrast baselines.

**QA (4.3.18):** compare the page with legacy `create.blade.php`. Deliberate differences:
- the summary column;
- English labels "… in Georgian" instead of legacy "Ge";
- empty revisions refused (NEW field);
- Latin words allowed in Georgian fields (Q-022).

## Open questions / risks
- `RichTextEditor` uses `document.execCommand`. It is deprecated but still supported by all current browsers, and is enough for this small formatting set. If a browser drops it, replace the editor's internals; its props can stay the same.
- In the light theme, the canvas gradient in the screenshot ends at the first viewport height on tall pages. This is the same on other pages (foundation), not specific to the wizard.
- On the Georgian page the error summary text is the legacy `t_toast_form_validation_error` ka value "მოხდა შეცდომა !". The Owner may want to refine it in the language file.
