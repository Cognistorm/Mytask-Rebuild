// The upload protocol of ADR-009 §3, the same on web and mobile: createFileUpload → direct POST of the bytes
// to storage with the presigned fields → completeFileUpload → poll getFile until the worker's verdict.
// Transport only: which purpose, limits and messages to show stay with the screens.
import type { components } from '@mytask/types';
import type { ApiClient } from './index';

type S = components['schemas'];

/** The bytes to send: a `Blob`/`File` in browsers, `{ uri, name, type }` in React Native. */
export type UploadBody = Blob | { uri: string; name: string; type: string };

export interface UploadInput {
  purpose: S['FilePurpose'];
  fileName: string;
  sizeBytes: number;
  contentType: string;
  body: UploadBody;
}

export interface UploadOptions {
  /** Called when the bytes are stored and the scan runs (screens show "processing"). */
  onScanning?: (file: S['File']) => void;
  /** Delay between `getFile` polls (default 1.5 s). */
  pollMs?: number;
  /** Give up waiting for the scan after this long (default 5 min; 100 MB videos take a while). */
  timeoutMs?: number;
  /** For the storage POST; defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Stops the upload and the polling (e.g. the user removed the file or left the screen). */
  signal?: AbortSignal;
  /**
   * Share of the bytes sent to storage (0…1). `fetch` cannot report upload progress, so with this callback (and
   * no `fetch` option) the storage POST goes through `XMLHttpRequest` where it exists (browsers, React Native).
   */
  onProgress?: (fraction: number) => void;
  /** Staff upload (admin app): the same flow on `/admin/files` (adminCreateFileUpload, …Complete, adminGetFile). */
  staff?: boolean;
}

/** API errors as the API sends them; `UPLOAD_FAILED` / `UPLOAD_TIMEOUT` are this helper's own. */
export interface UploadError {
  code: string;
  message?: string;
  details?: unknown;
  /** Set once the file row exists, so the screen can delete it. */
  fileId?: string;
}

/** `file.status` is `ready` or `rejected` (`rejectReason` translated by the API). */
export type UploadResult =
  { file: S['File']; error?: never } | { file?: never; error: UploadError };

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

export async function uploadFile(
  api: ApiClient,
  input: UploadInput,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { body, ...request } = input;
  const staff = options.staff === true;
  const slot = staff
    ? await api.POST('/admin/files', { body: request })
    : await api.POST('/files', { body: request });
  if (slot.error) return { error: slot.error as UploadError };
  const fileId = slot.data.file.id;

  // S3 POST policy: the fields first, the file last.
  const form = new FormData();
  for (const [k, v] of Object.entries(slot.data.upload.fields)) form.append(k, v);
  form.append('file', body as Blob);
  const stored = await postToStorage(slot.data.upload.url, form, options);
  if (!stored) return { error: { code: 'UPLOAD_FAILED', fileId } };

  const path = { params: { path: { fileId } } };
  const done = staff
    ? await api.POST('/admin/files/{fileId}/complete', path)
    : await api.POST('/files/{fileId}/complete', path);
  if (done.error) return { error: { ...(done.error as UploadError), fileId } };
  let file = done.data;
  if (file.status === 'scanning') options.onScanning?.(file);

  const until = Date.now() + (options.timeoutMs ?? 5 * 60_000);
  while (file.status === 'scanning' || file.status === 'pending') {
    if (options.signal?.aborted || Date.now() > until) {
      return { error: { code: 'UPLOAD_TIMEOUT', fileId } };
    }
    await sleep(options.pollMs ?? 1500, options.signal);
    const next = staff
      ? await api.GET('/admin/files/{fileId}', path)
      : await api.GET('/files/{fileId}', path);
    if (next.error) return { error: { ...(next.error as UploadError), fileId } };
    file = next.data;
  }
  return { file };
}

/** The direct storage POST; true when storage accepted the bytes. */
async function postToStorage(
  url: string,
  form: FormData,
  options: UploadOptions,
): Promise<boolean> {
  const { onProgress, signal } = options;
  if (onProgress && !options.fetch && typeof XMLHttpRequest !== 'undefined') {
    return new Promise<boolean>((resolve) => {
      if (signal?.aborted) return resolve(false);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = xhr.onabort = xhr.ontimeout = () => resolve(false);
      signal?.addEventListener('abort', () => xhr.abort());
      xhr.send(form);
    });
  }
  try {
    const res = await (options.fetch ?? globalThis.fetch)(url, {
      method: 'POST',
      body: form,
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Lower-case extension without the dot; '' when there is none (same rule as the API). */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/**
 * The content type to declare: the one the system reports, or `application/octet-stream` when it reports none
 * (common for doc/docx/mkv/avi on Windows and Android; the API accepts it for those types).
 */
export function declaredType(reported: string | null | undefined): string {
  return reported?.trim() || 'application/octet-stream';
}
