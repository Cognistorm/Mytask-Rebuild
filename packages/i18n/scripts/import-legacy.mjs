// One-time (repeatable) import of the legacy UI strings into packages/i18n (ADR-006 §3, Phase 3).
// Reads legacy/APP/lang/{en,ka}/messages.php (read-only evidence, CLAUDE.md rule 3), converts `:param` to
// i18next `{{param}}`, and ADDS every legacy `t_*` key missing from en.json / ka.json. A value already in
// en.json / ka.json is never overwritten (the Owner refines them by hand), unless `--force` is passed.
// Also writes IMPORT-REPORT.md (duplicates, placeholders, HTML-bearing strings, gaps).
// Owner rule Q-031: keep every existing legacy English value.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const legacyLang = resolve(pkg, '../../legacy/APP/lang');

/** Minimal PHP tokenizer for `return [ 'key' => 'value', ... ];` files. */
function parsePhpArray(src, file) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
    } else if (c === '#') {
      while (i < n && src[i] !== '\n') i++;
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
    } else if (c === "'") {
      let s = '';
      i++;
      while (i < n && src[i] !== "'") {
        if (src[i] === '\\' && (src[i + 1] === "'" || src[i + 1] === '\\')) {
          s += src[i + 1];
          i += 2;
        } else s += src[i++];
      }
      i++;
      tokens.push({ t: 'str', v: s });
    } else if (c === '"') {
      let s = '';
      i++;
      const esc = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', $: '$' };
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\' && esc[src[i + 1]] !== undefined) {
          s += esc[src[i + 1]];
          i += 2;
        } else {
          if (src[i] === '$' && /[A-Za-z_{]/.test(src[i + 1] ?? '')) {
            throw new Error(
              `${file}: PHP variable interpolation is not supported near offset ${i}`,
            );
          }
          s += src[i++];
        }
      }
      i++;
      tokens.push({ t: 'str', v: s });
    } else if (c === '=' && src[i + 1] === '>') {
      tokens.push({ t: '=>' });
      i += 2;
    } else i++;
  }
  const entries = [];
  for (let k = 0; k + 2 < tokens.length; k++) {
    if (tokens[k].t === 'str' && tokens[k + 1].t === '=>' && tokens[k + 2].t === 'str') {
      entries.push([tokens[k].v, tokens[k + 2].v]);
      k += 2;
    }
  }
  return entries;
}

const PLACEHOLDER = /(?<![\w:/]):([A-Za-z_][A-Za-z0-9_]*)/g;
const HTML = /<\/?[a-zA-Z][^>]*>/;

function load(locale) {
  const file = join(legacyLang, locale, 'messages.php');
  const entries = parsePhpArray(readFileSync(file, 'utf8'), file);
  const out = {};
  const duplicates = [];
  const placeholders = [];
  const html = [];
  for (const [key, raw] of entries) {
    if (key in out) duplicates.push(key);
    const params = [...raw.matchAll(PLACEHOLDER)].map((m) => m[1]);
    const value = raw.replace(PLACEHOLDER, '{{$1}}').trim();
    if (params.length) placeholders.push([key, params]);
    if (HTML.test(value)) html.push(key);
    out[key] = value; // PHP semantics: the last duplicate wins
  }
  const sorted = Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((k) => [k, out[k]]),
  );
  return {
    entries: sorted,
    duplicates: [...new Set(duplicates)].sort(),
    placeholders: dedupe(placeholders),
    html: [...new Set(html)].sort(),
  };
}

