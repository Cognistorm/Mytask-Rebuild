# 03 — Gig create / edit wizard (`/create`, edit from Selling → Gigs)
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 04 AC-1…19 (entry, plan limit, Overview, Pricing + revisions, Upgrades, FAQ, Gallery, SEO, submit, moderation, errors), AC-20…25 (editing), 00 AC-5 (plan limit), R-5.3/R-5.4 (language rules). Components §6.12 Stepper, §5.13 FileUpload.

## Kept from the live site
- The same blocks in the same order: Overview (titles, categories, descriptions) → Pricing (price, delivery time) → Gallery (thumbnail, images, documents) → SEO meta dialog → "Create".
- Georgian fields first and required; English fields optional, next to them.

## Changes
- Desktop is one page with all blocks and a side summary with the block list and progress, as the approved spec 04 screens table defines (components §6.12); clicking a block scrolls to it.
- Pricing gains **Number of revisions** (required, 0…S-041, NEW Q-056).
- Upgrades and FAQ blocks are restored in the wizard (ACCEPTED P-32).
- No tags, video link or requirement questions (04 AC-13).
- Language notice at the top says English is optional and Georgian is shown otherwise (04 AC-7, Q-023).
- Georgian fields accept Latin words (04 AC-5, Q-022).
- Mobile and native: one block per screen with Back / Next.

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (solid)                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Create a new gig                                                             │  PageHeader h1
│ ┌ info Banner: English is optional. Without it, English visitors see the ┐   │  t_english_fields_
│ │ Georgian text.                                                          │   │  optional_notice_v2
├───────────────────────────────────────────────────────┬──────────────────────┤
│ ┌ 1. Overview (Card) ───────────────────────────────┐ │ ┌ Summary (sticky) ─┐│
│ │ Title (Georgian) *            [.................] │ │ │ ✓ Overview        ││
│ │   3–100 characters · 12/100                       │ │ │ ● Pricing         ││  Stepper vertical:
│ │ Title (English)               [.................] │ │ │ ○ Upgrades (opt.) ││  complete / in
│ │ Category * ▾   Sub-category * ▾   Child * ▾       │ │ │ ○ FAQ (opt.)      ││  progress / not
│ │ Description (Georgian) *  [B][I][•][1.]           │ │ │ ⚠ Gallery (error) ││  started / errors
│ │ ┌───────────────────────────────────────────────┐ │ │ │ ○ SEO (opt.)      ││
│ │ │ RichTextEditor                                │ │ │ │ ─────────────────││
│ │ └───────────────────────────────────────────────┘ │ │ │ 2 of 4 required   ││  ProgressBar
│ │ Description (English)  [RichTextEditor]           │ │ │ [ Create  (lg)  ] ││
│ └───────────────────────────────────────────────────┘ │ └───────────────────┘│
│ ┌ 2. Pricing ───────────────────────────────────────┐ │                      │
│ │ Price * [₾ 250.00 ]   Delivery time * [3 days ▾]  │ │                      │
│ │ Number of revisions *  [ − ][ 3 ][ + ]  0–10      │ │                      │  QuantityInput,
│ └───────────────────────────────────────────────────┘ │                      │  max = S-041
│ ┌ 3. Upgrades (optional) ───────────────────────────┐ │                      │
│ │ Title [..........] Price [₾ 20.00] Extra days [+1▾] [🗑] │                 │
│ │ [+ Add upgrade]   (max 10)                        │ │                      │
│ └───────────────────────────────────────────────────┘ │                      │
│ ┌ 4. FAQ (optional) ────────────────────────────────┐ │                      │
│ │ Question [.............] Answer [..............] [🗑]                       │
│ │ [+ Add question]  (max 10)                        │ │                      │
│ └───────────────────────────────────────────────────┘ │                      │
│ ┌ 5. Gallery ───────────────────────────────────────┐ │                      │
│ │ Thumbnail *  [dropzone]  JPG/PNG, max S-078 MB    │ │                      │
│ │ Images *  [img][img][img][ + ]  1…S-077, reorder  │ │                      │  FileUpload `gallery`
│ │ Documents (only if S-080 ON) [dropzone PDF]       │ │                      │
│ └───────────────────────────────────────────────────┘ │                      │
│ [SEO meta tags…]  → Dialog lg: SEO title ≤100, description ≤150            │
│                                            [ Create (lg) ]                   │
└───────────────────────────────────────────────────────┴──────────────────────┘
```
Main column 8/12, summary 4/12, sticky under the header. Edit mode uses the same page with the title "Edit gig", the button "Save changes", and, for a rejected gig, a `danger` Banner at the top with the staff reason (04 AC-18).

## Mobile web (360) and native app
```
┌──────────────────────────────────┐
│ ✕  Create a new gig              │  header: close asks "Discard changes?"
│ Step 2 / 5  ▰▰▱▱▱                │  compact Stepper
├──────────────────────────────────┤
│ Pricing                          │  h2 = step name
│ Price *                          │
│ [ ₾ 250.00                    ]  │  numeric keypad (decimal)
│ Delivery time *                  │
│ [ 3 days                     ▾]  │  Select → BottomSheet
│ Number of revisions *            │
│ [ − ]      3       [ + ]         │
│ 0 = no revisions · max 10        │  help text
│                                  │
├──────────────────────────────────┤
│ [ Back ]            [ Next (lg) ]│  StickyActionBar (rises above keyboard)
└──────────────────────────────────┘
```
Steps: 1 Overview → 2 Pricing → 3 Extras (Upgrades + FAQ, both optional) → 4 Gallery (camera / photo library / files) → 5 Review & publish (summary of every block with "Edit" links, the SEO meta fields, "Create"). "Next" validates only the current step. "Create" validates everything and jumps to the first step with an error.

## Components
Stepper (vertical + compact), ProgressBar, Banner (`info`, `danger`, `warning` for plan limit), Card, Field + Input, Select (3 dependent levels), RichTextEditor, PriceInput, QuantityInput (revisions), FileUpload `dropzone` + `gallery`, Dialog `lg` (SEO; BottomSheet `full` on phones), Button, IconButton (remove rows), StickyActionBar (mobile), ConfirmDialog ("Discard changes?"), Toast, EmptyState (plan limit screen).

## States
| State | What shows | AC |
|---|---|---|
| Plan limit reached (on opening) | Full-page EmptyState: `t_plan_gig_limit_reached` with the limit + "Upgrade to Premium" → `/subscription?gigs=true`; the form is not shown | 04 AC-2 |
| Plan limit on submit (bypass) | Banner `danger` with the same text; nothing saved | 04 AC-3 |
| Guest | Redirect to login, then back to `/create` | 04 AC-1 |
| Loading | Skeleton of blocks; category Select shows a spinner while its list loads | 04 screens |
| Category change | Lower-level Selects reset and show "Choose…" | 04 AC-4 |
| Field error | Field `error` state with its message (`t_validator_georgian_letter_required`, `t_validator_english_only`, `t_validator_revisions_range`, …); block marked ⚠ in the summary | 04 AC-5, 6, 9 |
| Submit with errors | Nothing saved; focus moves to the first invalid field; Toast `t_toast_form_validation_error`; ErrorSummary at the top on mobile | 04 AC-19 |
| Upload | Per file: queued → progress % → done / error (type or size, own message) with Retry/Remove | 04 AC-14 |
| SEO one field only | Inline `t_seo_both_fields_required` in the dialog | 04 AC-15 |
| Submitting | Create button busy; form read-only | — |
| Success, auto-approve ON | Success screen `t_gig_created` / `t_gig_created_subtitle` + "View gig" | 04 AC-16 |
| Success, auto-approve OFF | Success screen `t_gig_created_subtitle_pending_approval` + "Go to my gigs" | 04 AC-16 |
| Edit of rejected gig | Banner with the staff reason | 04 AC-18 |
| Revisions above new maximum (edit) | Field shows the stored value with an error on save (0…S-041) | 04 AC-10 |
| Leaving with changes | ConfirmDialog "Discard changes?" | components §6.12 |

## Accessibility
- The side summary is `nav` labelled `t_ui_form_progress`; the current block has `aria-current="step"`; status is written in text ("completed", "has errors"), not icons only.
- Character counters are announced politely when 90 % is reached, not on every key.
- Dependent Selects announce the reset ("Sub-category cleared").
- Gallery reorder by keyboard through a "Move left/right" menu.

## Georgian length
Field labels wrap to 2 lines. The three category Selects stack below 1280 px when their labels do not fit.
