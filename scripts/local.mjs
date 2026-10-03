// `pnpm local` — the whole platform on this computer WITHOUT Docker (ADR-020, Owner 2026-10-02):
//   - PostgreSQL = PGlite (Postgres in WebAssembly, all data-model extensions), data in apps/api/.pglite
//   - Redis      = native redis-server 7.4.11, data in .local/data/redis (shared by the API and the worker)
//   - S3         = native SeaweedFS 4.48 (ADR-017) on :8333, data in .local/data/s3, buckets created here
//   - Emails     = native Mailpit 1.31.3: SMTP :1025, inbox http://localhost:8025
//   - Payments   = the fake Bank of Georgia API (tools/bog-mock) on :4100
//   - Virus scan = off (SCAN_PROVIDER=none: uploads are type-checked and marked scan_skipped, ADR-009 §6)
// then migrations, the seed and `pnpm dev` (API + worker, web :3100, admin :3200). Stop with Ctrl+C.
// `pnpm infra:up` starts only the infrastructure (then run `pnpm dev` in a second window).
// Ports and keys come from the root .env (`pnpm setup:env`); tools are downloaded once (scripts/local/tools.mjs).
import { exec, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureTool, localDir, root } from './local/tools.mjs';

const infraOnly = process.argv.includes('--infra-only');
const api = resolve(root, 'apps/api');
const envFile = join(root, '.env');
if (!existsSync(envFile)) {
  console.error('local: no .env yet — run `pnpm setup:env` first.');
  process.exit(1);
}
process.loadEnvFile(envFile);

const port = (url, fallback) => Number(new URL(url).port || fallback);
const dbPort = port(process.env.DATABASE_URL, 5432);
const redisPort = port(process.env.REDIS_URL, 6379);
const s3Port = port(process.env.S3_ENDPOINT ?? 'http://localhost:8333', 8333);
const smtpPort = port(process.env.SMTP_URL ?? 'smtp://localhost:1025', 1025);
const mailUiPort = 8025;
const bogPort = port(process.env.BOG_API_BASE_URL ?? 'http://localhost:4100', 4100);
const env = { ...process.env, SCAN_PROVIDER: 'none', MAIL_TRANSPORT: 'smtp' };
const data = (name) => {
  const d = join(localDir, 'data', name);
  mkdirSync(d, { recursive: true });
  return d;
};

const listening = (p) =>
  new Promise((ok) => {
    const s = connect(p, '127.0.0.1', () => (s.end(), ok(true)));
    s.on('error', () => ok(false));
  });

// A run that was killed hard (window closed) leaves its processes holding the ports. Stop those that are
// clearly ours — tools from .local, or node started from this repository — and report anything else.
// Infra-only mode leaves the app ports alone (`pnpm dev` may be running in another window).
const infraPorts = [dbPort, redisPort, s3Port, smtpPort, mailUiPort, bogPort, 8334, 8888, 9333];
const appPorts = [3000, 3001, 3002, 3100, 3200];
const ports = infraOnly ? infraPorts : [...infraPorts, ...appPorts];
if (process.platform === 'win32') {
  const query =
    `@(Get-NetTCPConnection -State Listen -LocalPort ${ports.join(',')} -ErrorAction SilentlyContinue | ` +
    'Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { ' +
    'Get-CimInstance Win32_Process -Filter "ProcessId=$_" | ' +
    'Select-Object ProcessId, ExecutablePath, CommandLine }) | ConvertTo-Json -Compress';
  const ps = spawnSync('powershell', ['-NoProfile', '-Command', query], { encoding: 'utf8' });
  const rows = ps.stdout?.trim() ? [JSON.parse(ps.stdout)].flat() : [];
  const lower = (v) => (v ?? '').toLowerCase();
  for (const r of rows) {
    const exe = lower(r.ExecutablePath);
    const ours =
      exe.startsWith(lower(localDir)) ||
      (exe.endsWith('node.exe') && lower(r.CommandLine).includes(lower(root)));
    if (!ours) continue;
    console.log(`local: stopping a leftover process from an earlier run (pid ${r.ProcessId})`);
    spawnSync('taskkill', ['/pid', String(r.ProcessId), '/T', '/F']);
  }
  if (rows.length) await new Promise((r) => setTimeout(r, 1500));
}
for (const p of ports) {
  if (await listening(p)) {
    console.error(
      `local: port ${p} is used by another program — close that program and try again.`,
    );
    process.exit(1);
  }
}

