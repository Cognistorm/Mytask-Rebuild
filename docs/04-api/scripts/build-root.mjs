#!/usr/bin/env node
// Generates src/openapi.root.yaml = src/openapi.base.yaml + `paths` and `components` $refs to every
// path/schema/parameter/response/header defined in src/paths, src/schemas and src/components.
// Group runs never edit the root: they only add keys to their own files, so parallel work cannot
// conflict. The script also enforces the ownership map (src/ownership.yaml):
//   - a path key must be owned (longest prefix match) by the group whose file defines it
//   - path keys and component names must be unique across files
//   - group schema names must start with one of the group's schemaPrefixes (optionally after "Admin")
// Usage: node scripts/build-root.mjs [--src <dir>]   (default: docs/04-api/src; group sandboxes pass .build/dN/src)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { ownerOfPath } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcArg = process.argv.indexOf('--src');
const src = srcArg > 0 ? path.resolve(process.argv[srcArg + 1]) : path.resolve(here, '..', 'src');
const read = (p) => YAML.parse(fs.readFileSync(p, 'utf8')) ?? {};

const errors = [];
const ownership = read(path.join(src, 'ownership.yaml'));
const base = read(path.join(src, 'openapi.base.yaml'));

// JSON pointer escaping + URI-encoding of braces (Redocly resolves `#/~1users~1%7BuserId%7D`).
const pointer = (key) =>
  '#/' + key.replace(/~/g, '~0').replace(/\//g, '~1').replace(/\{/g, '%7B').replace(/\}/g, '%7D');

// ── path ownership ───────────────────────────────────────────────
const ownerOf = ownerOfPath;
const groupByPathFile = Object.fromEntries(
  Object.entries(ownership.groups).map(([k, g]) => [g.pathFile, k]),
);
const groupBySchemaFile = Object.fromEntries(
  Object.entries(ownership.groups).filter(([, g]) => g.schemaFile).map(([k, g]) => [g.schemaFile, k]),
);

const paths = {};
const pathFiles = fs.readdirSync(path.join(src, 'paths')).filter((f) => f.endsWith('.yaml')).sort();
for (const file of pathFiles) {
  const group = groupByPathFile[file];
  if (!group) { errors.push(`paths/${file}: file is not listed in ownership.yaml`); continue; }
  const doc = read(path.join(src, 'paths', file));
  for (const key of Object.keys(doc)) {
    if (!key.startsWith('/')) { errors.push(`paths/${file}: top-level key "${key}" is not a path`); continue; }
    if (paths[key]) { errors.push(`path ${key} defined twice (paths/${file} and ${paths[key].file})`); continue; }
    const owner = ownerOf(key);
    if (owner !== group) errors.push(`paths/${file}: ${key} is owned by ${owner ?? 'nobody'} (ownership.yaml), not ${group}`);
    if (key !== key.replace(/\/+$/, '') && key !== '/') errors.push(`paths/${file}: ${key} has a trailing slash`);
    paths[key] = { file, ref: `paths/${file}${pointer(key)}` };
  }
}

// ── components ───────────────────────────────────────────────────
const reserved = new Set();
const components = { schemas: {}, parameters: {}, responses: {}, headers: {} };
const addAll = (kind, relFile, { group = null } = {}) => {
  const doc = read(path.join(src, relFile));
  for (const name of Object.keys(doc)) {
    if (name.startsWith('x-')) continue;
    if (components[kind][name]) { errors.push(`${kind} "${name}" defined twice (${relFile} and ${components[kind][name].file})`); continue; }
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) errors.push(`${relFile}: component name "${name}" must be PascalCase`);
    if (group) {
      const g = ownership.groups[group];
      const bare = name.startsWith('Admin') && name !== 'Admin' ? name.slice(5) : name;
      const ok = name === `${group}ErrorCode`
        || g.schemaPrefixes.some((p) => name.startsWith(p) || bare.startsWith(p));
      if (!ok) errors.push(`${relFile}: schema "${name}" does not start with a ${group} schemaPrefix (ownership.yaml)`);
      if (reserved.has(name)) errors.push(`${relFile}: schema "${name}" is reserved by components/schemas.yaml`);
    } else if (kind === 'schemas') reserved.add(name);
    components[kind][name] = { file: relFile, ref: `${relFile}#/${name}` };
  }
};
addAll('schemas', 'components/schemas.yaml');
addAll('parameters', 'components/parameters.yaml');
addAll('responses', 'components/responses.yaml');
addAll('headers', 'components/headers.yaml');
for (const file of fs.readdirSync(path.join(src, 'schemas')).filter((f) => f.endsWith('.yaml')).sort()) {
  const group = groupBySchemaFile[file];
  if (!group) { errors.push(`schemas/${file}: file is not listed in ownership.yaml`); continue; }
  addAll('schemas', `schemas/${file}`, { group });
}

if (errors.length) {
  console.error(`build-root: ${errors.length} error(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

// ── write root ───────────────────────────────────────────────────
const root = { ...base };
root.paths = {};
for (const key of Object.keys(paths).sort()) root.paths[key] = { $ref: paths[key].ref };
root.components = { ...(base.components ?? {}) };
for (const kind of ['schemas', 'parameters', 'responses', 'headers']) {
  root.components[kind] = {};
  for (const name of Object.keys(components[kind]).sort()) root.components[kind][name] = { $ref: components[kind][name].ref };
}
const header = '# GENERATED by scripts/build-root.mjs from src/openapi.base.yaml + src/paths + src/schemas + src/components.\n# Do not edit. Run `npm run build:root` (or `npm run lint` / `npm run bundle`) in docs/04-api.\n';
fs.writeFileSync(path.join(src, 'openapi.root.yaml'), header + YAML.stringify(root, { lineWidth: 0 }));
const count = (k) => Object.keys(components[k]).length;
console.log(`build-root: ${Object.keys(paths).length} paths from ${pathFiles.length} files; ${count('schemas')} schemas, ${count('parameters')} parameters, ${count('responses')} responses, ${count('headers')} headers -> ${path.relative(process.cwd(), path.join(src, 'openapi.root.yaml'))}`);
