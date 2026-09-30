// Local development only: load the repository-root `.env` (git-ignored, CLAUDE.md rule 8).
// In containers the variables come from the environment (`env_file`), and this does nothing.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.env.NODE_ENV !== 'production') {
  const file = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].find((p) =>
    existsSync(p),
  );
  if (file) process.loadEnvFile(file);
}
