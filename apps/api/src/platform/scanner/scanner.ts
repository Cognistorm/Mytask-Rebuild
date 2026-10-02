// Virus scanning of uploads (ADR-009 §3.5, §6): clamd's INSTREAM command over TCP, so the worker streams
// the object from storage straight into the scanner (uploads of up to 100 MB, Q-154). clamd must run with
// StreamMaxLength / MaxFileSize / MaxScanSize ≥ 100 MB (tools/clamav/clamd.conf); otherwise it answers
// "size limit exceeded", which is an error here (retried), never "clean".
import { Socket, createConnection } from 'node:net';
import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';

export type ScanVerdict = { infected: false } | { infected: true; signature: string };

export abstract class VirusScanner {
  /** false = no scanner configured: files become `ready` with `scan_skipped` (ADR-009 §6). */
  abstract readonly enabled: boolean;
  /** Consumes all chunks. Throws when the scanner cannot give a verdict (the scan is retried). */
  abstract scan(chunks: AsyncIterable<Uint8Array>): Promise<ScanVerdict>;
  abstract ping(): Promise<void>;
}

/** clamd answers one NUL- or newline-terminated line, e.g. `stream: OK`, `stream: Eicar-Test-Signature FOUND`. */
export function parseClamdReply(reply: string): ScanVerdict {
  const line = reply.replace(/[\0\n]+$/, '').trim();
  if (/^stream: OK$/.test(line)) return { infected: false };
  const found = /^stream: (.+) FOUND$/.exec(line);
  if (found) return { infected: true, signature: found[1]! };
  throw new Error(`clamd: ${line || 'empty reply'}`);
}

const IDLE_TIMEOUT_MS = 60_000;
/** clamd reads INSTREAM in chunks of at most this size. */
const CHUNK = 64 * 1024;

export class ClamdScanner extends VirusScanner {
  readonly enabled = true;

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {
    super();
  }

  async ping(): Promise<void> {
    const reply = await this.session((socket) => write(socket, Buffer.from('zPING\0')));
    if (reply.replace(/\0/g, '').trim() !== 'PONG') throw new Error(`clamd: ${reply}`);
  }

  async scan(chunks: AsyncIterable<Uint8Array>): Promise<ScanVerdict> {
    const reply = await this.session(async (socket) => {
      await write(socket, Buffer.from('zINSTREAM\0'));
      for await (const chunk of chunks) {
        for (let i = 0; i < chunk.length; i += CHUNK) {
          const part = chunk.subarray(i, i + CHUNK);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(part.length);
          await write(socket, size);
          await write(socket, part);
        }
      }
      await write(socket, Buffer.alloc(4)); // zero length = end of stream
    });
    return parseClamdReply(reply);
  }

  /** Opens a connection, runs `send`, and returns everything clamd answered before closing it. */
  private session(send: (socket: Socket) => Promise<void>): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: this.host, port: this.port });
      const parts: Buffer[] = [];
      let failed: Error | undefined;
      socket.setTimeout(IDLE_TIMEOUT_MS, () => socket.destroy(new Error('clamd: timeout')));
      socket.on('data', (d: Buffer) => parts.push(d));
      socket.on('error', (err) => (failed ??= err));
      socket.on('close', () => {
        const reply = Buffer.concat(parts).toString('utf8');
        // clamd may close early with a reply (e.g. "size limit exceeded"): the reply wins over the write error.
        if (reply) resolve(reply);
        else reject(failed ?? new Error('clamd: connection closed without a reply'));
      });
      socket.once('connect', () => {
        send(socket).then(
          () => socket.end(),
          (err: Error) => {
            failed ??= err;
            socket.end();
          },
        );
      });
    });
  }
}

function write(socket: Socket, data: Uint8Array): Promise<void> {
  if (socket.destroyed || !socket.writable)
    return Promise.reject(new Error('clamd: connection closed'));
  return new Promise((resolve, reject) => {
    socket.write(data, (err) => (err ? reject(err) : resolve()));
  });
}

/** No scanner (development, or SCAN_PROVIDER=none with Owner approval): reads the stream, finds nothing. */
export class NoScanner extends VirusScanner {
  readonly enabled = false;
  async scan(chunks: AsyncIterable<Uint8Array>): Promise<ScanVerdict> {
    for await (const _ of chunks); // the caller hashes and measures while the stream is read
    return { infected: false };
  }
  ping(): Promise<void> {
    return Promise.resolve();
  }
}

@Injectable()
class ScannerFactory {
  constructor(@Inject(ENV) private readonly env: Env) {}
  create(): VirusScanner {
    const provider = this.env.SCAN_PROVIDER ?? (this.env.CLAMAV_HOST ? 'clamav' : 'none');
    if (provider === 'clamav') return new ClamdScanner(this.env.CLAMAV_HOST!, this.env.CLAMAV_PORT);
    new Logger('Scanner').warn('no virus scanner — uploads are marked scan_skipped (ADR-009 §6)');
    return new NoScanner();
  }
}

@Global()
@Module({
  providers: [
    ScannerFactory,
    {
      provide: VirusScanner,
      useFactory: (f: ScannerFactory) => f.create(),
      inject: [ScannerFactory],
    },
  ],
  exports: [VirusScanner],
})
export class ScannerModule {}
