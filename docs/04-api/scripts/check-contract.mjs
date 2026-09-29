#!/usr/bin/env node
// Project rules Redocly cannot express (CONVENTIONS.md). Runs on the BUNDLED contract.
// Usage: node scripts/check-contract.mjs [openapi.yaml] [--group D3] [--final]
//   --group Dn  only report problems of operations/schemas/events owned by Dn (plus shared ones)
//   --final     integration mode: stubs, missing reserved operations and unknown events are errors
import fs from 'node:fs';
import path from 'node:path';
import {
  apiDir, srcDir, readYaml, ownership, ownerOfPath, ownerOfSchema, loadSpecs, operations, reporter, parseArgs,
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const file = path.resolve(apiDir, args.positional[0] ?? 'openapi.yaml');
const doc = readYaml(file);
const specs = loadSpecs();
const r = reporter();
const strict = (m) => (args.final ? r.error(m) : r.warn(m));
const mine = (group) => !args.group || group === args.group || group === 'shared' || group === 'F0';

const sharedNames = new Set(Object.keys(readYaml(path.join(srcDir, 'components', 'schemas.yaml'))));
const schemas = doc.components?.schemas ?? {};
const catalogue = new Set(ownership.staffPermissions);
const AUDIENCES = new Set(['public', 'optional-user', 'user', 'restricted-user', 'staff', 'webhook']);
const ERR_REF = '#/components/schemas/Error';

const resolveResponse = (resp) => {
  if (resp?.$ref) return doc.components.responses[resp.$ref.split('/').pop()];
  return resp;
};
const resolveParam = (p) => (p?.$ref ? doc.components.parameters[p.$ref.split('/').pop()] : p);
const secNames = (sec) => (sec ?? []).map((s) => Object.keys(s).join('+') || '{}').sort().join(',');
const SEC = (...names) => names.sort().join(',');

// ── operations ───────────────────────────────────────────────────
const opIds = new Map();
for (const { path: p, method, op, item } of operations(doc)) {
  const group = ownerOfPath(p) ?? 'nobody';
  if (!mine(group)) continue;
  const id = op.operationId ?? `${method.toUpperCase()} ${p}`;
  const where = `${group} ${method.toUpperCase()} ${p} (${id})`;
  opIds.set(op.operationId, { path: p, method, group });
  const isAdmin = p.startsWith('/admin/');

  // operationId prefix
  if (isAdmin && !/^admin[A-Z]/.test(op.operationId ?? '')) r.error(`${where}: admin operationIds start with "admin"`);
  if (!isAdmin && /^admin[A-Z]/.test(op.operationId ?? '')) r.error(`${where}: "admin" prefix is only for /admin/* paths`);

  // reserved operation must sit exactly where declared
  const res = ownership.reservedOperations[op.operationId];
  if (res && (res.path !== p || res.method !== method)) r.error(`${where}: reserved operation must be ${res.method.toUpperCase()} ${res.path}`);

  // Accept-Language on the path item (or operation)
  const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolveParam);
  if (!params.some((x) => x?.in === 'header' && x?.name === 'Accept-Language')) r.error(`${where}: missing shared AcceptLanguage parameter (path-item level)`);

  // x-permission
  const perm = op['x-permission'];
  if (!perm || typeof perm !== 'object') r.error(`${where}: x-permission missing or not an object`);
  else {
    if (!AUDIENCES.has(perm.audience)) r.error(`${where}: x-permission.audience "${perm.audience}" not in ${[...AUDIENCES].join('|')}`);
    if (perm.audience !== 'public' && perm.audience !== 'webhook' && !perm.ownership) r.error(`${where}: x-permission.ownership required (use "none" when not resource-bound)`);
    const sec = secNames(op.security ?? doc.security);
    if (perm.audience === 'staff') {
      const perms = perm.permissionByPurpose ? Object.values(perm.permissionByPurpose) : [perm.permission];
      for (const x of perms) if (x !== '@self' && !catalogue.has(x)) r.error(`${where}: staff permission "${x}" is not in the spec 16 catalogue (ownership.yaml staffPermissions)`);
      if (!isAdmin) r.error(`${where}: staff operations live under /admin/`);
      if (sec !== SEC('staffBearer', 'staffCookie')) r.error(`${where}: staff operations use security [staffBearer, staffCookie] (got ${sec})`);
      if (perm.stepUp === true && !op.responses?.['403']) r.error(`${where}: stepUp operations must document 403 (REAUTH_REQUIRED)`);
    } else if (isAdmin && !(perm.audience === 'public' && p.startsWith('/admin/auth/'))) {
      r.error(`${where}: /admin/* operations must have audience staff (public only for /admin/auth/*)`);
    }
    if ((perm.audience === 'public' || perm.audience === 'webhook') && sec !== '') r.error(`${where}: ${perm.audience} operations declare \`security: []\` (got ${sec || 'default'})`);
    if (perm.audience === 'optional-user' && sec !== SEC('{}', 'userBearer', 'userCookie')) r.error(`${where}: optional-user operations use security [{}, userBearer, userCookie] (got ${sec})`);
    if ((perm.audience === 'user' || perm.audience === 'restricted-user') && sec !== SEC('userBearer', 'userCookie')) r.error(`${where}: user operations use the default user security (got ${sec})`);
    if (perm.plan && perm.plan !== 'premium') r.error(`${where}: x-permission.plan may only be "premium"`);
    for (const t of perm.toggles ?? []) if (!/^S-\d{3}$/.test(t)) r.error(`${where}: x-permission.toggles entries are register ids "S-nnn" (got ${t})`);
  }

  // x-covers
  const covers = op['x-covers'];
  if (!Array.isArray(covers)) r.error(`${where}: x-covers must be a list`);
  else {
    if (covers.length === 0 && !op['x-covers-note']) r.error(`${where}: empty x-covers needs x-covers-note`);
    for (const c of covers) {
      const m = String(c).match(/^(\d{2}) (AC-\d+)$/);
      if (!m) { r.error(`${where}: x-covers entry "${c}" must look like "06 AC-7"`); continue; }
      if (!specs[m[1]]) r.error(`${where}: x-covers "${c}": no spec ${m[1]}`);
      else if (!specs[m[1]].acs.has(m[2])) r.error(`${where}: x-covers "${c}": spec ${m[1]} has no ${m[2]}`);
    }
  }

  // responses: at least one 2xx/3xx, Error body on 4xx/5xx, 401 for authenticated ops
  const codes = Object.keys(op.responses ?? {});
  for (const code of codes) {
    if (!/^[45]/.test(code)) continue;
    const resp = resolveResponse(op.responses[code]);
    const ref = resp?.content?.['application/json']?.schema?.$ref;
    if (ref !== ERR_REF) r.error(`${where}: response ${code} must use the shared Error schema (use components/responses.yaml)`);
  }
  if (perm && !['public', 'webhook'].includes(perm.audience) && perm.audience !== 'optional-user' && !codes.includes('401')) r.error(`${where}: authenticated operations document 401`);

  // money operations
  if (op['x-money'] === true) {
    const idem = params.find((x) => x?.in === 'header' && x?.name === 'Idempotency-Key');
    if (!idem || idem.required !== true) r.error(`${where}: x-money operations require the shared IdempotencyKey header`);
    for (const c of ['409', '422']) if (!codes.includes(c)) r.error(`${where}: x-money operations document ${c} (idempotency conflicts)`);
  }

  // pagination
  const okSchema = op.responses?.['200']?.content?.['application/json']?.schema;
  const pageName = okSchema?.$ref?.split('/').pop() ?? '';
  const hasCursor = params.some((x) => x?.in === 'query' && x?.name === 'cursor');
  const hasLimit = params.some((x) => x?.in === 'query' && x?.name === 'limit');
  if (method === 'get' && pageName.endsWith('Page') && !(hasCursor && hasLimit)) r.error(`${where}: list returning ${pageName} needs the shared Cursor and Limit/AdminLimit parameters`);
  if (hasCursor && !pageName.endsWith('Page')) r.error(`${where}: operations with ?cursor return a <Item>Page schema`);
  if (method === 'get' && okSchema?.type === 'array') r.error(`${where}: never return a bare array; use a <Item>Page (cursor) or a wrapper object`);

  // tags must be declared in base with the right owner (soft)
  for (const t of op.tags ?? []) {
    const decl = (doc.tags ?? []).find((x) => x.name === t);
    const owner = decl?.description?.match(/Owner: (D[1-6]|F0)/)?.[1];
    if (owner && owner !== group && t !== 'Webhooks') r.warn(`${where}: tag "${t}" belongs to ${owner}`);
  }
}

