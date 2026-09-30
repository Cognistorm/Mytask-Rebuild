// Local/dev helper until the admin panel covers a setting: `pnpm --filter @mytask/api setting:set S-056 false`
// Writes one register row into `settings` (the API picks it up within 5 s). Uses DATABASE_URL from the env/.env.
// Production changes go through the admin panel (versioned + audited, spec 16) — never through this script.
import { existsSync } from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL && existsSync('../../.env')) process.loadEnvFile('../../.env');
if (process.env.NODE_ENV === 'production') {
  console.error('refused: use the admin panel in production');
  process.exit(1);
}
const KEYS = {
  'S-052': 'auth.email_verification.required',
  'S-053': 'auth.email_verification.method',
  'S-056': 'auth.two_factor.enabled',
  'S-060': 'auth.two_factor.staff_required',
  'S-061': 'auth.recaptcha.enabled',
};
const [id, raw] = process.argv.slice(2);
if (!KEYS[id] || raw === undefined) {
  console.error(`usage: setting:set <${Object.keys(KEYS).join('|')}> <json value>`);
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO settings (key, register_id, value, current_version, updated_at)
   VALUES ($1, $2, $3::jsonb, 1, now())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, current_version = settings.current_version + 1, updated_at = now()`,
  [KEYS[id], id, raw],
);
await client.end();
console.log(`${id} (${KEYS[id]}) = ${raw}`);
