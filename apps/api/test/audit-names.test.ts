// SEC-59 / I-3: every audit action the API writes is an `x-audit` name of the contract, so an investigation
// that filters by the contract names finds every row. Side effects without an operation of their own are
// listed here with the operation that causes them.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIDE_EFFECTS: Record<string, string> = {
  'ip_ban.auto': 'adminLogin / adminVerifyTwoFactor at S-064 failures (spec 01 AC-51)',
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'generated') return [];
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('audit action names (SEC-59)', () => {
  const contract = readFileSync(join(__dirname, '../../../docs/04-api/openapi.yaml'), 'utf8');
  const declared = new Set([...contract.matchAll(/^\s+x-audit: ([\w.]+)\s*$/gm)].map((m) => m[1]!));
  const written = new Map<string, string>();
  for (const file of files(join(__dirname, '../src'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\baction:\s*([^,]+),/g)) {
      for (const name of m[1]!.matchAll(/'([a-z_]+(?:\.[a-z_]+)+)'/g)) written.set(name[1]!, file);
    }
  }

  it('finds the audit writes', () => {
    expect(written.size).toBeGreaterThanOrEqual(10);
  });

  it.each([...new Set([...written.keys()])])('%s is a contract x-audit name', (name) => {
    expect(declared.has(name) || name in SIDE_EFFECTS, `${name} in ${written.get(name)}`).toBe(
      true,
    );
  });

  it('writes the slice 01 staff names of the contract', () => {
    for (const name of [
      'staff.login',
      'staff.logout',
      'staff.reauth',
      'setting.update',
      'ip_ban.create',
      'ip_ban.delete',
    ])
      expect(written.has(name), name).toBe(true);
  });
});
