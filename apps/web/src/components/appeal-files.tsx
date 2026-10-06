'use client';
// File picker of the restriction appeal (spec 01 AC-47; legacy livewire/restricted/index.blade.php "Attach a file"
// with the t_restrictions_files_allowed_info_explain notice). Each file goes straight to storage through the
// shared upload protocol (ADR-009 §3) and is usable once the scan says `ready`. The user never downloads it
// again (R-A8, Owner 2026-10-02): the list shows name, size and state only.
import { useEffect, useRef, useState } from 'react';
import { declaredType, fileExtension, uploadFile } from '@mytask/api-client';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Alert } from '@mytask/ui/web';
import { useApi, useT } from '../lib/client';

type Rule = components['schemas']['PublicConfigUploadRule'];
type State = 'uploading' | 'processing' | 'ready' | 'failed';

interface Item {
  key: number;
  name: string;
  sizeBytes: number;
  state: State;
  fileId?: string;
  /** Why a file cannot be used (type, size, scan verdict, upload error). */
  message?: string;
  abort: AbortController;
}

const MB = 1024 * 1024;
let seq = 0;

export function AppealFiles({
  locale,
  rule,
  required,
  error,
  onChange,
}: {
  locale: Locale;
  rule: Rule;
  required: boolean;
  /** The API's message for `fileIds` (e.g. required). */
  error?: string;
  /** Ready file ids in the chosen order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const t = useT(locale);
  const api = useApi(locale);
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(new Set<AbortController>());
  const maxFiles = rule.maxFiles ?? Infinity;
  const extensions = rule.allowedExtensions.map((e) => e.toLowerCase());

  useEffect(() => {
    onChange(
      items.filter((i) => i.state === 'ready').map((i) => i.fileId!),
      items.some((i) => i.state === 'uploading' || i.state === 'processing'),
    );
  }, [items, onChange]);

  // Leaving the page stops the polling of unfinished uploads.
  useEffect(() => {
    const all = running.current;
    return () => all.forEach((a) => a.abort());
  }, []);

  const update = (key: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function start(item: Item, file: File) {
    const res = await uploadFile(
      api,
      {
        purpose: 'appeal_file',
        fileName: file.name,
        sizeBytes: file.size,
        contentType: declaredType(file.type),
        body: file,
      },
      { signal: item.abort.signal, onScanning: () => update(item.key, { state: 'processing' }) },
    );
    running.current.delete(item.abort);
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
        : { state: 'failed', fileId: res.file.id, message: res.file.rejectReason ?? undefined },
    );
  }

  function pick(list: FileList | null) {
    setNotice(undefined);
    const chosen = [...(list ?? [])];
    if (input.current) input.current.value = '';
    const used = items.filter((i) => i.state !== 'failed').length;
    if (used + chosen.length > maxFiles) {
      setNotice(t('t_validator_max_array', { max: maxFiles }));
      chosen.splice(Math.max(0, maxFiles - used));
    }
    const added = chosen.map((file) => {
      const item: Item = {
        key: (seq += 1),
        name: file.name,
        sizeBytes: file.size,
        state: 'uploading',
        abort: new AbortController(),
      };
      // Client pre-checks only (the API re-checks): no request for a file that cannot pass.
      if (!extensions.includes(fileExtension(file.name))) {
        Object.assign(item, {
          state: 'failed',
          message: t('t_selected_file_extension_is_not_allowed'),
        });
      } else if (rule.maxSizeMb !== null && file.size > rule.maxSizeMb * MB) {
        Object.assign(item, { state: 'failed', message: t('t_selected_file_size_big') });
      } else {
        running.current.add(item.abort);
        void start(item, file);
      }
      return item;
    });
    setItems((current) => [...current, ...added]);
  }

  function remove(item: Item) {
    item.abort.abort();
    setItems((list) => list.filter((i) => i.key !== item.key));
    // An unattached upload is the user's to delete; failures here change nothing for the appeal.
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  }

  const stateText = (i: Item) =>
    i.state === 'uploading'
      ? t('t_uploading')
      : i.state === 'processing'
        ? t('t_processing')
        : i.state === 'ready'
          ? '✓'
          : i.message;

  return (
    <div className="auth-field appeal-files">
      <label htmlFor="appeal-files">
        {t('t_attach_a_file')}
        {required && (
          <span className="appeal-files-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        ref={input}
        id="appeal-files"
        type="file"
        multiple={maxFiles > 1}
        accept={extensions.map((e) => `.${e}`).join(',')}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby="appeal-files-info"
        disabled={items.filter((i) => i.state !== 'failed').length >= maxFiles}
        onChange={(e) => pick(e.target.files)}
      />
      <p id="appeal-files-info" className="auth-muted appeal-files-info">
        {t('t_restrictions_files_allowed_info_explain', {
          size: rule.maxSizeMb,
          extensions: extensions.join(', '),
        })}
      </p>
      {notice && <Alert kind="error">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {items.length > 0 && (
        <ul className="appeal-files-list" aria-live="polite">
          {items.map((i) => (
            <li key={i.key} className="appeal-file" data-state={i.state} data-testid="appeal-file">
              <span className="appeal-file-name">{i.name}</span>
              <span className="auth-muted">
                {t('t_ui_file_size_mb', { size: (i.sizeBytes / MB).toFixed(1) })}
              </span>
              <span className="appeal-file-state">{stateText(i)}</span>
              <button type="button" className="auth-link-button" onClick={() => remove(i)}>
                {t('t_remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
