// RUN_INTEGRATION=1 runs against `<db>_test` (created by infra/postgres/init), never the development data
// (QA P3 BUG-12d). Used by global-setup.mts.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** DATABASE_URL (from the environment, else the root .env) with its database renamed to `<name>_test`. */
export function integrationDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
  envFile = '../../.env',
): string {
  const raw =
    env.DATABASE_URL ??
    (existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL : undefined);
  if (!raw)
    throw new Error('RUN_INTEGRATION=1 needs DATABASE_URL (or a root .env from pnpm setup:env)');
  const url = new URL(raw);
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`;
  return url.toString();
}
