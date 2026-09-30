// `pnpm preview` — run the platform WITHOUT Docker, for a quick look in the browser (not for real data):
//   - PostgreSQL = PGlite (Postgres 17 in WebAssembly) on 127.0.0.1:5433, data kept in apps/api/.pglite
//   - Redis      = in-process stand-in (REDIS_URL=memory://)
//   - Emails     = printed in this window (MAIL_TRANSPORT=log), e.g. the 6-digit login codes
// Then `pnpm dev` (API + worker, web :3100, admin :3200). Stop with Ctrl+C.
// With Docker installed, prefer `pnpm infra:up` + `pnpm dev` (docs/SETUP-LOCAL.md).
import { exec, spawn } from 'node:child_process';
import { connect } from 'node:net';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const api = resolve(root, 'apps/api');
const port = 5433;
const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
  REDIS_URL: 'memory://',
  MAIL_TRANSPORT: 'log',
};

const children = [];
const db = spawn(process.execPath, ['scripts/pglite-server.mjs', String(port), '.pglite'], {
  cwd: api,
  stdio: 'inherit',
});
children.push(db);

const up = () =>
  new Promise((ok) => {
    const s = connect(port, '127.0.0.1', () => (s.end(), ok(true)));
    s.on('error', () => ok(false));
  });
while (!(await up())) await new Promise((r) => setTimeout(r, 300));

console.log('preview: applying database migrations…');
await promisify(exec)('npx prisma migrate deploy', { cwd: api, env });

const dev = spawn('pnpm', ['dev'], { cwd: root, env, stdio: 'inherit', shell: true });
children.push(dev);
console.log(
  'preview: web http://localhost:3100 · admin http://localhost:3200 · API http://localhost:3000/api/v1/health',
);

const stop = () => {
  for (const c of children) c.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
dev.on('exit', stop);
