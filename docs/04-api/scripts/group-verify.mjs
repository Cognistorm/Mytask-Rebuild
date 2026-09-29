#!/usr/bin/env node
// Isolated verification for ONE group run (parallel-safe). Usage: npm run verify:group -- D3
// Builds a sandbox in docs/04-api/.build/<group>/ containing the shared foundation, F0 and the
// group's own files only (other groups' files are replaced by empty stubs), then:
//   build-root -> redocly lint (sources) -> redocly bundle -> redocly lint (bundle)
//   -> check-contract --group -> check-coverage --group
// It never writes src/openapi.root.yaml or openapi.yaml, so parallel runs cannot disturb each other
// (or be broken by another group's half-written file).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { apiDir, srcDir, ownership } from './lib.mjs';

const group = (process.argv[2] ?? '').toUpperCase();
if (!/^D[1-6]$/.test(group)) {
  console.error('usage: npm run verify:group -- D1|D2|D3|D4|D5|D6');
  process.exit(2);
}
const sb = path.join(apiDir, '.build', group.toLowerCase());
const sbSrc = path.join(sb, 'src');
fs.rmSync(sb, { recursive: true, force: true });
for (const d of ['components', 'paths', 'schemas', 'events']) fs.mkdirSync(path.join(sbSrc, d), { recursive: true });

fs.copyFileSync(path.join(srcDir, 'openapi.base.yaml'), path.join(sbSrc, 'openapi.base.yaml'));
fs.copyFileSync(path.join(srcDir, 'ownership.yaml'), path.join(sbSrc, 'ownership.yaml'));
for (const f of fs.readdirSync(path.join(srcDir, 'components'))) {
  fs.copyFileSync(path.join(srcDir, 'components', f), path.join(sbSrc, 'components', f));
}
for (const [k, g] of Object.entries(ownership.groups)) {
  const own = k === group || k === 'F0';
  if (g.pathFile) {
    const from = path.join(srcDir, 'paths', g.pathFile);
    const to = path.join(sbSrc, 'paths', g.pathFile);
    if (own) fs.copyFileSync(from, to); else fs.writeFileSync(to, `# ${k} stubbed out in the ${group} sandbox\n`);
  }
  if (g.schemaFile) {
    const from = path.join(srcDir, 'schemas', g.schemaFile);
    const to = path.join(sbSrc, 'schemas', g.schemaFile);
    if (k === group) fs.copyFileSync(from, to);
    else fs.writeFileSync(to, `# ${k} stubbed out in the ${group} sandbox\n${k}ErrorCode:\n  type: string\n`);
  }
}

const redocly = path.join(apiDir, 'node_modules', '@redocly', 'cli', 'bin', 'cli.js');
const config = path.join(apiDir, 'redocly.yaml');
const root = path.join(sbSrc, 'openapi.root.yaml');
const bundle = path.join(sb, 'openapi.yaml');
const steps = [
  ['build-root', [path.join(apiDir, 'scripts', 'build-root.mjs'), '--src', sbSrc]],
  ['lint sources', [redocly, 'lint', root, '--config', config]],
  ['bundle', [redocly, 'bundle', root, '--config', config, '-o', bundle]],
  ['lint bundle', [redocly, 'lint', bundle, '--config', config]],
  ['check-contract', [path.join(apiDir, 'scripts', 'check-contract.mjs'), bundle, '--group', group]],
  ['check-coverage', [path.join(apiDir, 'scripts', 'check-coverage.mjs'), '--group', group, '--bundle', bundle]],
];
let failed = false;
for (const [name, argv] of steps) {
  console.log(`\n=== ${group}: ${name} ===`);
  const res = spawnSync(process.execPath, argv, { cwd: apiDir, stdio: 'inherit', env: { ...process.env, NO_COLOR: '1' } });
  if (res.status !== 0) {
    failed = true;
    console.log(`=== ${group}: ${name} FAILED (exit ${res.status}) ===`);
    if (['build-root', 'lint sources', 'bundle'].includes(name)) break;
  }
}
console.log(`\n${group} sandbox: ${path.relative(apiDir, sb)}  ->  ${failed ? 'FAILED' : 'PASSED'}`);
process.exit(failed ? 1 : 0);
