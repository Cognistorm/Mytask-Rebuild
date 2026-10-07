import { describe, expect, it } from 'vitest';
import { createApiClient, declaredType, fileExtension, uploadFile } from '../src/index';

const FILE_ID = '01900000-0000-7000-8000-0000000000f1';
const file = (status: string) => ({
  id: FILE_ID,
  purpose: 'appeal_file',
  status,
  fileName: 'proof.pdf',
  contentType: 'application/pdf',
  sizeBytes: 3,
  rejectReason:
    status === 'rejected' ? 'The file was rejected because it may contain a virus' : null,
  image: null,
  createdAt: '2026-10-02T10:00:00.000Z',
  readyAt: null,
});

/** A fake API + storage: answers in order, records every request. */
function fake(opts: { storageStatus?: number; polls?: string[]; slotError?: boolean } = {}) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const polls = [...(opts.polls ?? ['ready'])];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetch = async (input: Request | string, init?: RequestInit) => {
    const req = typeof input === 'string' ? new Request(input, init) : input;
    const url = new URL(req.url);
    calls.push({ method: req.method, url: url.pathname, body: init?.body ?? undefined });
    if (url.host === 'storage.test')
      return new Response(null, { status: opts.storageStatus ?? 204 });
    if (url.pathname === '/api/v1/files' && req.method === 'POST') {
      if (opts.slotError)
        return json(422, {
          code: 'FILE_TOO_LARGE',
          message: 'The selected file size is too large',
        });
      return json(201, {
        file: file('pending'),
        upload: {
          url: 'http://storage.test/private',
          method: 'POST',
          fields: { key: 'quarantine/x', Policy: 'p' },
          expiresAt: '2026-10-02T10:15:00.000Z',
        },
      });
    }
    if (url.pathname.endsWith('/complete')) return json(202, file('scanning'));
    return json(200, file(polls.shift() ?? 'ready'));
  };
  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
}

const input = {
  purpose: 'appeal_file' as const,
  fileName: 'proof.pdf',
  sizeBytes: 3,
  contentType: 'application/pdf',
  body: new Blob(['abc']),
};

describe('uploadFile (ADR-009 §3)', () => {
  it('creates the slot, posts fields then file to storage, completes and polls until ready', async () => {
    const { calls, fetch } = fake({ polls: ['scanning', 'ready'] });
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    let scanning = 0;
    const res = await uploadFile(api, input, {
      fetch,
      pollMs: 1,
      onScanning: () => (scanning += 1),
    });
    expect(res.file?.status).toBe('ready');
    expect(scanning).toBe(1);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /api/v1/files',
      'POST /private',
      `POST /api/v1/files/${FILE_ID}/complete`,
      `GET /api/v1/files/${FILE_ID}`,
      `GET /api/v1/files/${FILE_ID}`,
    ]);
    const form = calls[1]!.body as FormData;
    expect([...(form as unknown as { keys(): Iterable<string> }).keys()]).toEqual([
      'key',
      'Policy',
      'file',
    ]);
  });

  it('returns a rejected file as a result (the screen shows rejectReason)', async () => {
    const { fetch } = fake({ polls: ['rejected'] });
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    const res = await uploadFile(api, input, { fetch, pollMs: 1 });
    expect(res.file?.rejectReason).toMatch(/virus/);
  });

  it('passes API refusals through and reports storage failures with the file id', async () => {
    const refused = fake({ slotError: true });
    const api1 = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch: refused.fetch });
    expect((await uploadFile(api1, input, { fetch: refused.fetch })).error?.code).toBe(
      'FILE_TOO_LARGE',
    );
    const broken = fake({ storageStatus: 403 });
    const api2 = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch: broken.fetch });
    expect((await uploadFile(api2, input, { fetch: broken.fetch })).error).toEqual({
      code: 'UPLOAD_FAILED',
      fileId: FILE_ID,
    });
  });

  it('reports upload progress through XMLHttpRequest when asked to', async () => {
    const { calls, fetch } = fake();
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    const sent: string[] = [];
    class FakeXhr {
      upload: { onprogress?: (e: Partial<ProgressEvent>) => void } = {};
      status = 0;
      onload?: () => void;
      open(method: string, url: string) {
        sent.push(`${method} ${new URL(url).pathname}`);
      }
      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
        this.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 4 });
        this.status = 204;
        this.onload?.();
      }
      abort() {}
    }
    const original = globalThis.XMLHttpRequest;
    globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
    try {
      const progress: number[] = [];
      const res = await uploadFile(api, input, { pollMs: 1, onProgress: (f) => progress.push(f) });
      expect(res.file?.status).toBe('ready');
      expect(progress).toEqual([0.25, 1]);
      expect(sent).toEqual(['POST /private']);
      // The storage POST did not go through fetch.
      expect(calls.some((c) => c.url === '/private')).toBe(false);
    } finally {
      globalThis.XMLHttpRequest = original;
    }
  });

  it('stops waiting at the timeout', async () => {
    const { fetch } = fake({ polls: Array(50).fill('scanning') });
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    const res = await uploadFile(api, input, { fetch, pollMs: 1, timeoutMs: 5 });
    expect(res.error).toEqual({ code: 'UPLOAD_TIMEOUT', fileId: FILE_ID });
  });
});

describe('file name helpers', () => {
  it('reads the extension like the API and falls back to octet-stream', () => {
    expect(fileExtension('Proof.Final.MKV')).toBe('mkv');
    expect(fileExtension('.env')).toBe('');
    expect(declaredType('')).toBe('application/octet-stream');
    expect(declaredType('video/mp4')).toBe('video/mp4');
  });
});
