// Prisma 7 configuration: schema location, migrations and the database URL (from .env, never in git).
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Same .env as the apps: the repository root (local only; containers get real environment variables).
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // A placeholder keeps `prisma generate` working without a database (CI typecheck, builds).
    url:
      process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
