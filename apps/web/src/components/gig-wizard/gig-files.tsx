'use client';
// One file list of the gig wizard's Gallery block (spec 04 AC-14; components.md §5.13 `gallery` + per-file states;
// legacy `GalleryValidator.php:42-54`): the thumbnail, the gallery images or the PDF documents. Each file goes
// straight to storage through the shared upload protocol (ADR-009 §3, `uploadFile` with upload progress) and is
// usable once the scan says `ready`. Per file: queued → uploading % → processing → ready, or the reason it cannot be
// used with Retry (network / scan) and Remove. At most 3 uploads run at once; the rest wait as "queued". Images
// can be reordered by keyboard ("Move left/right", AC-23 order = display order). Reports the ready ids in order.
// In edit mode the list starts with the gig's stored files (`initial`, AC-23): they can be moved and removed (a
// stored file is only dropped from the list, never deleted: the gig keeps it until the edit is saved).
import { useEffect, useId, useRef, useState } from 'react';
import { declaredType, fileExtension, uploadFile, type UploadInput } from '@mytask/api-client';
import { useApi, useLocale, useT } from '../../lib/client';

type State = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

interface Item {
  key: number;
  name: string;
  /** Image preview (a blob: URL, or the CDN thumb of a stored file); documents show their name instead. */
  preview?: string;
  /** A file the gig already has (edit mode). */
  stored?: boolean;
  state: State;
  /** Share of the bytes sent (0…1) while uploading. */
  progress: number;
  fileId?: string;
  message?: string;
  /** Kept for Retry; null when the file can never pass (type or size). */
  file: File | null;
  abort: AbortController;
}

/** A file the gig already has, as the edit form shows it. */
export interface StoredFile {
  fileId: string;
  name: string;
  preview?: string;
}

const MB = 1024 * 1024;
const PARALLEL = 3;
let seq = 0;

