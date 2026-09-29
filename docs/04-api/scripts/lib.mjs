// Shared helpers for the contract scripts (ownership map, spec AC index, YAML loading).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const srcDir = path.join(apiDir, 'src');
export const specsDir = path.resolve(apiDir, '..', '02-specs');
export const coverageDir = path.join(apiDir, 'coverage');

export const readYaml = (p) => YAML.parse(fs.readFileSync(p, 'utf8')) ?? {};
export const ownership = readYaml(path.join(srcDir, 'ownership.yaml'));

const prefixOwners = [];
for (const [group, g] of Object.entries(ownership.groups)) {
  for (const p of g.pathPrefixes ?? []) prefixOwners.push({ prefix: p, group });
}
prefixOwners.sort((a, b) => b.prefix.length - a.prefix.length);

/** Group owning a path (longest prefix match) or null. */
export function ownerOfPath(p) {
  const hit = prefixOwners.find(({ prefix }) => p === prefix || p.startsWith(prefix + '/'));
  return hit ? hit.group : null;
}

/** Group owning a schema name by its prefix (longest match, "Admin" stripped), or 'shared'/null. */
export function ownerOfSchema(name, sharedNames) {
  if (sharedNames?.has(name)) return 'shared';
  const m = name.match(/^(D[1-6])ErrorCode$/);
  if (m) return m[1];
  const bare = name.startsWith('Admin') ? name.slice(5) : name;
  let best = null;
  for (const [group, g] of Object.entries(ownership.groups)) {
    for (const p of g.schemaPrefixes ?? []) {
      if ((name.startsWith(p) || bare.startsWith(p)) && (!best || p.length > best.len)) best = { group, len: p.length };
    }
  }
  return best ? best.group : null;
}

/** Group owning a spec number ('00'…'17'). */
export function ownerOfSpec(num) {
  for (const [group, g] of Object.entries(ownership.groups)) if ((g.specs ?? []).includes(num)) return group;
  return null;
}

/**
 * Index of every acceptance criterion: { '06': { file, title, acs: Map('AC-7' -> first line) } }.
 * An AC is a list item "- AC-n …" inside the "## Acceptance criteria" section.
 */
export function loadSpecs() {
  const out = {};
  for (const file of fs.readdirSync(specsDir).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort()) {
    const num = file.slice(0, 2);
    const text = fs.readFileSync(path.join(specsDir, file), 'utf8');
    const title = (text.match(/^# (.*)$/m) ?? [, file])[1];
    const acs = new Map();
    let inAc = false;
    for (const line of text.split(/\r?\n/)) {
      if (/^## /.test(line)) inAc = /^## Acceptance criteria/.test(line);
      if (!inAc) continue;
      const m = line.match(/^\s*[-*]\s+\**(AC-\d+)\**\b(.*)$/);
      if (m && !acs.has(m[1])) acs.set(m[1], m[2].trim());
    }
    out[num] = { file, title, acs };
  }
  return out;
}

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Iterate operations of a bundled document. */
export function* operations(doc) {
  for (const [p, item] of Object.entries(doc.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (item[method]) yield { path: p, method, op: item[method], item };
    }
  }
}

export function reporter() {
  const errors = [];
  const warnings = [];
  return {
    error: (m) => errors.push(m),
    warn: (m) => warnings.push(m),
    finish(label) {
      for (const w of warnings) console.log(`  warning: ${w}`);
      for (const e of errors) console.log(`  ERROR:   ${e}`);
      console.log(`${label}: ${errors.length} error(s), ${warnings.length} warning(s)`);
      return errors.length;
    },
  };
}

export function parseArgs(argv) {
  const args = { final: false, group: null, positional: [], markdown: null, bundle: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--final') args.final = true;
    else if (a === '--group') args.group = argv[++i]?.toUpperCase();
    else if (a === '--markdown') args.markdown = argv[++i];
    else if (a === '--bundle') args.bundle = argv[++i];
    else args.positional.push(a);
  }
  return args;
}