const children = [];
const start = (name, cmd, args, opts = {}) => {
  const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  const tag = (chunk) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .forEach((l) => console.log(`[${name}] ${l}`));
  // Infrastructure stays quiet: errors are printed, except for `quiet` tools (SeaweedFS logs everything to
  // stderr), whose last lines are printed only if they stop.
  const recent = [];
  c.stderr?.on('data', (chunk) => {
    if (!opts.quiet) return tag(chunk);
    recent.push(chunk);
    if (recent.length > 30) recent.shift();
  });
  c.on('exit', (code) => {
    if (!stopping) {
      recent.forEach(tag);
      console.error(`local: ${name} stopped (exit ${code}); stopping everything.`);
      stop(1);
    }
  });
  children.push({ name, c });
  return c;
};
const waitFor = async (name, p, seconds = 60) => {
  for (let i = 0; i < seconds * 4; i++) {
    if (await listening(p)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${name} did not start on port ${p}`);
};

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const { c } of children.reverse()) {
    if (c.exitCode !== null) continue;
    // `pnpm dev` runs through a shell: end the whole process tree, not just the shell.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F']);
    else c.kill('SIGTERM');
  }
  process.exit(code);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

try {
  const [redis, weed, mailpit] = [
    await ensureTool('redis'),
    await ensureTool('seaweedfs'),
    await ensureTool('mailpit'),
  ];

  start(
    'postgres',
    process.execPath,
    // LOCAL_PGLITE_DIR: a throw-away database for full-stack test runs (fresh seed, owner data untouched).
    [
      join(api, 'scripts/pglite-server.mjs'),
      String(dbPort),
      resolve(process.env.LOCAL_PGLITE_DIR ?? join(api, '.pglite')),
    ],
    {
      cwd: api,
    },
  );
  // Same settings as compose (ADR-015 §6, SEC-32): AOF persistence, never evict keys.
  start('redis', redis, [
    '--bind',
    '127.0.0.1',
    '--port',
    String(redisPort),
    '--dir',
    data('redis'),
    '--appendonly',
    'yes',
    '--maxmemory-policy',
    'noeviction',
    '--save',
    '',
  ]);
  const s3Config = join(localDir, 's3.json');
  writeFileSync(
    s3Config,
    JSON.stringify({
      identities: [
        {
          name: 'local',
          credentials: [{ accessKey: env.S3_ACCESS_KEY_ID, secretKey: env.S3_SECRET_ACCESS_KEY }],
          actions: ['Admin', 'Read', 'List', 'Tagging', 'Write'],
        },
        // ADR-009: browsers read the processed public images directly (the CDN's job in production);
        // read only, this one bucket only, no listing. Private and KYC files stay behind signed links.
        { name: 'anonymous', actions: [`Read:${env.S3_BUCKET_PUBLIC ?? 'public-media'}`] },
      ],
    }),
  );
  start(
    's3',
    weed,
    [
      'server',
      '-ip=127.0.0.1',
      '-ip.bind=127.0.0.1',
      `-dir=${data('s3')}`,
      '-s3',
      `-s3.port=${s3Port}`,
      `-s3.config=${s3Config}`,
      // Security review 06 SEC-62: the filer's own HTTP API (:8888) would serve, list and accept writes to
      // every bucket (KYC included) without the S3 identities above. Only the S3 gateway is used.
      '-filer.disableHttp',
      '-master.volumeSizeLimitMB=128',
      '-master.telemetry=false',
      '-volume.max=0',
      '-volume.port=8334',
    ],
    { quiet: true },
  );
  // Fake Bank of Georgia API (ADR-004): real BOG credentials are never used locally.
  start('bog', process.execPath, [join(root, 'tools/bog-mock/src/server.ts')], {
    env: { ...env, BOG_MOCK_PORT: String(bogPort) },
  });
  start('mail', mailpit, [
    '--smtp',
    `127.0.0.1:${smtpPort}`,
    '--listen',
    `127.0.0.1:${mailUiPort}`,
    '--database',
    join(data('mail'), 'mailpit.db'),
  ]);

  await waitFor('PostgreSQL', dbPort);
  await waitFor('Redis', redisPort);
  await waitFor('Mailpit', smtpPort);
  await waitFor('BOG mock', bogPort);
  await waitFor('SeaweedFS S3', s3Port, 120);
  await assertFilerClosed();
  await createBuckets();
  console.log(
    `local: infrastructure up — PostgreSQL :${dbPort} · Redis :${redisPort} · S3 :${s3Port} · ` +
      `fake BOG :${bogPort} · mail inbox http://localhost:${mailUiPort}`,
  );

  if (infraOnly) {
    console.log(
      'local: now run `pnpm dev` in another window. Ctrl+C here stops the infrastructure.',
    );
  } else {
    await prepareDatabase();
    const dev = start('dev', 'pnpm', ['dev'], {
      cwd: root,
      env,
      shell: true,
      stdio: 'inherit',
    });
    dev.on('exit', () => stop(0));
    console.log(
      'local: web http://localhost:3100 · admin http://localhost:3200 · API http://localhost:3000/api/v1/health',
    );
  }
} catch (e) {
  console.error(`local: ${e instanceof Error ? e.message : e}`);
  stop(1);
}

/** The three buckets of ADR-009; the S3 gateway can still be warming up, so each is retried. */
/** SEC-62: refuse to run when the filer HTTP API answers with content (it must be off or 404). */
async function assertFilerClosed() {
  let status = 0;
  try {
    status = (await fetch('http://127.0.0.1:8888/buckets/', { signal: AbortSignal.timeout(3000) })).status;
  } catch {
    return; // nothing listening: fine
  }
  if (status >= 200 && status < 400) {
    console.error(
      'local: the SeaweedFS filer on :8888 serves the buckets without authentication (SEC-62). Stopping.',
    );
    stop(1);
  }
}

async function createBuckets() {
  const { S3Client, CreateBucketCommand, HeadBucketCommand } = createRequire(
    join(api, 'package.json'),
  )('@aws-sdk/client-s3');
  const s3 = new S3Client({
    endpoint: `http://127.0.0.1:${s3Port}`,
    region: env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  for (const Bucket of [env.S3_BUCKET_PUBLIC, env.S3_BUCKET_PRIVATE, env.S3_BUCKET_KYC]) {
    for (let i = 0; ; i++) {
      try {
        await s3.send(new HeadBucketCommand({ Bucket }));
        break;
      } catch {
        try {
          await s3.send(new CreateBucketCommand({ Bucket }));
          break;
        } catch (e) {
          if (i >= 40) throw new Error(`could not create bucket ${Bucket}: ${e.message}`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }
  }
}

async function prepareDatabase() {
  console.log('local: applying database migrations…');
  await promisify(exec)('npx prisma migrate deploy', { cwd: api, env });
  // Owner 2026-09-30: email 2FA (S-056) starts OFF locally for easy log-in; the admin panel turns it on.
  // Only written when the row does not exist yet, so an admin-panel choice is never overridden.
  const pg = createRequire(join(api, 'package.json'))('pg');
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO settings (key, register_id, value, current_version, updated_at)
     VALUES ('auth.two_factor.enabled', 'S-056', 'false'::jsonb, 1, now()),
            ('auth.two_factor.staff_required', 'S-060', 'false'::jsonb, 1, now())
     ON CONFLICT (key) DO NOTHING`,
  );
  await client.end();
  // Permissions, the Super-admin role and (first run only) the first Super-admin account, printed once.
  await new Promise((ok) => {
    const seed = spawn('pnpm', ['--filter', '@mytask/api', 'db:seed'], {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: true,
    });
    seed.on('exit', ok);
  });
}
