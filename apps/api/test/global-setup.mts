// Without RUN_INTEGRATION (i.e. locally without Docker), tests run against PGlite (Postgres 17 in
// WebAssembly with the data-model extensions) and an in-process Redis. CI sets RUN_INTEGRATION=1 and uses
// real PostgreSQL + Redis service containers.
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

export default async function setup() {
  if (process.env.RUN_INTEGRATION) {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    return undefined;
  }
  const db = await PGlite.create({ extensions: { btree_gist, citext, pg_trgm, vector } });
  const port = await freePort();
  const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 20 });
  await server.start();
  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  process.env.DATABASE_URL = url;
  process.env.REDIS_URL = 'memory://';
  // Async on purpose: PGlite is served from this process, so a blocking call would deadlock.
  await promisify(exec)('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
  });
  return async () => {
    await server.stop();
    await db.close();
  };
}
