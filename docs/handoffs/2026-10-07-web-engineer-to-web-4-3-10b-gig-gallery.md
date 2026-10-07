# 4.3.10b Web: gig wizard Gallery block
From: web-engineer · To: web-engineer (4.3.10c), qa-engineer (4.3.18) · Date: 2026-10-07 · Branch `feat/gigs`

## What I did
I added the **Gallery** block to `/create` (block 5, between FAQ and SEO). It covers spec 04 AC-14 and the order part of AC-23. It is required, so the summary progress now reads "x of 3 required blocks".

**`GigFiles`** (`apps/web/src/components/gig-wizard/gig-files.tsx`) is one file list. The block uses three of them:
- **Thumbnail** (`gig_thumbnail`): one image. A new pick replaces it.
- **Images** (`gig_image`): 1…S-077 images, shown as 3:2 previews. Each has "Move left" / "Move right" buttons. After a move, the focus stays on the moved file's button, or on its other button at the end of the list. The order of the list is the order sent as `imageFileIds`.
- **Documents** (`gig_document`): PDFs, listed by name. Shown only while `config.uploads.gigDocument.enabled` (S-080). While the config is loading they stay hidden, as the other switched features do (EC-8).

**Each file goes through these states:**
- queued → uploading with a % and a progress bar → processing (the scan) → ready.
- A wrong type or size is refused before any request, each with its own legacy message (`t_selected_file_extension_is_not_allowed`, `t_selected_file_size_big`). Such a file only offers Remove.
- A storage failure shows `t_error_while_uploading_your_file`. A refusal from the API or the scan shows the API's message. Both offer **Retry**: it deletes the failed file row and uploads the same file again.
- **Remove** stops the upload and deletes the file. The file is not attached to anything yet, so `deleteFile` is allowed.
- At most 3 uploads run at once. A hidden status line announces "x of y uploaded".
- Files can also be dropped onto the list. This is extra; the "Browse files" button is the main way (§5.13).
- When a list is full, the picker is disabled.

**Limits** come from the public config: `uploads.gigImage` (S-077, S-078) and `uploads.gigDocument` (S-081, S-082). While the config loads, the defaults are 10 images and 5 MB. Allowed types are the legacy lists (jpg/jpeg/png, pdf) unless the config narrows them.

**Upload progress:** `fetch` cannot report how much of a file has been sent. So `@mytask/api-client` `uploadFile` gains `onProgress`. When it is set (and no `fetch` option is given), the storage POST goes through `XMLHttpRequest`, which exists in browsers and in React Native; otherwise nothing changes. There is a new unit test (api-client 10/10).

**Pre-check** (`gig-form.ts`):
- `thumbnailFileId` and `imageFileIds` are required. These are the API's field names.
- The file input carries `name` and `aria-invalid`, so the AC-19 rule focuses it.
- Create while files are still uploading shows an info Alert, `t_pls_wait_until_uploading_finish`, and sends nothing.
- `GigDraft.gallery` holds the ready ids of each list in order, plus `busy`.

**4 new keys (en + ka):** `t_ui_upload_queued`, `t_ui_upload_count`, `t_ui_move_left`, `t_ui_move_right`.

## Files created/changed
- `apps/web/src/components/gig-wizard/gig-files.tsx` (new); `gig-form.ts`, `gig-wizard.tsx`, `gig-wizard.css`
- `packages/api-client/src/upload.ts` (`onProgress`), `test/upload.test.ts` (+1)
- `packages/i18n/en.json`, `ka.json` (+4 keys)
- `apps/web/e2e/gig-wizard.spec.ts`:
  - the routed upload protocol (`fakeFiles`; storage refuses a `flaky…` file once);
  - the fake config now always includes `uploads`, as the real API does;
  - +2 tests: the gallery flow; documents hidden while S-080 is OFF;
  - the axe test now shows a ready file and a refused file.
- `docs/ROADMAP.md`, `docs/STATUS.md`

**Checks:**
- web typecheck, lint and prettier are green; the i18n checker is OK; api-client tests 10/10.
- `gig-wizard.spec.ts` passes 12/12, and 36/36 with `--repeat-each=3`.
- Full web e2e (chromium): 160 passed, 3 skipped.

## What the next agent must do
**4.3.10c (submit):**
- Send `draft.gallery.thumbnail[0]` as `thumbnailFileId`, `draft.gallery.images` as `imageFileIds`, and `draft.gallery.documents` as `documentFileIds`. Send `documentFileIds` only when the list is shown.
- Put the 422 `FILE_*` errors on the matching list through its `error` prop. The API returns these errors per file. If `details` names the field, use it; otherwise show them on `imageFileIds`.
- The submit already stops while `draft.gallery.busy` is true.

**4.3.10d (edit mode):** `GigFiles` has no stored files yet. Add an `initial` prop for the stored files (id, preview URL, name), marked `ready`, so that AC-23 works: remove one, add more, reorder. The thumbnail can be replaced.

## Open questions / risks
- A file whose scan is still running when the user leaves the page is dropped by the API cleanup after 24 h. This is the same as the portfolio form.
- Legacy took the gallery as one upload step. The per-file states, Retry, reorder and the parallel limit are new, from screen 03 and components §5.13; QA should list them as deliberate differences.
- The mobile app can use `onProgress` the same way (4.3.15).
