// Field rules of the gig wizard (spec 04 AC-4…AC-15, R-G1, R-G2, R-G9) beyond what the contract schema already
// checks. Every rule adds to one list, so a submit gets all field errors at once (AC-19). Each block is its own
// function: `createGig` runs them all, `updateGig` (4.3.3c) only the blocks that were sent.
import type { components } from '@mytask/types';
import {
  checkEnglishField,
  checkGeorgianField,
  normaliseContentText,
  type ContentFieldIssue,
} from '../../platform/content-language';

type S = components['schemas'];

/** A `FieldError` without the translated `message` (added once, when the error is thrown). */
export interface FieldIssue {
  field: string;
  code: string;
  messageKey: string;
  params?: Record<string, string | number>;
  refusedCharacters?: string[];
}

export interface Localized {
  ka: string;
  en: string | null;
}

/** Legacy price rule `^\d+(\.\d{1,2})?$`, at most 10 characters: 9,999,999.99 GEL (contract `GigCreateRequest`). */
export const MAX_PRICE_TETRI = 999_999_999;
export const MIN_PRICE_TETRI = 100;
const TITLE = { min: 3, max: 100 };
const DESCRIPTION_MIN = 10;

const chars = (text: string) => [...text].length;
const asIssue = (issue: ContentFieldIssue): FieldIssue => issue;

/** AC-4…AC-6: Georgian required, English optional (blank = not given); trimmed, spaces normalised. */
export function checkTitle(issues: FieldIssue[], input: S['GigTitleInput']): Localized {
  const one = (lang: 'ka' | 'en', raw: string) => {
    const field = `title.${lang}`;
    const text = normaliseContentText(raw);
    const n = chars(text);
    if (n < TITLE.min) {
      issues.push({
        field,
        code: 'too_short',
        messageKey: 't_validator_min',
        params: { min: TITLE.min },
      });
    } else if (n > TITLE.max) {
      issues.push({
        field,
        code: 'too_long',
        messageKey: 't_validator_max',
        params: { max: TITLE.max },
      });
    } else {
      const issue =
        lang === 'ka' ? checkGeorgianField(field, text) : checkEnglishField(field, text);
      if (issue) issues.push(asIssue(issue));
    }
    return text;
  };
  const en = input.en == null || !normaliseContentText(input.en) ? null : one('en', input.en);
  return { ka: one('ka', input.ka), en };
}

/**
 * AC-4…AC-6: `sanitise` is the `user_text` profile (bold, italic, lists, line breaks); length and letters are
 * checked on the text without formatting. Returns the sanitised HTML that is stored.
 */
export function checkDescription(
  issues: FieldIssue[],
  input: S['GigDescriptionInput'],
  sanitise: (html: string) => string,
): Localized {
  const one = (lang: 'ka' | 'en', raw: string) => {
    const field = `description.${lang}`;
    const html = sanitise(raw);
    if (chars(normaliseContentText(html, true)) < DESCRIPTION_MIN) {
      issues.push({
        field,
        code: 'too_short',
        messageKey: 't_validator_min',
        params: { min: DESCRIPTION_MIN },
      });
    } else {
      const issue =
        lang === 'ka'
          ? checkGeorgianField(field, html, true)
          : checkEnglishField(field, html, true);
      if (issue) issues.push(asIssue(issue));
    }
    return html;
  };
  const en =
    input.en == null || !normaliseContentText(sanitise(input.en), true)
      ? null
      : one('en', input.en);
  return { ka: one('ka', input.ka), en };
}

/** AC-8, P-35: at least 1.00 GEL; at most 10 characters as legacy (`t_validator_max` with 10, its message). */
export function checkPrice(issues: FieldIssue[], field: string, price: S['Money']): bigint {
  if (price.amount < MIN_PRICE_TETRI) {
    issues.push({ field, code: 'out_of_range', messageKey: 't_price_min', params: { min: 1 } });
  } else if (price.amount > MAX_PRICE_TETRI) {
    issues.push({
      field,
      code: 'out_of_range',
      messageKey: 't_validator_max',
      params: { max: 10 },
    });
  }
  return BigInt(price.amount);
}

