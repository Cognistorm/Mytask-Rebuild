import { describe, expect, it } from 'vitest';
import { createApiClient, MissingIdempotencyKeyError } from '../src/index';
import { moneyOperations } from '../src/generated/operations';

function recorder() {
  const requests: Request[] = [];
  const fetch = async (input: Request) => {
    requests.push(input);
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { requests, fetch: fetch as unknown as typeof globalThis.fetch };
}

describe('createApiClient', () => {
  it('sends the cross-cutting headers and returns the typed body', async () => {
    const { requests, fetch } = recorder();
    const api = createApiClient({
      baseUrl: 'http://api.test/api/v1',
      client: 'ios',
      locale: 'en',
      getAccessToken: () => 'tok',
      headers: { 'X-Extra': '1' },
      fetch,
    });
    const { data } = await api.GET('/health');
    expect(data?.status).toBe('ok');
    const req = requests[0]!;
    expect(new URL(req.url).pathname).toBe('/api/v1/health');
    expect(req.headers.get('Accept-Language')).toBe('en');
    expect(req.headers.get('X-MyTask-Client')).toBe('ios');
    expect(req.headers.get('Authorization')).toBe('Bearer tok');
    expect(req.headers.get('X-Extra')).toBe('1');
  });

  it('defaults Accept-Language to ka and sends no Authorization without a token', async () => {
    const { requests, fetch } = recorder();
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    await api.GET('/health');
    expect(requests[0]!.headers.get('Accept-Language')).toBe('ka');
    expect(requests[0]!.headers.get('Authorization')).toBeNull();
    expect(requests[0]!.headers.get('X-MyTask-Client')).toBeNull();
  });

  it('refuses a money operation without Idempotency-Key and allows it with one', async () => {
    const entry = Object.entries(moneyOperations).find(([k]) => k.startsWith('POST '));
    expect(entry, 'the contract has POST money operations').toBeDefined();
    const path = entry![0].slice('POST '.length).replace(/\{[^/]+\}/g, '1');
    const { requests, fetch } = recorder();
    const api = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch });
    // Untyped on purpose: the generated types already demand the header; this checks the runtime guard.
    const untyped = api as unknown as {
      POST: (p: string, o: object) => Promise<unknown>;
    };
    await expect(untyped.POST(path, { body: {} })).rejects.toBeInstanceOf(
      MissingIdempotencyKeyError,
    );
    await untyped.POST(path, { body: {}, headers: { 'Idempotency-Key': 'k-1' } });
    expect(requests.at(-1)!.headers.get('Idempotency-Key')).toBe('k-1');
  });
});
