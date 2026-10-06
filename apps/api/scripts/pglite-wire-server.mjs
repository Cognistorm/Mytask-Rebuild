// PostgreSQL wire-protocol server for PGlite (local tests and `pnpm local` only; ROADMAP 4.2.0g). It replaces
// `@electric-sql/pglite-socket` 0.2.11 (with `@electric-sql/pglite` 0.5.8), which gave wrong answers:
//
// 1. After an error in an extended-protocol message (Parse/Bind/Describe/Execute), PGlite answers ErrorResponse AND
//    ReadyForQuery, and then a second ReadyForQuery for the client's Sync. PostgreSQL sends one. A client that sends
//    its next query at once (Prisma's ROLLBACK after an error inside a transaction) takes the extra ReadyForQuery as
//    the end of that query, and every later answer on the connection is one query late ("No 'X' record was found for
//    a nested create", `count` → null).
// 2. pglite-socket ran one protocol message at a time, so two connections' Parse/Bind/Execute could interleave on the
//    one PGlite session (both use the unnamed statement and portal).
//
// Here every client batch up to its Sync (or a simple Query, Flush, startup message) runs as one unit. A connection
// keeps PGlite for itself until it is back at "ready for query" outside a transaction, the same rule pglite-socket
// used for transactions. After an extended-protocol error the connection's messages are skipped until Sync (the
// PostgreSQL rule), and PGlite's early ReadyForQuery is dropped. A connection that closes inside a transaction is
// rolled back. Not for real data: one session, no authentication.
import { createServer } from 'node:net';

const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;
const CANCEL_REQUEST = 80877102;
/** Extended-protocol messages: an error in one of them makes PostgreSQL skip the rest until Sync. */
const EXTENDED = new Set(['P', 'B', 'D', 'E', 'C']);
/** Messages that end a batch: Sync, simple Query, Flush, function call, COPY end/fail. */
const BATCH_END = new Set(['S', 'Q', 'H', 'F', 'c', 'f']);

/** One holder of the PGlite session at a time; the holder keeps it across batches until it is idle. */
class SessionLock {
  /** @type {number | null} */
  owner = null;
  /** @type {(() => void)[]} */
  waiters = [];

  /** @param {number} id */
  async acquire(id) {
    while (this.owner !== null && this.owner !== id) {
      await new Promise((resolve) => this.waiters.push(() => resolve(undefined)));
    }
    this.owner = id;
  }

  /** @param {number} id */
  release(id) {
    if (this.owner !== id) return;
    this.owner = null;
    this.waiters.shift()?.();
  }
}

/** Splits backend output into messages: `[type, start, end]`. */
function* backendMessages(/** @type {Buffer} */ out) {
  let at = 0;
  while (at + 5 <= out.length) {
    const end = at + 1 + out.readInt32BE(at + 1);
    yield /** @type {[string, number, number]} */ ([String.fromCharCode(out[at]), at, end]);
    at = end;
  }
}

class Connection {
  started = false;
  skipTillSync = false;
  /** @type {Buffer} */
  buffer = Buffer.alloc(0);
  /** @type {Buffer[]} */
  batch = [];
  work = Promise.resolve();

  /**
   * @param {number} id
   * @param {import('node:net').Socket} socket
   * @param {import('@electric-sql/pglite').PGlite} db
   * @param {SessionLock} lock
   */
  constructor(id, socket, db, lock) {
    this.id = id;
    this.socket = socket;
    this.db = db;
    this.lock = lock;
    socket.setNoDelay(true);
    socket.on('data', (chunk) => {
      this.work = this.work.then(() => this.receive(chunk)).catch((err) => this.fail(err));
    });
    socket.on('error', () => socket.destroy());
    socket.on('close', () => {
      this.work = this.work.then(() => this.closed()).catch(() => undefined);
    });
  }

