// RUN_INTEGRATION=1 must never migrate or test against the development database (QA P3 BUG-12d).
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { integrationDatabaseUrl } from './integration-db';

describe('integration database URL', () => {
  it('renames the development database to <name>_test', () => {
    expect(
      integrationDatabaseUrl({ DATABASE_URL: 'postgresql://mytask:pw@localhost:5432/mytask' }),
    ).toBe('postgresql://mytask:pw@localhost:5432/mytask_test');
  });

  it('keeps a database that is already a test database (CI)', () => {
    const url = 'postgresql://mytask:pw@localhost:5432/mytask_test?sslmode=disable';
    expect(integrationDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it('falls back to DATABASE_URL in the root .env', () => {
    const file = join(tmpdir(), `mytask-it-${process.pid}.env`);
    writeFileSync(file, 'DATABASE_URL=postgresql://mytask:pw@localhost:5432/mytask\n');
    expect(integrationDatabaseUrl({}, file)).toBe(
      'postgresql://mytask:pw@localhost:5432/mytask_test',
    );
  });

  it('refuses to run without any database URL', () => {
    expect(() => integrationDatabaseUrl({}, join(tmpdir(), 'missing.env'))).toThrow(/DATABASE_URL/);
  });
});