function dedupe(pairs) {
  return [...new Map(pairs).entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const en = load('en');
const ka = load('ka');
const force = process.argv.includes('--force');
const merged = {};
for (const [locale, legacy] of [
  ['en', en.entries],
  ['ka', ka.entries],
]) {
  const path = join(pkg, `${locale}.json`);
  let current = {};
  try {
    current = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    current = {};
  }
  const kept = [];
  let added = 0;
  for (const [key, value] of Object.entries(legacy)) {
    if (!(key in current)) {
      current[key] = value;
      added++;
    } else if (current[key] !== value) {
      if (force) current[key] = value;
      else kept.push(key);
    }
  }
  const sorted = Object.fromEntries(
    Object.keys(current)
      .sort()
      .map((k) => [k, current[k]]),
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
  merged[locale] = { added, kept };
}

const enKeys = new Set(Object.keys(en.entries));
const kaKeys = new Set(Object.keys(ka.entries));
const missingInKa = [...enKeys].filter((k) => !kaKeys.has(k)).sort();
const missingInEn = [...kaKeys].filter((k) => !enKeys.has(k)).sort();
const paramMismatch = [];
const kaParams = new Map(ka.placeholders);
for (const [key, params] of en.placeholders) {
  if (!kaKeys.has(key)) continue;
  const a = [...new Set(params)].sort().join(',');
  const b = [...new Set(kaParams.get(key) ?? [])].sort().join(',');
  if (a !== b) paramMismatch.push(`${key}: en {${a}} / ka {${b}}`);
}

const nonStandardKeys = [...new Set([...enKeys, ...kaKeys])]
  .filter((k) => !/^t_[A-Za-z0-9_]+$/.test(k))
  .sort();
const emptyKa = [...kaKeys].filter((k) => !ka.entries[k].trim()).sort();

writeFileSync(
  join(pkg, 'legacy-gaps.json'),
  JSON.stringify(
    {
      onlyEn: missingInKa,
      onlyKa: missingInEn,
      placeholderMismatch: paramMismatch.map((x) => x.split(':')[0]),
      nonStandardKeys: nonStandardKeys,
      emptyKa: emptyKa,
    },
    null,
    2,
  ) + '\n',
);

const list = (items) => (items.length ? items.map((x) => `- \`${x}\``).join('\n') : '- none');
const report = `# Legacy UI string import report
GENERATED by \`pnpm i18n:import-legacy\` (packages/i18n/scripts/import-legacy.mjs). Source: \`legacy/APP/lang/{en,ka}/messages.php\` (repository copy; Q-031 notes production files may differ — re-run if the Owner provides the production \`lang/\` folder).

| | en | ka |
|---|---|---|
| keys imported | ${enKeys.size} | ${kaKeys.size} |
| duplicate keys in the PHP file (last value kept, as PHP does) | ${en.duplicates.length} | ${ka.duplicates.length} |
| strings with \`:param\` → \`{{param}}\` | ${en.placeholders.length} | ${ka.placeholders.length} |
| strings containing HTML (ADR-006 §3: to be replaced by components in their slice) | ${en.html.length} | ${ka.html.length} |

Not imported: \`lang/en/dashboard.php\` (legacy admin panel, English only) — handled with slice 16 (admin); \`lang/ka/validation.php\` (1 key) and \`lang/vendor/*\` (library strings).

Merge into en.json / ka.json: en added ${merged.en.added}, kept edited ${merged.en.kept.length}; ka added ${merged.ka.added}, kept edited ${merged.ka.kept.length}${force ? ' (--force: legacy values restored)' : ''}.

## Legacy keys outside the \`t_*\` pattern (${nonStandardKeys.length}; kept as-is)
${list(nonStandardKeys.map((k) => JSON.stringify(k)))}

## Legacy keys with an empty Georgian value (${emptyKa.length})
${list(emptyKa)}

## Keys only in English (${missingInKa.length}; Georgian fallback not possible — the client shows English)
${list(missingInKa)}

## Keys only in Georgian (${missingInEn.length}; English falls back to Georgian, Q-023/ADR-006 §6)
${list(missingInEn)}

## Placeholder differences between en and ka (${paramMismatch.length})
${list(paramMismatch)}

## Duplicate keys
- en: ${en.duplicates.map((k) => `\`${k}\``).join(', ') || 'none'}
- ka: ${ka.duplicates.map((k) => `\`${k}\``).join(', ') || 'none'}

## Strings containing HTML
- en: ${en.html.map((k) => `\`${k}\``).join(', ') || 'none'}
- ka: ${ka.html.map((k) => `\`${k}\``).join(', ') || 'none'}

## Converted placeholders (en)
${en.placeholders.map(([k, p]) => `- \`${k}\`: ${[...new Set(p)].map((x) => `{{${x}}}`).join(', ')}`).join('\n')}
`;
writeFileSync(join(pkg, 'IMPORT-REPORT.md'), report);
console.log(
  `i18n legacy import: en ${enKeys.size}, ka ${kaKeys.size}; only-en ${missingInKa.length}, only-ka ${missingInEn.length}; placeholder mismatches ${paramMismatch.length}`,
);