export function GigFiles(props: {
  label: string;
  /** Help text: what to upload, types and size. */
  info: string;
  /** A second help line under the help text (documents: the file name is public, Q-186). */
  hint?: string;
  purpose: Extract<UploadInput['purpose'], 'gig_thumbnail' | 'gig_image' | 'gig_document'>;
  /** Field name of the API (`thumbnailFileId`, `imageFileIds`, `documentFileIds`): the error and AC-19 focus. */
  name: string;
  /** 1 = one file; a new pick replaces it. */
  max: number;
  maxSizeMb: number | null;
  extensions: string[];
  /** Images show previews and can be reordered; documents are listed by name. */
  kind: 'image' | 'document';
  reorder?: boolean;
  error?: string;
  testId?: string;
  /** Stored files to start with (edit mode). */
  initial?: StoredFile[];
  /** Ready file ids in display order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const { onChange } = props;
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const id = useId();
  const [items, setItems] = useState<Item[]>(() =>
    (props.initial ?? []).map((f) => ({
      key: (seq += 1),
      name: f.name,
      preview: f.preview,
      stored: true,
      state: 'ready',
      progress: 1,
      fileId: f.fileId,
      file: null,
      abort: new AbortController(),
    })),
  );
  const [notice, setNotice] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const live = useRef(new Set<Item>());
  const started = useRef(new Set<number>());
  /** Key of an item whose Move button should keep the focus after the list re-renders. */
  const [moved, setMoved] = useState<{ key: number; dir: -1 | 1 }>();
  const list = useRef<HTMLUListElement>(null);

  const busy = items.some((i) => ['queued', 'uploading', 'processing'].includes(i.state));
  useEffect(() => {
    onChange(
      items.filter((i) => i.state === 'ready').map((i) => i.fileId!),
      busy,
    );
  }, [items, busy, onChange]);

  // Leaving the page stops the uploads and the polling and frees the previews.
  useEffect(() => {
    const all = live.current;
    return () =>
      all.forEach((i) => {
        i.abort.abort();
        if (i.preview && !i.stored) URL.revokeObjectURL(i.preview);
      });
  }, []);

  const update = (key: number, patch: Partial<Item>) =>
    setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // The queue: start waiting files while fewer than PARALLEL are on their way.
  useEffect(() => {
    const running = items.filter((i) => i.state === 'uploading').length;
    items
      .filter((i) => i.state === 'queued' && !started.current.has(i.key))
      .slice(0, Math.max(0, PARALLEL - running))
      .forEach((i) => {
        started.current.add(i.key);
        update(i.key, { state: 'uploading', progress: 0 });
        void start(i);
      });
  });

  async function start(item: Item) {
    const file = item.file!;
    const res = await uploadFile(
      api,
      {
        purpose: props.purpose,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: declaredType(file.type),
        body: file,
      },
      {
        signal: item.abort.signal,
        onProgress: (progress) => update(item.key, { progress }),
        onScanning: () => update(item.key, { state: 'processing', progress: 1 }),
      },
    );
    if (item.abort.signal.aborted) return;
    if (res.error) {
      return update(item.key, {
        state: 'failed',
        fileId: res.error.fileId,
        message:
          res.error.code === 'UPLOAD_FAILED'
            ? t('t_error_while_uploading_your_file')
            : (res.error.message ?? t('t_toast_something_went_wrong')),
      });
    }
    update(
      item.key,
      res.file.status === 'ready'
        ? { state: 'ready', fileId: res.file.id }
        : {
            state: 'failed',
            fileId: res.file.id,
            message: res.file.rejectReason ?? t('t_toast_something_went_wrong'),
          },
    );
  }

  function pick(files: FileList | null) {
    setNotice(undefined);
    const chosen = [...(files ?? [])];
    if (input.current) input.current.value = '';
    if (chosen.length === 0) return;
    let kept = items;
    if (props.max === 1) {
      // One file: the new pick replaces the current one.
      items.forEach(discard);
      kept = [];
      chosen.splice(1);
    } else {
      const used = items.filter((i) => i.state !== 'failed').length;
      if (used + chosen.length > props.max) {
        setNotice(t('t_validator_max_array', { max: props.max }));
        chosen.splice(Math.max(0, props.max - used));
      }
    }
    const added = chosen.map((file) => {
      const item: Item = {
        key: (seq += 1),
        name: file.name,
        preview: props.kind === 'image' ? URL.createObjectURL(file) : undefined,
        state: 'queued',
        progress: 0,
        file,
        abort: new AbortController(),
      };
      live.current.add(item);
      // AC-14: wrong type or size is refused per file with its own message, before any request (the API re-checks).
      if (!props.extensions.includes(fileExtension(file.name))) {
        Object.assign(item, {
          state: 'failed',
          file: null,
          message: t('t_selected_file_extension_is_not_allowed'),
        });
      } else if (props.maxSizeMb !== null && file.size > props.maxSizeMb * MB) {
        Object.assign(item, {
          state: 'failed',
          file: null,
          message: t('t_selected_file_size_big'),
        });
      }
      return item;
    });
    setItems([...kept, ...added]);
  }

  /**
   * Stops the upload and deletes the unattached file (best effort; the API also cleans up after 24 h). A stored file
   * stays attached to the gig until the edit is saved, so it is only taken off the list.
   */
  function discard(item: Item) {
    item.abort.abort();
    live.current.delete(item);
    if (item.stored) return;
    if (item.preview) URL.revokeObjectURL(item.preview);
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  }

  function remove(item: Item) {
    discard(item);
    setItems((l) => l.filter((i) => i.key !== item.key));
    input.current?.focus();
  }

  function retry(item: Item) {
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
    started.current.delete(item.key);
    const next: Item = {
      ...item,
      state: 'queued',
      progress: 0,
      fileId: undefined,
      message: undefined,
      abort: new AbortController(),
    };
    live.current.delete(item);
    live.current.add(next);
    setItems((l) => l.map((i) => (i.key === item.key ? next : i)));
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    setItems((l) => {
      const next = [...l];
      [next[index], next[to]] = [next[to]!, next[index]!];
      return next;
    });
    setMoved({ key: items[index]!.key, dir });
  }

  // Keep the focus on the moved file's button in the same direction, or the other one at the end of the list.
  useEffect(() => {
    if (!moved) return;
    setMoved(undefined);
    const row = list.current?.querySelector(`[data-key="${moved.key}"]`);
    const buttons = row?.querySelectorAll<HTMLButtonElement>('[data-move]');
    const same = [...(buttons ?? [])].find((b) => b.dataset.move === String(moved.dir));
    (same && !same.disabled ? same : [...(buttons ?? [])].find((b) => !b.disabled))?.focus();
  }, [moved]);

  const stateText = (i: Item) => {
    switch (i.state) {
      case 'queued':
        return t('t_ui_upload_queued');
      case 'uploading':
        return `${t('t_uploading')} ${Math.round(i.progress * 100)}%`;
      case 'processing':
        return t('t_processing');
      case 'failed':
        return i.message;
      default:
        return undefined;
    }
  };

  const full = props.max > 1 && items.filter((i) => i.state !== 'failed').length >= props.max;
  const ready = items.filter((i) => i.state === 'ready').length;
  const describedBy = [`${id}-info`, props.hint && `${id}-hint`, props.error && `${id}-err`]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset
      className="mt-gw-files"
      data-testid={props.testId}
      onDragOver={(e) => {
        if (!full) e.preventDefault();
      }}
      onDrop={(e) => {
        // Drag and drop is extra; the button is the main way (§5.13).
        e.preventDefault();
        if (!full) pick(e.dataTransfer.files);
      }}
    >
      <legend className="mt-gw-files-label">{props.label}</legend>
      <p id={`${id}-info`} className="auth-hint mt-gw-files-info">
        {props.info}
      </p>
      {props.hint && (
        <p id={`${id}-hint`} className="auth-hint mt-gw-files-info">
          {props.hint}
        </p>
      )}
      <label className="mt-button mt-gw-file" data-disabled={full || undefined}>
        {t('t_browse_files')}
        <input
          ref={input}
          type="file"
          name={props.name}
          className="mt-visually-hidden"
          multiple={props.max > 1}
          accept={props.extensions.map((e) => `.${e}`).join(',')}
          disabled={full}
          aria-invalid={!!props.error}
          aria-describedby={describedBy}
          onChange={(e) => pick(e.target.files)}
        />
      </label>
      {notice && (
        <p className="auth-error" role="alert">
          {notice}
        </p>
      )}
      {props.error && (
        <p id={`${id}-err`} className="auth-error" role="alert">
          {props.error}
        </p>
      )}
      {items.length > 0 && (
        <>
          <ul
            ref={list}
            className="mt-gw-file-list"
            data-kind={props.kind}
            aria-busy={busy}
            aria-label={props.label}
          >
            {items.map((i, index) => (
              <li
                key={i.key}
                className="mt-gw-file-item"
                data-state={i.state}
                data-key={i.key}
                data-testid="gig-file"
              >
                {i.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL)
                  <img className="mt-gw-file-preview" src={i.preview} alt={i.name} />
                ) : (
                  <span className="mt-gw-file-name">{i.name}</span>
                )}
                {i.state === 'uploading' && (
                  <span className="mt-progress mt-gw-file-progress" aria-hidden="true">
                    <span
                      className="mt-progress-fill"
                      style={{ inlineSize: `${Math.round(i.progress * 100)}%` }}
                    />
                  </span>
                )}
                {stateText(i) && (
                  <span
                    className="mt-gw-file-state"
                    role={i.state === 'failed' ? 'alert' : undefined}
                  >
                    {stateText(i)}
                  </span>
                )}
                <span className="mt-gw-file-actions">
                  {props.reorder && items.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="mt-pf-link-button"
                        data-move="-1"
                        disabled={index === 0}
                        aria-label={`${t('t_ui_move_left')}: ${i.name}`}
                        onClick={() => move(index, -1)}
                      >
                        <span aria-hidden="true">←</span>
                      </button>
                      <button
                        type="button"
                        className="mt-pf-link-button"
                        data-move="1"
                        disabled={index === items.length - 1}
                        aria-label={`${t('t_ui_move_right')}: ${i.name}`}
                        onClick={() => move(index, 1)}
                      >
                        <span aria-hidden="true">→</span>
                      </button>
                    </>
                  )}
                  {i.state === 'failed' && i.file && (
                    <button
                      type="button"
                      className="mt-pf-link-button"
                      aria-label={`${t('t_ui_retry')}: ${i.name}`}
                      onClick={() => retry(i)}
                    >
                      {t('t_ui_retry')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="mt-pf-link-button"
                    aria-label={`${t('t_remove')}: ${i.name}`}
                    onClick={() => remove(i)}
                  >
                    {t('t_remove')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {/* "3 of 5 uploaded" (§5.13), announced as files finish. */}
          <p className="mt-visually-hidden" role="status">
            {t('t_ui_upload_count', { done: ready, total: items.length })}
          </p>
        </>
      )}
    </fieldset>
  );
}
