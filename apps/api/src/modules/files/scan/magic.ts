// Real file type from the first bytes ("magic bytes", ADR-009 §3.5): a `.jpg` that is really HTML is
// rejected. Covers every type a purpose may allow today or in its slice: images (avatar, portfolio, KYC,
// gigs), PDF (gig documents), and the appeal types of Q-154 (doc, docx, txt, mp4, mov, avi, mkv, webm).

/** How many leading bytes `sniff` needs (docx names its parts in the first zip entries). */
export const SNIFF_BYTES = 64 * 1024;

/** The type `sniff` reports for a file with this extension; a purpose allows the types of its extensions. */
export const DETECTED_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
};

const ascii = (b: Buffer, start: number, end: number) => b.toString('latin1', start, end);
const startsWith = (b: Buffer, bytes: readonly number[], offset = 0) =>
  b.length >= offset + bytes.length && bytes.every((v, i) => b[offset + i] === v);

/** ISO base media (`ftyp` box): mp4, mov, but also HEIC/AVIF photos, which are not videos. */
function isoBrand(brand: string): string {
  if (brand === 'qt  ') return 'video/quicktime';
  if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  if (brand === 'avif' || brand === 'avis') return 'image/avif';
  if (brand.startsWith('3g')) return 'video/3gpp';
  if (brand === 'M4A ' || brand === 'M4B ') return 'audio/mp4';
  return 'video/mp4';
}

/** Drops a multi-byte UTF-8 character cut off at the end of the sniffed part. */
function withoutPartialChar(b: Buffer): Buffer {
  for (let i = 1; i <= Math.min(3, b.length); i++) {
    const byte = b[b.length - i]!;
    if ((byte & 0xc0) === 0x80) continue; // continuation byte: look further back for the lead byte
    const length = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc0 ? 2 : 1;
    return length > i ? b.subarray(0, b.length - i) : b;
  }
  return b;
}

/** Plain text: valid UTF-8 without NUL or other binary control characters. */
function isText(head: Buffer, complete: boolean): boolean {
  if (head.length === 0) return false;
  try {
    const bytes = complete ? head : withoutPartialChar(head);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // eslint-disable-next-line no-control-regex -- binary control characters are what we look for
    return !/[\u0000-\u0008\u000e-\u001a\u001c-\u001f\u007f]/.test(text);
  } catch {
    return false;
  }
}

/**
 * MIME type of a file from its first bytes, or `null` when unknown. `complete` = `head` is the whole file
 * (matters only for the text check). `pdfAtStart` = a PDF must begin with `%PDF-` at byte 0: for files served
 * publicly as uploaded, where an HTML or SVG file with `%PDF-` further in must not pass (review 10 SEC-80 (a)).
 */
export function sniff(
  head: Buffer,
  complete = false,
  { pdfAtStart = false }: { pdfAtStart?: boolean } = {},
): string | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (head.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(head, 0, 6))) return 'image/gif';
  if (head.length >= 12 && ascii(head, 0, 4) === 'RIFF') {
    const kind = ascii(head, 8, 12);
    if (kind === 'WEBP') return 'image/webp';
    if (kind === 'AVI ') return 'video/x-msvideo';
    return null;
  }
  // PDF readers accept the header anywhere in the first 1024 bytes; public files must start with it.
  if (
    pdfAtStart
      ? ascii(head, 0, 5) === '%PDF-'
      : ascii(head, 0, Math.min(head.length, 1024)).includes('%PDF-')
  )
    return 'application/pdf';
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
    return 'application/msword';
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    const names = ascii(head, 0, head.length);
    return names.includes('word/') || names.includes('[Content_Types].xml')
      ? DETECTED_BY_EXTENSION.docx!
      : 'application/zip';
  }
  if (head.length >= 12 && ascii(head, 4, 8) === 'ftyp') return isoBrand(ascii(head, 8, 12));
  if (
    head.length >= 8 &&
    ['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].includes(ascii(head, 4, 8))
  )
    return 'video/quicktime';
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) {
    // EBML header: the DocType says which flavour of Matroska it is.
    const header = ascii(head, 0, Math.min(head.length, 64));
    if (header.includes('webm')) return 'video/webm';
    if (header.includes('matroska')) return 'video/x-matroska';
    return null;
  }
  if (isText(head, complete)) return 'text/plain';
  return null;
}
