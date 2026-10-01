#!/usr/bin/env node
// Checks docs/04-api/coverage/*.md against the specs (every AC) and the bundled contract
// (every named operation exists; x-covers agrees). Format: CONVENTIONS.md §12.
// Usage: node scripts/check-coverage.mjs [--group D3] [--final] [--markdown out.md] [--bundle file]
//   --group Dn   only the coverage files of Dn (its specs + coverage/16-dn.md)
//   --final      integration mode: every AC of every spec needs a non-DELEGATED row somewhere,
//                missing files are errors, DELEGATED operation names must exist
//   --markdown   write the merged summary table (for docs/04-api/README.md) to this file
import fs from 'node:fs';
import path from 'node:path';
import { apiDir, coverageDir, readYaml, ownership, ownerOfSpec, ownerOfPath, loadSpecs, operations, reporter, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const specs = loadSpecs();
const doc = readYaml(args.bundle ? path.resolve(args.bundle) : path.join(apiDir, 'openapi.yaml'));
const r = reporter();
const strict = (m) => (args.final ? r.error(m) : r.warn(m));

const ops = new Map();
for (const { path: p, method, op } of operations(doc)) ops.set(op.operationId, { path: p, method, group: ownerOfPath(p), covers: new Set(op['x-covers'] ?? []) });

const KIND = /^(API|API\+JOB|NOT-API:(ui|job|email|infra|migration|policy|content)|DELEGATED:(D[1-6]))$/;

// Sandbox (--group) runs contain only one group's paths. Operations of other groups that coverage rows
// name (after the integration run many rows do) are looked up in the integrated bundle instead; the
// full cross-check happens in `verify:final`.
const integrated = new Set();
if (args.group && args.bundle && fs.existsSync(path.join(apiDir, 'openapi.yaml'))) {
  for (const { op } of operations(readYaml(path.join(apiDir, 'openapi.yaml')))) integrated.add(op.operationId);
}

// expected files: <spec>.md by the owner; 16-<dn>.md by each delegate group
const expected = [];
for (const num of Object.keys(specs).sort()) expected.push({ file: `${num}.md`, spec: num, group: ownerOfSpec(num) });
for (const [group, acs] of Object.entries(ownership.spec16Delegations ?? {})) {
  expected.push({ file: `16-${group.toLowerCase()}.md`, spec: '16', group, only: new Set(acs.map((n) => `AC-${n}`)) });
}

const rowsBySpec = {}; // spec -> [{ac, kind, ops, file}]
const filesPresent = new Set();
for (const e of expected) {
  if (args.group && e.group !== args.group) continue;
  const fp = path.join(coverageDir, e.file);
  if (!fs.existsSync(fp)) { strict(`coverage/${e.file} missing (${e.group}, spec ${e.spec})`); continue; }
  filesPresent.add(e.file);
  const seen = new Set();
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    const m = line.match(/^\|\s*(AC-\d+[a-z]?)\s*\|([^|]*)\|\s*([^|]+?)\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const [, ac, , kindRaw, refs] = m;
    const where = `coverage/${e.file}:${i + 1} ${ac}`;
    const kind = kindRaw.replace(/\s+/g, '');
    if (!specs[e.spec].acs.has(ac)) { r.error(`${where}: spec ${e.spec} has no ${ac}`); continue; }
    if (e.only && !e.only.has(ac)) r.error(`${where}: ${ac} is not delegated to ${e.group} (ownership.yaml spec16Delegations)`);
    if (seen.has(ac)) r.error(`${where}: duplicate row`);
    seen.add(ac);
    if (!KIND.test(kind)) { r.error(`${where}: coverage "${kindRaw}" must be API | API+JOB | NOT-API:<ui|job|email|infra|migration|policy|content> | DELEGATED:Dn`); continue; }
    const names = [...refs.matchAll(/`([a-z][A-Za-z0-9]+)`/g)].map((x) => x[1]);
    const isApi = kind.startsWith('API');
    if (isApi && names.length === 0) r.error(`${where}: API rows name at least one operationId in backticks`);
    if (kind.startsWith('NOT-API') && refs.trim().length < 8) r.error(`${where}: NOT-API rows give a reason`);
    for (const n of names) {
      const op = ops.get(n);
      const reservedOwner = ownership.reservedOperations[n]?.group;
      if (!op) {
        if (kind.startsWith('DELEGATED') || (reservedOwner && reservedOwner !== e.group)) strict(`${where}: operation ${n} not in the bundle yet (${reservedOwner ?? kind})`);
        else if (integrated.has(n)) r.warn(`${where}: operation ${n} belongs to another group (present in the integrated openapi.yaml; checked by verify:final)`);
        else r.error(`${where}: operation ${n} does not exist in openapi.yaml`);
        continue;
      }
      if (isApi && !op.covers.has(`${e.spec} ${ac}`)) {
        const msg = `${where}: ${n} (${op.group}) does not list "${e.spec} ${ac}" in x-covers`;
        if (op.group === e.group) r.error(msg); else strict(msg);
      }
    }
    (rowsBySpec[e.spec] ??= []).push({ ac, kind, names, file: e.file });
  }
}

// completeness per spec
const summary = [];
for (const [num, s] of Object.entries(specs).sort(([a], [b]) => a.localeCompare(b))) {
  const owner = ownerOfSpec(num);
  if (args.group && owner !== args.group && !(num === '16' && ownership.spec16Delegations[args.group])) continue;
  const rows = rowsBySpec[num] ?? [];
  const counts = { API: 0, 'NOT-API': 0, DELEGATED: 0, missing: 0 };
  for (const ac of s.acs.keys()) {
    const acRows = rows.filter((x) => x.ac === ac);
    const direct = acRows.filter((x) => !x.kind.startsWith('DELEGATED'));
    if (acRows.length === 0) {
      counts.missing++;
      // per-AC noise only once the spec's own coverage file exists (the missing file is reported above)
      if ((!args.group || owner === args.group) && (args.final || filesPresent.has(`${num}.md`))) strict(`spec ${num} ${ac}: no coverage row`);
    } else if (direct.length === 0) {
      counts.DELEGATED++;
      if (args.final) r.error(`spec ${num} ${ac}: only DELEGATED rows; the delegate must add the real row`);
    } else if (direct.some((x) => x.kind.startsWith('API'))) counts.API++;
    else counts['NOT-API']++;
  }
  summary.push({ num, title: s.title.replace(/^\d{2}\s*—\s*/, ''), owner, total: s.acs.size, ...counts });
}

// reverse check: x-covers entries of a group's ops appear in that spec's coverage rows
for (const [id, op] of ops) {
  if (args.group && op.group !== args.group) continue;
  for (const c of op.covers) {
    const [num, ac] = c.split(' ');
    if (!rowsBySpec[num]) continue; // spec coverage not written yet
    if (!rowsBySpec[num].some((x) => x.ac === ac && x.names.includes(id))) r.warn(`${id}: x-covers "${c}" but coverage/${num}*.md does not name ${id} for ${ac}`);
  }
}

const failed = r.finish(`check-coverage${args.group ? ' --group ' + args.group : ''}${args.final ? ' --final' : ''}`);
console.log('\nspec | owner | ACs | API | NOT-API | DELEGATED | missing');
for (const x of summary) console.log(`${x.num} | ${x.owner} | ${x.total} | ${x.API} | ${x['NOT-API']} | ${x.DELEGATED} | ${x.missing}`);
const tot = summary.reduce((a, x) => ({ total: a.total + x.total, API: a.API + x.API, na: a.na + x['NOT-API'], d: a.d + x.DELEGATED, m: a.m + x.missing }), { total: 0, API: 0, na: 0, d: 0, m: 0 });
console.log(`all | - | ${tot.total} | ${tot.API} | ${tot.na} | ${tot.d} | ${tot.m}\n`);

if (args.markdown) {
  const md = ['| Spec | Title | Owner | ACs | API | Not API | Delegated (open) | Missing | Detail |', '|---|---|---|---|---|---|---|---|---|'];
  for (const x of summary) md.push(`| ${x.num} | ${x.title} | ${x.owner} | ${x.total} | ${x.API} | ${x['NOT-API']} | ${x.DELEGATED} | ${x.missing} | [coverage/${x.num}.md](coverage/${x.num}.md) |`);
  md.push(`| **All** | | | **${tot.total}** | **${tot.API}** | **${tot.na}** | **${tot.d}** | **${tot.m}** | |`);
  fs.writeFileSync(path.resolve(args.markdown), md.join('\n') + '\n');
  console.log(`summary written to ${args.markdown}`);
}

process.exit(failed ? 1 : 0);
