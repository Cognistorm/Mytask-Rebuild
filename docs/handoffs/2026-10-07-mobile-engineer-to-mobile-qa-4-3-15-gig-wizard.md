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

## Files created/changed
- `apps/mobile/src/app/create.tsx` (new)
- `apps/mobile/src/components/gig-wizard/fields.tsx` (new)
- `apps/mobile/src/components/gig-wizard/gig-wizard.tsx` (new)
- `apps/mobile/src/lib/gig-form.ts` (new)
- `apps/mobile/src/lib/gig-markup.ts` (new)
- `apps/mobile/src/lib/web-pages.ts` (`subscriptionUrl`)
- `packages/i18n/en.json`, `packages/i18n/ka.json` (1 key)
- `docs/ROADMAP.md` (split + tick), `docs/STATUS.md`

## Checks
Mobile typecheck, lint and prettier are green. The i18n check is OK. `expo export` bundled iOS (1718 modules) and Android (1808 modules). **Not run on a device or simulator.**

## What the next agent must do
- **4.3.15b** (mobile engineer): step 3 Extras (Upgrades ≤ 10 and FAQ ≤ 10, add / remove, errors move with their rows via `shiftRowFields`) and step 4 Gallery. The gallery has a thumbnail and 1…S-077 images from the camera or photo library, with reorder; PDF documents only while S-080 is ON; per-file progress / error / retry / remove. Reuse the portfolio `image-picker.tsx` pattern and `uploadFile`.
- **4.3.15c**: step 5 Review & publish (SEO both or none) and the submit.
- **4.3.15d**: edit mode, and the gig screen's "Edit gig" opens it.
- **No app entry point to `/create` yet.** "Create a new gig" belongs to My gigs (4.3.16). Until then, open `mytask://create` to test.
- Mobile QA, on a device: the category sheets with the real tree; the decimal keypad (some Android keyboards type `,`, which the price accepts); Discard on the iOS swipe back and the Android back; TalkBack / VoiceOver reading of the step change, the reset announcement and the first error.

## Open questions / risks
- A web description with a literal `*` around a word (e.g. `*note*` typed as text) becomes italic if it is saved again from the app. This is rare, and the stored text is otherwise unchanged.
- Product analyst: components.md §5.5 marked the native formatting as an "open point". The app now offers lists, bold and italic, which is the whole `user_text` allow-list. Please confirm, or narrow it.
