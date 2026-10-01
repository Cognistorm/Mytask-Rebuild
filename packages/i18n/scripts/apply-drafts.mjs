// Applies translations/*-ka-drafts.json to ka.json: fills missing or empty Georgian values only.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const pkg = resolve(import.meta.dirname, '..');
const ka = JSON.parse(readFileSync(join(pkg, 'ka.json'), 'utf8'));
let n = 0;
for (const f of readdirSync(join(pkg, 'translations')).filter((x) =>
  x.endsWith('-ka-drafts.json'),
)) {
  const drafts = JSON.parse(readFileSync(join(pkg, 'translations', f), 'utf8'));
  for (const [key, value] of Object.entries(drafts)) {
    if (key.startsWith('_')) continue;
    if (!(key in ka) || !String(ka[key]).trim()) {
      ka[key] = value;
      n++;
    }
  }
}
const sorted = Object.fromEntries(
  Object.keys(ka)
    .sort()
    .map((k) => [k, ka[k]]),
);
writeFileSync(join(pkg, 'ka.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(`ka drafts applied: ${n}`);
