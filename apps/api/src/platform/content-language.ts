// Character rules of Georgian and English content fields (spec 00 R-5.3a P-136, R-5.4; spec 04 AC-5, AC-6; spec 10
// AC-3, AC-4). The rules themselves live in `packages/i18n/content-language.json`, which web and mobile read for
// their pre-check, so all three refuse the same characters. Lengths are not checked here: each spec counts them.
import rules from '@mytask/i18n/content-language.json';
import { richTextPlainText } from './rich-text/rich-text';

type Range = readonly [number, number];

/** One refused field, shaped as the contract's `FieldError` without the translated `message`. */
export interface ContentFieldIssue {
  field: string;
  code: 'georgian_field_characters' | 'georgian_letter_required' | 'georgian_letters_not_allowed';
  messageKey: string;
  params?: { chars: string };
  refusedCharacters?: string[];
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

/**
 * R-5.3a step 1: formatted text loses its markup and entities (`formatted`), the no-break, zero-width and BOM
 * spaces become normal spaces, the ends are trimmed. Code points, not UTF-16 units: an emoji is one character.
 */
export function normaliseContentText(text: string, formatted = false): string {
  const plain = formatted ? richTextPlainText(text) : text;
  return [...plain]
    .map((ch) => (AS_SPACE.has(ch.codePointAt(0)!) ? ' ' : ch))
    .join('')
    .trim();
}

/**
 * Georgian title/description (R-5.3a): every character in the allowed set, else `georgian_field_characters`
 * listing each refused character once in order of first appearance (at most 10); then at least one Georgian
 * letter, else `georgian_letter_required` (P-37). Null = valid. Empty text is the caller's `required` rule.
 */
export function checkGeorgianField(
  field: string,
  text: string,
  formatted = false,
): ContentFieldIssue | null {
  const clean = normaliseContentText(text, formatted);
  const refused: string[] = [];
  for (const ch of clean) {
    if (inRanges(ch.codePointAt(0)!, GEORGIAN_FIELD) || refused.includes(ch)) continue;
    refused.push(ch);
    if (refused.length === rules.georgianField.maxRefusedListed) break;
  }
  if (refused.length > 0) {
    return {
      field,
      code: 'georgian_field_characters',
      messageKey: 't_validator_georgian_field_characters',
      params: { chars: refused.join(' ') },
      refusedCharacters: refused,
    };
  }
  if (!hasAny(clean, GEORGIAN_LETTERS)) {
    return {
      field,
      code: 'georgian_letter_required',
      messageKey: 't_validator_georgian_letter_required',
      refusedCharacters: [],
    };
  }
  return null;
}

/** English title/description (R-5.4, AC-6): no Georgian letter and at least one Latin letter. Null = valid. */
export function checkEnglishField(
  field: string,
  text: string,
  formatted = false,
): ContentFieldIssue | null {
  const clean = normaliseContentText(text, formatted);
  if (!hasAny(clean, GEORGIAN_LETTERS) && hasAny(clean, LATIN_LETTERS)) return null;
  return { field, code: 'georgian_letters_not_allowed', messageKey: 't_validator_english_only' };
}

/** The contract's `FieldError`: the issue with its message in the request language. */
export function contentFieldError(
  issue: ContentFieldIssue,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  return { ...issue, message: t(issue.messageKey, issue.params) };
}
