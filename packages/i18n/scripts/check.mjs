// CI check for packages/i18n (CLAUDE.md i18n rules, Q-058). Fails when:
// - a key is not `t_*`, a value is not a string, or keys are not sorted;
// - a key exists in only one language, or its Georgian value is empty
//   (except the legacy gaps recorded by the import in legacy-gaps.json);
// - i18next `{{placeholders}}` differ between en and ka (except legacy mismatches in legacy-gaps.json).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(pkg, f), 'utf8'));
const en = read('en.json');
const ka = read('ka.json');
const gaps = read('legacy-gaps.json');
const onlyEn = new Set(gaps.onlyEn);
const onlyKa = new Set(gaps.onlyKa);
const legacyMismatch = new Set(gaps.placeholderMismatch);
const nonStandard = new Set(gaps.nonStandardKeys);
const emptyKa = new Set(gaps.emptyKa);
const errors = [];

for (const [name, dict] of [
  ['en.json', en],
  ['ka.json', ka],
]) {
  const keys = Object.keys(dict);
  if (keys.join('\n') !== [...keys].sort().join('\n')) {
    errors.push(`${name}: keys are not sorted (run pnpm i18n:import-legacy to re-sort)`);
  }
  for (const k of keys) {
    if (!nonStandard.has(k) && !/^t_[A-Za-z0-9_]+$/.test(k))
      errors.push(`${name}: key ${k} does not match t_*`);
    if (typeof dict[k] !== 'string') errors.push(`${name}: ${k} is not a string`);
  }
}
for (const k of Object.keys(en)) {
  if (onlyEn.has(k)) continue;
  if (!(k in ka)) errors.push(`ka.json: missing ${k} (fill the Georgian value, Q-058)`);
  else if (!ka[k].trim() && !emptyKa.has(k)) errors.push(`ka.json: ${k} is empty`);
}
for (const k of Object.keys(ka)) {
  if (!onlyKa.has(k) && !(k in en))
    errors.push(`en.json: missing ${k} (English value first, Q-058)`);
}
const params = (s) =>
  [...new Set([...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]))].sort().join(',');
for (const k of Object.keys(en)) {
  if (k in ka && !legacyMismatch.has(k) && params(en[k]) !== params(ka[k])) {
    errors.push(`${k}: placeholders differ (en {${params(en[k])}} / ka {${params(ka[k])}})`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `i18n: ${e}`).join('\n'));
  process.exit(1);
}
console.log(`i18n: OK (en ${Object.keys(en).length} keys, ka ${Object.keys(ka).length} keys)`);