// ── reserved operations exist (final) ────────────────────────────
for (const [id, res] of Object.entries(ownership.reservedOperations)) {
  if (!mine(res.group)) continue;
  if (!opIds.has(id)) strict(`reserved operation ${id} (${res.group} ${res.method.toUpperCase()} ${res.path}) not written yet`);
}

// ── schemas ──────────────────────────────────────────────────────
const walk = (schema, fn, trail) => {
  if (!schema || typeof schema !== 'object') return;
  fn(schema, trail);
  for (const [k, v] of Object.entries(schema.properties ?? {})) walk(v, fn, `${trail}.${k}`);
  for (const k of ['items', 'additionalProperties', 'not']) if (typeof schema[k] === 'object') walk(schema[k], fn, `${trail}[${k}]`);
  for (const k of ['allOf', 'oneOf', 'anyOf']) (schema[k] ?? []).forEach((s, i) => walk(s, fn, `${trail}/${k}${i}`));
};
const isTimestampish = (s) =>
  s?.$ref === '#/components/schemas/Timestamp' || s?.format === 'date-time'
  || (s?.oneOf ?? s?.anyOf ?? []).some((x) => x.$ref === '#/components/schemas/Timestamp' || x.format === 'date-time');
const errorCodes = new Map();
for (const [name, schema] of Object.entries(schemas)) {
  const owner = ownerOfSchema(name, sharedNames) ?? 'nobody';
  if (!mine(owner)) continue;
  if (owner === 'nobody') r.error(`schema ${name}: no group owns this name (ownership.yaml schemaPrefixes)`);
  if (schema['x-stub']) strict(`schema ${name}: still a stub (x-stub)`);
  walk(schema, (s, trail) => {
    const types = [].concat(s.type ?? []);
    if (types.includes('number')) r.error(`schema ${trail}: type "number" is not allowed (money = Money, percent = BasisPoints, counts = integer)`);
    for (const [prop, ps] of Object.entries(s.properties ?? {})) {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(prop)) r.error(`schema ${trail}.${prop}: property names are camelCase`);
      if (/Tetri$/i.test(prop)) r.error(`schema ${trail}.${prop}: money travels as the shared Money object, not *Tetri integers`);
      if (/At$/.test(prop) && !isTimestampish(ps)) r.error(`schema ${trail}.${prop}: *At properties are Timestamp (UTC date-time)`);
      if (/^(price|amount|total|balance|fee|subtotal|surcharge|discount)$/i.test(prop) && ps?.$ref !== '#/components/schemas/Money'
        && !(ps?.oneOf ?? []).some((x) => x.$ref === '#/components/schemas/Money') && name !== 'Money') {
        r.error(`schema ${trail}.${prop}: money-named property must be the shared Money schema`);
      }
    }
  }, name);
  // error code enums
  const m = name.match(/^(D[1-6])ErrorCode$/);
  if (m || name === 'CommonErrorCode') {
    const prefixes = m ? ownership.groups[m[1]].errorPrefixes : null;
    for (const code of schema.enum ?? []) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) r.error(`${name}: code "${code}" must be UPPER_SNAKE_CASE`);
      if (prefixes && !prefixes.some((p) => code.startsWith(p))) r.error(`${name}: code "${code}" must start with one of ${prefixes.join(' ')}`);
      if (errorCodes.has(code)) r.error(`${name}: code "${code}" already defined in ${errorCodes.get(code)}`);
      errorCodes.set(code, name);
      if (m && !schema['x-enumDescriptions']?.[code]) r.error(`${name}: code "${code}" needs an x-enumDescriptions entry "[status] meaning; messageKey t_…"`);
    }
  }
}