  /** @param {Buffer} chunk */
  async receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (!this.started) {
        if (this.buffer.length < 8) return;
        const length = this.buffer.readInt32BE(0);
        if (this.buffer.length < length) return;
        const code = this.buffer.readInt32BE(4);
        const message = this.buffer.subarray(0, length);
        this.buffer = this.buffer.subarray(length);
        if (code === SSL_REQUEST || code === GSSENC_REQUEST) {
          this.socket.write('N');
        } else if (code === CANCEL_REQUEST) {
          this.socket.end();
          return;
        } else {
          this.started = true;
          await this.run([message], null);
        }
        continue;
      }
      if (this.buffer.length < 5) return;
      const length = 1 + this.buffer.readInt32BE(1);
      if (this.buffer.length < length) return;
      const message = Buffer.from(this.buffer.subarray(0, length));
      this.buffer = this.buffer.subarray(length);
      const type = String.fromCharCode(message[0]);
      if (type === 'X') {
        this.socket.end();
        return;
      }
      this.batch.push(message);
      // Startup continuations (password, SASL) are answered one by one, like batch ends.
      if (BATCH_END.has(type) || !EXTENDED.has(type)) {
        const batch = this.batch;
        this.batch = [];
        await this.run(batch, type);
      }
    }
  }

  /**
   * Runs one batch while holding the session; keeps holding it while PGlite is inside a transaction or the client
   * has not synced yet (a batch that ended with Flush).
   * @param {Buffer[]} batch
   * @param {string | null} lastType
   */
  async run(batch, lastType) {
    await this.lock.acquire(this.id);
    for (const message of batch) {
      const type = String.fromCharCode(message[0]);
      if (this.skipTillSync && type !== 'S') continue;
      if (type === 'S') this.skipTillSync = false;
      /** @type {Buffer[]} */
      const chunks = [];
      await this.db.runExclusive(() =>
        this.db.execProtocolRawStream(new Uint8Array(message), {
          onRawData: (data) => chunks.push(Buffer.from(data)),
        }),
      );
      let out = Buffer.concat(chunks);
      if (this.started && EXTENDED.has(type)) {
        const messages = [...backendMessages(out)];
        if (messages.some(([t]) => t === 'E')) {
          this.skipTillSync = true;
          const last = messages.at(-1);
          // PGlite's early ReadyForQuery; the client's Sync gets the real one.
          if (last?.[0] === 'Z') out = out.subarray(0, last[1]);
        }
      }
      if (out.length > 0 && this.socket.writable) this.socket.write(out);
    }
    const idle = lastType !== 'H' && !this.db.isInTransaction();
    if (idle) this.lock.release(this.id);
  }

  /** @param {unknown} err */
  fail(err) {
    console.error(`pglite-wire: connection ${this.id}:`, err);
    this.socket.destroy();
  }

  async closed() {
    if (this.lock.owner !== this.id) return;
    try {
      if (this.db.isInTransaction()) await this.db.exec('ROLLBACK');
    } finally {
      this.lock.release(this.id);
    }
  }
}

export class PGliteWireServer {
  /** @type {import('node:net').Server | null} */
  server = null;
  /** @type {Set<import('node:net').Socket>} */
  sockets = new Set();
  lock = new SessionLock();
  nextId = 1;

  /**
   * @param {{ db: import('@electric-sql/pglite').PGlite, port?: number, host?: string, maxConnections?: number }} options
   */
  constructor({ db, port = 5432, host = '127.0.0.1', maxConnections = 20 }) {
    this.db = db;
    this.port = port;
    this.host = host;
    this.maxConnections = maxConnections;
  }

  /** Starts listening; `port: 0` picks a free port, read it from `.port` afterwards. */
  async start() {
    await this.db.waitReady;
    const server = createServer((socket) => {
      if (this.sockets.size >= this.maxConnections) {
        socket.end();
        return;
      }
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
      new Connection(this.nextId++, socket, this.db, this.lock);
    });
    this.server = server;
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.port, this.host, () => resolve(undefined));
    });
    const address = server.address();
    if (address && typeof address === 'object') this.port = address.port;
  }

  async stop() {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    const server = this.server;
    this.server = null;
    if (server) await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
}
