// Files F0 part 2 (ROADMAP 4.1.4): magic-byte sniffer and the clamd INSTREAM client. clamd itself is not
// installed on developer machines; a fake clamd on a local TCP port checks the wire format instead.
import { type AddressInfo, createServer, type Server } from 'node:net';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { DETECTED_BY_EXTENSION, sniff } from '../src/modules/files/scan/magic';
import { retryDelaySeconds } from '../src/worker/files-scan.sweeper';
import { ClamdScanner, parseClamdReply } from '../src/platform/scanner/scanner';

const bytes = (...parts: (string | number[])[]) =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))),
  );

describe('sniff (magic bytes, ADR-009 §3.5)', () => {
  it('recognises real images made by sharp', async () => {
    const img = sharp({ create: { width: 4, height: 4, channels: 3, background: '#c00' } });
    expect(sniff(await img.clone().jpeg().toBuffer())).toBe('image/jpeg');
    expect(sniff(await img.clone().png().toBuffer())).toBe('image/png');
    expect(sniff(await img.clone().webp().toBuffer())).toBe('image/webp');
    expect(sniff(await img.clone().gif().toBuffer())).toBe('image/gif');
  });

  it.each([
    ['pdf', bytes('%PDF-1.7\n')],
    ['doc', bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 'rest')],
    ['docx', bytes([0x50, 0x4b, 0x03, 0x04], 'xxxx[Content_Types].xml')],
    ['mp4', bytes([0, 0, 0, 0x20], 'ftypisom', [0, 0, 2, 0])],
    ['mov', bytes([0, 0, 0, 0x14], 'ftypqt  ')],
    ['avi', bytes('RIFF', [0, 0, 0, 0], 'AVI LIST')],
    ['mkv', bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x88], 'matroska')],
    ['webm', bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84], 'webm')],
    ['txt', Buffer.from('გამარჯობა — plain text\r\n', 'utf8')],
  ])('recognises %s (Q-154 appeal types)', (ext, head) => {
    expect(sniff(head, true)).toBe(DETECTED_BY_EXTENSION[ext]);
  });

  it('does not take HTML, SVG, a plain zip or a HEIC photo for an allowed type', () => {
    // HTML and SVG are text: never an image, so a `.jpg` that is really HTML is rejected.
    expect(sniff(Buffer.from('<html><script>alert(1)</script></html>'), true)).toBe('text/plain');
    expect(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), true)).toBe(
      'text/plain',
    );
    expect(sniff(bytes([0x50, 0x4b, 0x03, 0x04], 'evil.exe'))).toBe('application/zip');
    expect(sniff(bytes([0, 0, 0, 0x18], 'ftypheic'))).toBe('image/heic');
    expect(sniff(bytes([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBeNull(); // Windows .exe
    expect(sniff(Buffer.alloc(0), true)).toBeNull();
  });

  it('public files: a PDF must start with %PDF- at byte 0 (review 10 SEC-80 (a), probe P1)', () => {
    const htmlPolyglot = bytes('<html><script>alert(1)</script>', ' '.repeat(150), '%PDF-1.4\n');
    const svgPolyglot = bytes(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>%PDF-1.7\n',
    );
    const strict = { pdfAtStart: true };
    // Private files keep the PDF readers' rule (the header anywhere in the first 1024 bytes).
    expect(sniff(htmlPolyglot)).toBe('application/pdf');
    expect(sniff(svgPolyglot)).toBe('application/pdf');
    expect(sniff(htmlPolyglot, false, strict)).not.toBe('application/pdf');
    expect(sniff(svgPolyglot, false, strict)).not.toBe('application/pdf');
    expect(sniff(bytes(' %PDF-1.7\n'), false, strict)).not.toBe('application/pdf');
    expect(sniff(bytes('%PDF-1.7\n'), false, strict)).toBe('application/pdf');
    expect(sniff(bytes('%PDF'), true, strict)).not.toBe('application/pdf');
  });

  it('keeps text whose last multi-byte character is cut by the sniff window', () => {
    const text = Buffer.from('ქართული', 'utf8');
    expect(sniff(text.subarray(0, text.length - 1), false)).toBe('text/plain');
    expect(sniff(text.subarray(0, text.length - 1), true)).toBeNull();
  });
});

describe('ClamdScanner (INSTREAM)', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  /** Fake clamd: decodes the INSTREAM frames and answers with `reply(payload)`. */
  async function fakeClamd(reply: (payload: Buffer, command: string) => string) {
    server = createServer((socket) => {
      let buf = Buffer.alloc(0);
      socket.on('data', (d: Buffer) => {
        buf = Buffer.concat([buf, d]);
        const nul = buf.indexOf(0);
        if (nul < 0) return;
        const command = buf.subarray(0, nul).toString();
        if (command === 'zPING') return void socket.end('PONG\0');
        // Frames: 4-byte big-endian length + data, ended by a zero length.
        let at = nul + 1;
        const parts: Buffer[] = [];
        while (buf.length >= at + 4) {
          const n = buf.readUInt32BE(at);
          if (n === 0) return void socket.end(reply(Buffer.concat(parts), command));
          if (buf.length < at + 4 + n) return;
          parts.push(buf.subarray(at + 4, at + 4 + n));
          at += 4 + n;
        }
      });
    });
    await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
    return new ClamdScanner('127.0.0.1', (server!.address() as AddressInfo).port);
  }

  async function* chunks(...parts: Buffer[]) {
    for (const p of parts) yield p;
  }

  it('streams every byte in frames and reports a clean file', async () => {
    let received: Buffer = Buffer.alloc(0);
    const scanner = await fakeClamd((payload, command) => {
      expect(command).toBe('zINSTREAM');
      received = payload;
      return 'stream: OK\0';
    });
    const big = Buffer.alloc(200 * 1024, 7); // larger than one 64 KB frame
    await expect(scanner.scan(chunks(Buffer.from('head'), big))).resolves.toEqual({
      infected: false,
    });
    expect(received.equals(Buffer.concat([Buffer.from('head'), big]))).toBe(true);
  });

  it('reports the signature of an infected file', async () => {
    const scanner = await fakeClamd(() => 'stream: Eicar-Test-Signature FOUND\0');
    await expect(scanner.scan(chunks(Buffer.from('X5O!P%@AP')))).resolves.toEqual({
      infected: true,
      signature: 'Eicar-Test-Signature',
    });
  });

  it('treats a size-limit answer as an error, never as clean (Q-154)', async () => {
    const scanner = await fakeClamd(() => 'INSTREAM size limit exceeded. ERROR\0');
    await expect(scanner.scan(chunks(Buffer.from('x')))).rejects.toThrow(/size limit/);
  });

  it('fails when clamd is unreachable (the scan is retried later)', async () => {
    const scanner = new ClamdScanner('127.0.0.1', 1);
    await expect(scanner.scan(chunks(Buffer.from('x')))).rejects.toThrow();
  });

  it('answers PING', async () => {
    const scanner = await fakeClamd(() => '');
    await expect(scanner.ping()).resolves.toBeUndefined();
  });

  it('parses replies strictly', () => {
    expect(parseClamdReply('stream: OK\n')).toEqual({ infected: false });
    expect(() => parseClamdReply('')).toThrow();
    expect(() => parseClamdReply('stream: lstat() failed ERROR')).toThrow();
  });
});

describe('retry back-off', () => {
  it('doubles from 30 s up to 30 min', () => {
    expect([1, 2, 3, 7, 20].map(retryDelaySeconds)).toEqual([30, 60, 120, 1800, 1800]);
  });
});
