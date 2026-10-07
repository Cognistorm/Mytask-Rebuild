// Pre-check of Georgian and English content fields for web and mobile (spec 00 R-5.3a P-136, R-5.4; spec 04 AC-5,
// AC-6; spec 10 AC-3, AC-4). The rules are `content-language.json`, the same file the API validator reads
// (`apps/api/src/platform/content-language.ts`), so a field refused here is refused there with the same key.
// Works on plain text: a formatted field passes its text without markup (the editor's text content).
import rules from '../content-language.json';

type Range = readonly [number, number];

/** A refused field: the translation key with its parameters (as the API's `FieldError`). */
export interface ContentLanguageIssue {
  code: 'georgian_field_characters' | 'georgian_letter_required' | 'georgian_letters_not_allowed';
  messageKey: string;
  params?: { chars: string };
}

const ranges = (list: readonly (readonly number[])[]): Range[] =>
  list.map(([from, to]) => [from!, to!] as const);
const GEORGIAN_LETTERS = ranges(rules.georgianLetters);
const LATIN_LETTERS = ranges(rules.latinLetters);
const GEORGIAN_FIELD = ranges(rules.georgianField.allowed);
const AS_SPACE = new Set(rules.normalise.asSpace);

const inRanges = (code: number, list: readonly Range[]) =>
  list.some(([from, to]) => code >= from && code <= to);
const hasAny = (text: string, list: readonly Range[]) =>
  [...text].some((ch) => inRanges(ch.codePointAt(0)!, list));

/** No-break, zero-width and BOM spaces become normal spaces; the ends are trimmed (R-5.3a step 1). */
export function normaliseContentText(plain: string): string {
  return [...plain]
    .map((ch) => (AS_SPACE.has(ch.codePointAt(0)!) ? ' ' : ch))
    .join('')
    .trim();
}

/** Length in characters as the API counts them (code points, an emoji is one). */
export function contentLength(plain: string): number {
  return [...normaliseContentText(plain)].length;
}

/**
 * Georgian field (R-5.3a): every character in the allowed set, else the refused characters once each, in order
 * (at most 10); then at least one Georgian letter (P-37). Null = valid. Empty text is the caller's `required`.
 */
export function georgianFieldIssue(plain: string): ContentLanguageIssue | null {
  const clean = normaliseContentText(plain);
  const refused: string[] = [];
  for (const ch of clean) {
    if (inRanges(ch.codePointAt(0)!, GEORGIAN_FIELD) || refused.includes(ch)) continue;
    refused.push(ch);
    if (refused.length === rules.georgianField.maxRefusedListed) break;
  }
  if (refused.length > 0) {
    return {
      code: 'georgian_field_characters',
      messageKey: 't_validator_georgian_field_characters',
      params: { chars: refused.join(' ') },
    };
  }
  if (!hasAny(clean, GEORGIAN_LETTERS)) {
    return { code: 'georgian_letter_required', messageKey: 't_validator_georgian_letter_required' };
  }
  return null;
}

/** English field (R-5.4, AC-6): no Georgian letter and at least one Latin letter. Null = valid. */
export function englishFieldIssue(plain: string): ContentLanguageIssue | null {
  const clean = normaliseContentText(plain);
  if (!hasAny(clean, GEORGIAN_LETTERS) && hasAny(clean, LATIN_LETTERS)) return null;
  return { code: 'georgian_letters_not_allowed', messageKey: 't_validator_english_only' };
}