// ── realtime events ──────────────────────────────────────────────
const eventNames = new Map();
for (const f of fs.readdirSync(path.join(srcDir, 'events')).filter((x) => x.endsWith('.yaml')).sort()) {
  const group = f.replace('.yaml', '').toUpperCase();
  if (!mine(group)) continue; // parallel-safe: never parse other groups' files in --group mode
  const events = readYaml(path.join(srcDir, 'events', f)).events ?? [];
  for (const ev of events) {
    const where = `events/${f} ${ev.name}`;
    if (!/^[a-z_]+(\.[a-z_]+)+$/.test(ev.name ?? '')) r.error(`${where}: event name must be dotted lower snake case (message.created)`);
    if (eventNames.has(ev.name)) r.error(`${where}: event already declared by ${eventNames.get(ev.name)}`);
    eventNames.set(ev.name, group);
    if (!ev.room) r.error(`${where}: room required (user:{userId} | conversation:{conversationId} | staff:{permission})`);
    if (!ev.payload || !schemas[ev.payload]) r.error(`${where}: payload schema "${ev.payload}" not found in components`);
    else if (!/Event$/.test(ev.payload)) r.error(`${where}: payload schema name ends with "Event"`);
    if (!(ev.emittedBy ?? []).length) r.error(`${where}: emittedBy lists operationIds or "job:<name>"`);
    for (const o of ev.emittedBy ?? []) if (!String(o).startsWith('job:') && !opIds.has(o)) strict(`${where}: emittedBy operation ${o} not found`);
  }
}
const builtinEvents = new Set(['file.processed']); // foundation events, documented in realtime.md §5
for (const { path: p, op } of operations(doc)) {
  if (!mine(ownerOfPath(p))) continue;
  for (const e of op['x-emits'] ?? []) {
    if (!eventNames.has(e) && !builtinEvents.has(e)) strict(`${op.operationId}: x-emits "${e}" is not declared in src/events/*.yaml`);
  }
}

process.exit(r.finish(`check-contract${args.group ? ' --group ' + args.group : ''}${args.final ? ' --final' : ''}`) ? 1 : 0);
