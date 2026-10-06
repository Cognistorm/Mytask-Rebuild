// Docker-free PostgreSQL for local tests and quick previews (NOT for real data): PGlite (Postgres 17 in
// WebAssembly) with the data-model extensions, served over the Postgres wire protocol (pglite-wire-server.mjs).
//   node scripts/pglite-server.mjs [port=5433] [dataDir=memory]
// Use DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:<port>/postgres?sslmode=disable
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGliteWireServer } from './pglite-wire-server.mjs';

const port = Number(process.argv[2] ?? process.env.PGLITE_PORT ?? 5433);
const dataDir = process.argv[3] && process.argv[3] !== 'memory' ? process.argv[3] : undefined;
const db = await PGlite.create({ dataDir, extensions: { btree_gist, citext, pg_trgm, vector } });
const server = new PGliteWireServer({ db, port, host: '127.0.0.1', maxConnections: 20 });
await server.start();
console.log(`pglite listening on 127.0.0.1:${port} (${dataDir ?? 'in-memory'})`);
const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
