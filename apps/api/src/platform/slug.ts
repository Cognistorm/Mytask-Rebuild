// URL slugs as legacy Laravel `Str::slug($text)` made them (ADR-006 §8): Georgian letters transliterated to
// Latin, other letters stripped of accents, everything else dropped, words joined by `-`. The table matches the
// live slugs (e.g. `/service/produqtis-sareklamo-vizualebis-sheqmna-…`, `veb-saitis-atsyoba`, `montazhi`,
// `aghdgena`, `mkhardacheris`). Used by skills (spec 02 AC-19), gigs (spec 04 AC-33) and portfolio items.
import { randomBytes } from 'node:crypto';

const GEORGIAN: Record<string, string> = {
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: 'k',
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: 'p',
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: 't',
  უ: 'u',
  ფ: 'f',
  ქ: 'q',
  ღ: 'gh',
  ყ: 'y',
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: 'ts',
  ჭ: 'ch',
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
};

/** Mtavruli capitals (U+1C90…U+1CBA) are the Mkhedruli letters (U+10D0…) shifted by 0xBC0. */
function mkhedruli(ch: string): string {
  const code = ch.codePointAt(0)!;
  return code >= 0x1c90 && code <= 0x1cba ? String.fromCodePoint(code - 0xbc0) : ch;
}

export function slugify(text: string): string {
  const latin = [...text]
    .map((ch) => GEORGIAN[mkhedruli(ch)] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  return latin
    .replace(/_/g, '-')
    .replace(/@/g, '-at-')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Public uid of gigs and portfolio items: 20 uppercase hex characters (legacy `uid`, url-map §4.1). */
export function newPublicUid(): string {
  return randomBytes(10).toString('hex').toUpperCase();
}

/**
 * `{slug}-{uid}` of gig and portfolio URLs (spec 00 R-5.9, spec 04 AC-33): the slug of the Georgian title cut to
 * 138 characters, then the uid. Readers take the text after the last `-` as the uid.
 */
export function uidSlug(title: string, uid: string): string {
  return `${slugify(title).slice(0, 138)}-${uid}`;
}
