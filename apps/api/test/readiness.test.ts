import { describe, expect, it } from 'vitest';
import { runChecks } from '../src/platform/health/readiness';

describe('readiness checks', () => {
  it('is ready only when every check passes and never exposes error text', async () => {
    const out = await runChecks([
      { name: 'database', run: async () => undefined },
      {
        name: 'redis',
        run: async () => {
          throw new Error('connect ECONNREFUSED redis://:secret@x');
        },
      },
    ]);
    expect(out).toEqual({ ready: false, checks: { database: 'ok', redis: 'fail' } });
  });

  it('fails a check that hangs', async () => {
    const out = await runChecks([{ name: 'slow', run: () => new Promise(() => undefined) }], 50);
    expect(out.checks.slow).toBe('fail');
  });
});
