'use client';
// Image picker of the portfolio form (spec 02 AC-24, AC-27; design components.md §5.13 "gallery" variant;
// legacy `x-forms.uploader` with jpg/jpeg/png, S-090 MB per image, S-089 images). Each image goes straight to
// storage through the shared upload protocol (ADR-009 §3) and is usable once the scan says `ready`. Per image:
// preview, "Uploading / Processing", or the reason it cannot be used (type, size, scan verdict); Remove.
import { useEffect, useId, useRef, useState } from 'react';
import { declaredType, fileExtension, uploadFile } from '@mytask/api-client';
import type { Locale } from '@mytask/i18n';
import { Alert } from '@mytask/ui/web';
import { useApi, useT } from '../../lib/client';

type State = 'uploading' | 'processing' | 'ready' | 'failed';

interface Item {
  key: number;
  name: string;
  preview: string;
  state: State;
  fileId?: string;
  message?: string;
  abort: AbortController;
}

const MB = 1024 * 1024;
let seq = 0;

export function ImageUploader(props: {
  locale: Locale;
  label: string;
  /** 1 = one image; a new pick replaces it. */
  max: number;
  maxSizeMb: number | null;
  extensions: string[];
  /** The API's message for this field. */
  error?: string;
  /** Under the field, e.g. "new images replace the current gallery". */
  note?: string;
  testId?: string;
  /** Ready file ids in the chosen order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const { onChange } = props;
  const t = useT(props.locale);
  const api = useApi(props.locale);
  const id = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const live = useRef(new Set<Item>());

  useEffect(() => {
    onChange(
      items.filter((i) => i.state === 'ready').map((i) => i.fileId!),
      items.some((i) => i.state === 'uploading' || i.state === 'processing'),
    );
  }, [items, onChange]);

  // Leaving the page stops the polling and frees the previews.
  useEffect(() => {
    const all = live.current;
    return () =>
      all.forEach((i) => {
        i.abort.abort();
        URL.revokeObjectURL(i.preview);
      });
  }, []);

  const update = (key: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function start(item: Item, file: File) {
    const res = await uploadFile(
      api,
      {
        purpose: 'portfolio_image',
        fileName: file.name,
        sizeBytes: file.size,
        contentType: declaredType(file.type),
        body: file,
      },
      { signal: item.abort.signal, onScanning: () => update(item.key, { state: 'processing' }) },
    );
    if (item.abort.signal.aborted) return;
    if (res.error) {
      return update(item.key, {
        state: 'failed',
        fileId: res.error.fileId,
        message: res.error.message ?? t('t_toast_something_went_wrong'),
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

  function pick(list: FileList | null) {
    setNotice(undefined);
    const chosen = [...(list ?? [])];
    if (input.current) input.current.value = '';
    if (chosen.length === 0) return;
    let kept = items;
    if (props.max === 1) {
      // One image: the new pick replaces the current one.
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
        preview: URL.createObjectURL(file),
        state: 'uploading',
        abort: new AbortController(),
      };
      live.current.add(item);
      // Client pre-checks only (the API re-checks): no request for a file that cannot pass.
      if (!props.extensions.includes(fileExtension(file.name))) {
        Object.assign(item, {
          state: 'failed',
          message: t('t_selected_file_extension_is_not_allowed'),
        });
      } else if (props.maxSizeMb !== null && file.size > props.maxSizeMb * MB) {
        Object.assign(item, { state: 'failed', message: t('t_selected_file_size_big') });
      } else {
        void start(item, file);
      }
      return item;
    });
    setItems([...kept, ...added]);
  }

  /** Stops the upload and deletes the unattached file (best effort; the API also cleans up later). */
  function discard(item: Item) {
    item.abort.abort();
    URL.revokeObjectURL(item.preview);
    live.current.delete(item);
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  }

  function remove(item: Item) {
    discard(item);
    setItems((list) => list.filter((i) => i.key !== item.key));
  }

  const stateText = (i: Item) =>
    i.state === 'uploading'
      ? t('t_uploading')
      : i.state === 'processing'
        ? t('t_processing')
        : i.state === 'failed'
          ? i.message
          : undefined;

  const full = props.max > 1 && items.filter((i) => i.state !== 'failed').length >= props.max;
  const busy = items.some((i) => i.state === 'uploading' || i.state === 'processing');

  return (
    <fieldset
      className="mt-pf-uploader"
      aria-invalid={!!props.error}
      aria-describedby={`${id}-info`}
      data-testid={props.testId}
    >
      <legend className="mt-pf-uploader-label">{props.label}</legend>
      <label className="mt-button mt-pf-file" data-disabled={full || undefined}>
        {t('t_browse_files')}
        <input
          ref={input}
          type="file"
          className="mt-visually-hidden"
          multiple={props.max > 1}
          accept={props.extensions.map((e) => `.${e}`).join(',')}
          disabled={full}
          aria-describedby={`${id}-info`}
          onChange={(e) => pick(e.target.files)}
        />
      </label>
      <p id={`${id}-info`} className="mt-pf-muted">
        {t('t_restrictions_files_allowed_info_explain', {
          size: props.maxSizeMb,
          extensions: props.extensions.join(', '),
        })}
        {props.max > 1 && ` ${t('t_validator_max_array', { max: props.max })}`}
      </p>
      {props.note && <p className="mt-pf-muted">{props.note}</p>}
      {notice && <Alert kind="error">{notice}</Alert>}
      {props.error && <Alert kind="error">{props.error}</Alert>}
      {items.length > 0 && (
        <ul className="mt-pf-thumbs" aria-live="polite" aria-busy={busy}>
          {items.map((i) => (
            <li key={i.key} className="mt-pf-thumb" data-state={i.state} data-testid="upload-item">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
              <img src={i.preview} alt={i.name} />
              {stateText(i) && (
                <span
                  className="mt-pf-thumb-state"
                  role={i.state === 'failed' ? 'alert' : undefined}
                >
                  {stateText(i)}
                </span>
              )}
              <button
                type="button"
                className="mt-pf-link-button"
                aria-label={`${t('t_remove')}: ${i.name}`}
                onClick={() => remove(i)}
              >
                {t('t_remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
