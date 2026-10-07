// Gig wizard form model and pre-check (spec 04 AC-4…AC-9; screen 03). The API checks everything again
// (`apps/api/src/modules/gigs/gig-input.ts`); these rules only spare a round trip and use the same field names and
// message keys, so an error from either side lands on the same field.
import type { TFunction } from 'i18next';
import { contentLength, englishFieldIssue, georgianFieldIssue } from '@mytask/i18n';

/** Rich text as the editor gives it: HTML to send, plain text to check. */
export interface RichValue {
  html: string;
  text: string;
}

/** An upgrade row (AC-11); `key` only keeps React rows stable. Price as typed, extra days '' until chosen. */
export interface UpgradeDraft {
  key: number;
  title: string;
  price: string;
  extraDays: string;
}

/** A FAQ row (AC-12). */
export interface FaqDraft {
  key: number;
  question: string;
  answer: string;
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
  upgrades: UpgradeDraft[];
  faqs: FaqDraft[];
  seo: { title: string; description: string };
  /** Ready file ids in display order (AC-14, AC-23); `busy` = an upload or scan is still running. */
  gallery: GalleryDraft;
}

export interface GalleryDraft {
  thumbnail: string[];
  images: string[];
  documents: string[];
  busy: boolean;
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
  upgrades: [],
  faqs: [],
  seo: { title: '', description: '' },
  gallery: { thumbnail: [], images: [], documents: [], busy: false },
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

export type BlockId = 'overview' | 'pricing' | 'upgrades' | 'faq' | 'gallery' | 'seo';

/** Blocks in page order; only the required ones count in the summary's progress. */
export const BLOCKS: readonly { id: BlockId; required: boolean }[] = [
  { id: 'overview', required: true },
  { id: 'pricing', required: true },
  { id: 'upgrades', required: false },
  { id: 'faq', required: false },
  { id: 'gallery', required: true },
  { id: 'seo', required: false },
];

/** Contract `GigCreateRequest` `maxItems` (AC-11, AC-12). */
export const MAX_UPGRADES = 10;
export const MAX_FAQS = 10;

/** Fields of each block in page order (also the focus order of AC-19). Names = the API's `details.fields`. */
export function blockFields(draft: GigDraft): Record<BlockId, string[]> {
  return {
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
    upgrades: draft.upgrades.flatMap((_, i) =>
      ['title', 'price', 'extraDays'].map((f) => `upgrades[${i}].${f}`),
    ),
    faq: draft.faqs.flatMap((_, i) => ['question', 'answer'].map((f) => `faqs[${i}].${f}`)),
    gallery: ['thumbnailFileId', 'imageFileIds', 'documentFileIds'],
    seo: ['seo'],
  };
}

/**
 * Field names after row `index` of `list` was removed: that row's names go, later rows move up one, so a shown
 * error stays on its row.
 */
export function shiftRowFields(
  fields: ReadonlySet<string>,
  list: 'upgrades' | 'faqs',
  index: number,
): Set<string> {
  const row = new RegExp(`^${list}\\[(\\d+)\\](.*)$`);
  const next = new Set<string>();
  for (const field of fields) {
    const m = row.exec(field);
    if (!m) next.add(field);
    else if (Number(m[1]) > index) next.add(`${list}[${Number(m[1]) - 1}]${m[2]}`);
    else if (Number(m[1]) < index) next.add(field);
  }
  return next;
}

export const TITLE = { min: 3, max: 100 };
/** AC-11, AC-12, AC-15 (contract `GigUpgradeInput`, `GigFaqInput`, `GigSeoInput`). */
export const UPGRADE_TITLE_MAX = 100;
export const FAQ = { questionMax: 100, answerMax: 300 };
export const SEO = { titleMax: 100, descriptionMax: 150 };
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

/** AC-8 (also each upgrade's price, AC-11). */
function priceIssue(t: TFunction, text: string): string | undefined {
  const tetri = toTetri(text);
  if (!text.trim()) return t('t_validator_required');
  if (tetri === null) return t('t_validator_regex');
  if (tetri < MIN_PRICE_TETRI) return t('t_price_min', { min: MIN_PRICE_TETRI / 100 });
  if (tetri > MAX_PRICE_TETRI) return t('t_validator_max', { max: 10 });
  return undefined;
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
  put('price', priceIssue(t, draft.price));
  if (!draft.deliveryDays) put('deliveryDays', required);
  const revisions = draft.revisions.trim();
  if (!/^\d+$/.test(revisions) || Number(revisions) > maxRevisions) {
    put('revisionsAllowed', t('t_validator_revisions_range', { max: maxRevisions }));
  }

  // Upgrades (AC-11): title not blank, price as AC-8, extra days from the delivery list.
  draft.upgrades.forEach((u, i) => {
    if (!contentLength(u.title)) put(`upgrades[${i}].title`, required);
    put(`upgrades[${i}].price`, priceIssue(t, u.price));
    if (!u.extraDays) put(`upgrades[${i}].extraDays`, required);
  });
  // FAQ (AC-12): neither text blank (the lengths are capped by the inputs).
  draft.faqs.forEach((f, i) => {
    if (!contentLength(f.question)) put(`faqs[${i}].question`, required);
    if (!contentLength(f.answer)) put(`faqs[${i}].answer`, required);
  });
  // Gallery (AC-14): a thumbnail and at least one image; the uploaders keep the counts and types within the limits.
  if (draft.gallery.thumbnail.length === 0) put('thumbnailFileId', required);
  if (draft.gallery.images.length === 0) put('imageFileIds', required);
  // SEO (AC-15): both or none.
  if (!contentLength(draft.seo.title) !== !contentLength(draft.seo.description)) {
    put('seo', t('t_seo_both_fields_required'));
  }
  return errors;
}

/** Has the user typed or chosen anything in the block yet? */
export function blockStarted(draft: GigDraft, block: BlockId): boolean {
  switch (block) {
    case 'overview':
      return !!(
        draft.titleKa.trim() ||
        draft.titleEn.trim() ||
        draft.categoryId ||
        draft.descriptionKa.text ||
        draft.descriptionEn.text
      );
    case 'pricing':
      return !!(draft.price.trim() || draft.deliveryDays || draft.revisions.trim());
    case 'upgrades':
      return draft.upgrades.length > 0;
    case 'faq':
      return draft.faqs.length > 0;
    case 'gallery':
      return !!(
        draft.gallery.busy ||
        draft.gallery.thumbnail.length ||
        draft.gallery.images.length ||
        draft.gallery.documents.length
      );
    case 'seo':
      return !!(draft.seo.title.trim() || draft.seo.description.trim());
  }
}
