import type { PGlite } from '@electric-sql/pglite';

/** PostgreSQL wire-protocol server for PGlite (local tests and `pnpm local`; see pglite-wire-server.mjs). */
export declare class PGliteWireServer {
  constructor(options: { db: PGlite; port?: number; host?: string; maxConnections?: number });
  /** The listening port (after `start()`, also when started with `port: 0`). */
  port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
}
