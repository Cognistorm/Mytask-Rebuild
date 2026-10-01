// The settings registry against the contract (ADR-005 §1, §9): every register row a `PublicConfig` field cites
// exists with its approved default and is marked public; secret rows never are.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { settingsRegistry, type SettingId } from '../src/platform/settings/registry';

const contract = readFileSync(resolve(__dirname, '../../../docs/04-api/openapi.yaml'), 'utf8');

/** Register ids cited in the PublicConfig schemas, with "S-077…S-099" ranges expanded. */
function publicConfigIds(): string[] {
  const start = contract.indexOf('\n    PublicConfig:\n');
  const end = contract.indexOf('\n    PublicConfigWebCustomCode:\n');
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const text = contract.slice(start, end);
  const ids = new Set<number>();
  for (const [, a, b] of text.matchAll(/S-(\d{3})(?:…S-(\d{3}))?/g)) {
    const from = Number(a);
    for (let n = from; n <= Number(b ?? a); n++) ids.add(n);
  }
  return [...ids].sort((x, y) => x - y).map((n) => `S-${String(n).padStart(3, '0')}`);
}

const rows = settingsRegistry as Record<string, (typeof settingsRegistry)[SettingId]>;
const flag = (id: string, name: 'public' | 'socialProvider') =>
  !!(rows[id] as unknown as Record<string, unknown> | undefined)?.[name];

describe('settings registry', () => {
  it('has a row for every register id the PublicConfig schema cites', () => {
    const ids = publicConfigIds();
    expect(ids.length).toBeGreaterThan(70);
    expect(ids.filter((id) => !(id in rows))).toEqual([]);
  });

  it('marks those rows public, except the secret social-login rows', () => {
    const cited = publicConfigIds();
    for (const id of cited) {
      expect(flag(id, 'public'), id).toBe(!flag(id, 'socialProvider'));
    }
    // and nothing outside PublicConfig is public
    const extra = Object.keys(rows).filter((id) => flag(id, 'public') && !cited.includes(id));
    expect(extra).toEqual([]);
  });

  it('has unique keys and ids matching the register format', () => {
    const keys = Object.values(rows).map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const id of Object.keys(rows)) expect(id).toMatch(/^S-\d{3}$/);
  });

  it('stores money as integer tetri and accepts null only on nullable rows', () => {
    for (const [id, m] of Object.entries(rows)) {
      if (m.type === 'money') {
        const v = m.default as { amount: number; currency: string };
        expect(Number.isInteger(v.amount), id).toBe(true);
        expect(v.currency, id).toBe('GEL');
      }
      if (m.default === null) expect('nullable' in m && m.nullable, id).toBe(true);
    }
  });

  it('uses the approved spec 00 launch values', () => {
    const d = (id: SettingId) => settingsRegistry[id].default;
    expect(d('S-001')).toBe(1);
    expect(d('S-002')).toBeNull();
    expect(d('S-008')).toEqual({ amount: 999, currency: 'GEL' });
    expect(d('S-009')).toEqual({ amount: 9999, currency: 'GEL' });
    expect(d('S-024')).toEqual({ amount: 90_000_000, currency: 'GEL' });
    expect(d('S-025')).toBe(true);
    expect(d('S-026')).toBe(72);
    expect(d('S-027')).toBe(48);
    expect(d('S-029')).toBe(false);
    expect(d('S-031')).toEqual({ amount: 1000, currency: 'GEL' });
    expect(d('S-034')).toBe(true);
    expect(d('S-092')).toBe(100);
    expect(d('S-103')).toBe('ka');
    expect(d('S-107')).toBe(false);
    expect(d('S-121')).toEqual({ enabled: false, headline: null, message: null });
  });
});