/** AC-9, AC-10: 0…S-041 as it is today (the schema already refuses decimals and negatives). */
export function checkRevisions(issues: FieldIssue[], value: number, max: number): number {
  if (value > max) {
    issues.push({
      field: 'revisionsAllowed',
      code: 'out_of_range',
      messageKey: 't_validator_revisions_range',
      params: { max },
    });
  }
  return value;
}

export interface UpgradeData {
  id: string | null;
  title: string;
  priceTetri: bigint;
  extraDays: number;
}

/** AC-11, R-G9: title (not blank, ≤ 100), price as AC-8, extra days from the delivery list; ≤ 10 by schema. */
export function checkUpgrades(issues: FieldIssue[], input: S['GigUpgradeInput'][]): UpgradeData[] {
  return input.map((u, i) => {
    const title = normaliseContentText(u.title);
    if (!title) {
      issues.push({
        field: `upgrades[${i}].title`,
        code: 'required',
        messageKey: 't_validator_required',
      });
    }
    return {
      id: u.id ?? null,
      title,
      priceTetri: checkPrice(issues, `upgrades[${i}].price`, u.price),
      extraDays: u.extraDays,
    };
  });
}

/** AC-12: question (≤ 100) and answer (≤ 300), neither blank; ≤ 10 by schema. */
export function checkFaqs(
  issues: FieldIssue[],
  input: S['GigFaqInput'][],
): { question: string; answer: string }[] {
  return input.map((f, i) => {
    const question = normaliseContentText(f.question);
    const answer = normaliseContentText(f.answer);
    for (const [name, value] of [
      ['question', question],
      ['answer', answer],
    ] as const) {
      if (!value) {
        issues.push({
          field: `faqs[${i}].${name}`,
          code: 'required',
          messageKey: 't_validator_required',
        });
      }
    }
    return { question, answer };
  });
}

/** AC-15: both fields or none. Two blank fields count as none; one blank field refuses both. */
export function checkSeo(
  issues: FieldIssue[],
  input: S['GigSeoInput'] | null | undefined,
): { title: string; description: string } | null {
  if (!input) return null;
  const title = normaliseContentText(input.title);
  const description = normaliseContentText(input.description);
  if (!title && !description) return null;
  if (!title || !description) {
    issues.push({ field: 'seo', code: 'required', messageKey: 't_seo_both_fields_required' });
  }
  return { title, description };
}

/** AC-14, AC-23: a file list in display order, each id once, at most `max` (`t_validator_max_array`). */
export function checkFileList(
  issues: FieldIssue[],
  field: string,
  ids: readonly string[],
  max: number,
): string[] {
  const unique = [...new Set(ids)];
  if (unique.length > max) {
    issues.push({ field, code: 'max_items', messageKey: 't_validator_max_array', params: { max } });
  }
  return unique;
}

export interface CategoryRow {
  id: string;
  parentId: string | null;
}

/** AC-4: a top-level category, a sub-category under it and a child category under that. */
export function checkCategoryChain(
  issues: FieldIssue[],
  ids: { categoryId: string; subcategoryId: string; childCategoryId: string },
  rows: readonly CategoryRow[],
): void {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const wrong = (field: string) =>
    issues.push({ field, code: 'not_allowed', messageKey: 't_validator_exists' });
  const top = byId.get(ids.categoryId);
  const sub = byId.get(ids.subcategoryId);
  const child = byId.get(ids.childCategoryId);
  if (!top || top.parentId !== null) wrong('categoryId');
  if (!sub || sub.parentId !== ids.categoryId) wrong('subcategoryId');
  if (!child || child.parentId !== ids.subcategoryId) wrong('childCategoryId');
}
