// Gig wizard form model and pre-check (spec 04 AC-4…AC-9; screen 03). The API checks everything again
// (`apps/api/src/modules/gigs/gig-input.ts`); these rules only spare a round trip and use the same field names and
// message keys, so an error from either side lands on the same field. Blocks of the second half (upgrades, FAQ,
// gallery, SEO) join in ROADMAP 4.3.10.
import type { TFunction } from 'i18next';
import { contentLength, englishFieldIssue, georgianFieldIssue } from '@mytask/i18n';

/** Rich text as the editor gives it: HTML to send, plain text to check. */
export interface RichValue {
  html: string;
  text: string;
}

export interface GigDraft {
  titleKa: string;
  titleEn: string;
  categoryId: string;
  subcategoryId: string;
  childCategoryId: string;
  descriptionKa: RichValue;
  descriptionEn: RichValue;
  /** As typed, in GEL. */
  price: string;
  /** '' until chosen, else one of DELIVERY_DAYS. */
  deliveryDays: string;
  /** As typed. */
  revisions: string;
}

export const EMPTY_DRAFT: GigDraft = {
  titleKa: '',
  titleEn: '',
  categoryId: '',
  subcategoryId: '',
  childCategoryId: '',
  descriptionKa: { html: '', text: '' },
  descriptionEn: { html: '', text: '' },
  price: '',
  deliveryDays: '',
  revisions: '',
};

/** Contract `GigDeliveryDays` with the legacy labels (AC-8). */
export const DELIVERY_DAYS: readonly { days: number; label: string }[] = [
  { days: 0, label: 't_none' },
  { days: 1, label: 't_1_day' },
  { days: 2, label: 't_2_days' },
  { days: 3, label: 't_3_days' },
  { days: 4, label: 't_4_days' },
  { days: 5, label: 't_5_days' },
  { days: 6, label: 't_6_days' },
  { days: 7, label: 't_1_week' },
  { days: 14, label: 't_2_weeks' },
  { days: 21, label: 't_3_weeks' },
  { days: 30, label: 't_1_month' },
];

export type BlockId = 'overview' | 'pricing';

/** Fields of each block in page order (also the focus order of AC-19). Names = the API's `details.fields`. */
export const BLOCK_FIELDS: Record<BlockId, readonly string[]> = {
  overview: [
    'title.ka',
    'title.en',
    'categoryId',
    'subcategoryId',
    'childCategoryId',
    'description.ka',
    'description.en',
  ],
  pricing: ['price', 'deliveryDays', 'revisionsAllowed'],
};

export const TITLE = { min: 3, max: 100 };
const DESCRIPTION_MIN = 10;
/** P-35: at least 1.00 GEL; legacy 10 characters = at most 9,999,999.99 GEL (contract `GigCreateRequest`). */
const MIN_PRICE_TETRI = 100;
const MAX_PRICE_TETRI = 999_999_999;
const PRICE_FORMAT = /^\d+([.,]\d{1,2})?$/;

/** "250", "250.5", "250,50" → tetri; null when the text is not an amount (legacy `^\d+(\.\d{1,2})?$`). */
export function toTetri(text: string): number | null {
  const value = text.trim();
  if (!PRICE_FORMAT.test(value)) return null;
  const [whole, fraction = ''] = value.split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function checkText(
  t: TFunction,
  text: string,
  lang: 'ka' | 'en',
  length: { min: number; max?: number },
): string | undefined {
  const n = contentLength(text);
  if (n < length.min) return t('t_validator_min', { min: length.min });
  if (length.max !== undefined && n > length.max) return t('t_validator_max', { max: length.max });
  const issue = lang === 'ka' ? georgianFieldIssue(text) : englishFieldIssue(text);
  return issue ? t(issue.messageKey, issue.params) : undefined;
}

/** Every field error of the built blocks, by field name (AC-19: all at once). */
export function validateDraft(
  draft: GigDraft,
  t: TFunction,
  maxRevisions: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const put = (field: string, message: string | undefined) => {
    if (message) errors[field] = message;
  };
  const required = t('t_validator_required');

  // Overview (AC-4…AC-6): Georgian required, English optional (blank = not given).
  put(
    'title.ka',
    contentLength(draft.titleKa) === 0 ? required : checkText(t, draft.titleKa, 'ka', TITLE),
  );
  if (contentLength(draft.titleEn) > 0) put('title.en', checkText(t, draft.titleEn, 'en', TITLE));
  if (!draft.categoryId) put('categoryId', required);
  if (!draft.subcategoryId) put('subcategoryId', required);
  if (!draft.childCategoryId) put('childCategoryId', required);
  const descKa = draft.descriptionKa.text;
  put(
    'description.ka',
    contentLength(descKa) === 0 ? required : checkText(t, descKa, 'ka', { min: DESCRIPTION_MIN }),
  );
  if (contentLength(draft.descriptionEn.text) > 0) {
    put('description.en', checkText(t, draft.descriptionEn.text, 'en', { min: DESCRIPTION_MIN }));
  }

  // Pricing (AC-8, AC-9).
  const tetri = toTetri(draft.price);
  if (!draft.price.trim()) put('price', required);
  else if (tetri === null) put('price', t('t_validator_regex'));
  else if (tetri < MIN_PRICE_TETRI) put('price', t('t_price_min', { min: MIN_PRICE_TETRI / 100 }));
  else if (tetri > MAX_PRICE_TETRI) put('price', t('t_validator_max', { max: 10 }));
  if (!draft.deliveryDays) put('deliveryDays', required);
  const revisions = draft.revisions.trim();
  if (!/^\d+$/.test(revisions) || Number(revisions) > maxRevisions) {
    put('revisionsAllowed', t('t_validator_revisions_range', { max: maxRevisions }));
  }
  return errors;
}

/** Has the user typed or chosen anything in the block yet? */
export function blockStarted(draft: GigDraft, block: BlockId): boolean {
  if (block === 'overview') {
    return !!(
      draft.titleKa.trim() ||
      draft.titleEn.trim() ||
      draft.categoryId ||
      draft.descriptionKa.text ||
      draft.descriptionEn.text
    );
  }
  return !!(draft.price.trim() || draft.deliveryDays || draft.revisions.trim());
}
