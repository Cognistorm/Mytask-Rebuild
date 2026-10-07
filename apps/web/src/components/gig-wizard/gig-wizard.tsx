'use client';
// Gig create wizard `/create` (spec 04 AC-1…AC-9, AC-19; screen docs/05-design/screens/03-gig-create-wizard.md;
// legacy `livewire/main/create/create.blade.php`): one page with the blocks in the legacy order and a side summary
// (Stepper) with each block's status. Opening checks the plan limit (AC-2, `getGigCreationEligibility`); guests go
// to login and back (AC-1). ROADMAP 4.3.9 built the entry, Overview and Pricing; 4.3.10a Upgrades, FAQ and the SEO
// dialog (AC-11, AC-12, AC-15); 4.3.10b the Gallery (AC-14); 4.3.10c the submit (`createGig`: server field errors on
// the same fields, plan limit AC-3, success screens AC-16) and "Discard changes?" on leaving; 4.3.10d…e add edit mode
// and the phone step mode.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  Dialog,
  EmptyState,
  Field,
  PriceInput,
  QuantityInput,
  RichTextEditor,
  Select,
  Skeleton,
  Stepper,
  TextArea,
  type StepItem,
  type StepStatus,
} from '@mytask/ui/web';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { usePublicConfig } from '../../lib/public-config';
import { GigFiles } from './gig-files';
import {
  blockFields,
  BLOCKS,
  blockStarted,
  DELIVERY_DAYS,
  EMPTY_DRAFT,
  FAQ,
  fieldValue,
  formFieldName,
  MAX_FAQS,
  MAX_UPGRADES,
  SEO,
  shiftRowFields,
  TITLE,
  toCreateRequest,
  UPGRADE_TITLE_MAX,
  validateDraft,
  type BlockId,
  type FaqDraft,
  type GigDraft,
  type UpgradeDraft,
} from './gig-form';
import './gig-wizard.css';

type CategoryNode = components['schemas']['CategoryNode'];
type Eligibility = components['schemas']['GigCreationEligibility'];
type GigOwnerView = components['schemas']['GigOwnerView'];
/** A submit the API refused as a whole: plan limit (AC-3) or anything that names no field. */
type Failure = { kind: 'limit'; limit: number } | { kind: 'general'; message: string };

/** S-041 default (spec 00) while the public config loads. */
const DEFAULT_MAX_REVISIONS = 10;
/** S-077 / S-078 defaults (spec 00) while the public config loads; documents wait for it (S-080 may be OFF). */
const DEFAULT_GIG_IMAGE = { maxFiles: 10, maxSizeMb: 5 };
/** Legacy fixed lists (`GalleryValidator.php:42-54`); the public config may narrow them. */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const DOCUMENT_EXTENSIONS = ['pdf'];
const extensionsOf = (allowed: string[] | undefined, fallback: string[]) =>
  allowed?.length ? allowed.map((e) => e.toLowerCase()) : fallback;

export function GigWizard({ categories }: { categories: CategoryNode[] }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const [eligibility, setEligibility] = useState<Eligibility>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api.GET('/gigs/creation-eligibility').catch(() => undefined);
    if (res?.data) return setEligibility(res.data);
    const status = res?.response.status;
    if (status === 401) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`${href(locale, '/auth/login')}?next=${encodeURIComponent(here)}`);
      return;
    }
    // Restricted users only reach the restrictions removal center (spec 01 AC-19).
    if ((res?.error as { code?: string } | undefined)?.code === 'ACCOUNT_RESTRICTED') {
      router.replace(href(locale, '/restricted'));
      return;
    }
    setFailed(true);
  }, [api, locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div className="mt-gw-state">
        <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
        <button type="button" className="mt-button" onClick={() => void load()}>
          {t('t_ui_retry')}
        </button>
      </div>
    );
  }
  if (!eligibility) {
    return (
      <div className="mt-gw-state">
        <Skeleton label={t('t_ui_loading')} rows={6} />
      </div>
    );
  }
  if (!eligibility.canCreate) {
    // AC-2: the form is not shown at all, so no work is lost.
    return (
      <div className="mt-gw-state" data-testid="gig-limit-reached">
        <EmptyState
          title={t('t_plan_gig_limit_reached', { limit: eligibility.gigLimit ?? 0 })}
          action={
            <a
              className="mt-button mt-button-primary"
              href={`${href(locale, '/subscription')}?gigs=true`}
            >
              {t('t_upgrade_to_premium')}
            </a>
          }
        />
      </div>
    );
  }
  return <GigForm categories={categories} />;
}

function GigForm({ categories }: { categories: CategoryNode[] }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const config = usePublicConfig(locale);
  const maxRevisions = config?.revisions.maxAllowed ?? DEFAULT_MAX_REVISIONS;
  const imageRule = config?.uploads.gigImage;
  const documentRule = config?.uploads.gigDocument;
  const imageExtensions = extensionsOf(imageRule?.allowedExtensions, IMAGE_EXTENSIONS);
  const documentExtensions = extensionsOf(documentRule?.allowedExtensions, DOCUMENT_EXTENSIONS);
  const imageMb = imageRule?.maxSizeMb ?? DEFAULT_GIG_IMAGE.maxSizeMb;
  const [draft, setDraft] = useState<GigDraft>(EMPTY_DRAFT);
  /** Fields whose error is shown: left once (blur) or all after a submit. */
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState<BlockId>('overview');
  const [announce, setAnnounce] = useState('');
  const [seoOpen, setSeoOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstError = useRef(false);
  /** Name of a field to focus after the next render (a row just added). */
  const focusField = useRef<string | null>(null);
  const rowKey = useRef(0);
  const addUpgradeRef = useRef<HTMLButtonElement>(null);
  const addFaqRef = useRef<HTMLButtonElement>(null);
  const [sending, setSending] = useState(false);
  /** API field errors with the value they were given for: one goes away once its field changes (AC-19). */
  const [serverErrors, setServerErrors] = useState<
    Record<string, { message: string; value: string | undefined }>
  >({});
  const [failure, setFailure] = useState<Failure>();
  const failureRef = useRef<HTMLDivElement>(null);
  const [created, setCreated] = useState<GigOwnerView>();
  /** Where a link click wanted to go while the form had changes ("Discard changes?"). */
  const [leaveTo, setLeaveTo] = useState<string>();
  const leaving = useRef(false);

  const clientErrors = useMemo(
    () => validateDraft(draft, t, maxRevisions),
    [draft, t, maxRevisions],
  );
  // The pre-check wins on a field; a server error shows where the pre-check found nothing.
  const errors = useMemo(() => {
    const live: Record<string, string> = {};
    for (const [field, e] of Object.entries(serverErrors)) {
      if (fieldValue(draft, field) === e.value) live[field] = e.message;
    }
    return { ...live, ...clientErrors };
  }, [serverErrors, clientErrors, draft]);
  const errorOf = (field: string) => (shown.has(field) ? errors[field] : undefined);
  const touch = (field: string) => setShown((s) => (s.has(field) ? s : new Set(s).add(field)));
  const set = <K extends keyof GigDraft>(key: K, value: GigDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // AC-4: each level lists only the children of the level above.
  const subcategories = useMemo(
    () => categories.find((c) => c.id === draft.categoryId)?.children ?? [],
    [categories, draft.categoryId],
  );
  const children = useMemo(
    () => subcategories.find((c) => c.id === draft.subcategoryId)?.children ?? [],
    [subcategories, draft.subcategoryId],
  );
  const options = (nodes: CategoryNode[]) => nodes.map((n) => ({ value: n.id, label: n.name }));

  /** AC-4: a change of a higher level resets the lower ones, and says so to screen readers. */
  const chooseLevel = (level: 'categoryId' | 'subcategoryId' | 'childCategoryId', id: string) => {
    const cleared =
      (level === 'categoryId' && (draft.subcategoryId || draft.childCategoryId)) ||
      (level === 'subcategoryId' && draft.childCategoryId);
    setDraft((d) => ({
      ...d,
      [level]: id,
      ...(level === 'categoryId' ? { subcategoryId: '', childCategoryId: '' } : {}),
      ...(level === 'subcategoryId' ? { childCategoryId: '' } : {}),
    }));
    setAnnounce(cleared ? t('t_ui_lower_category_levels_cleared') : '');
    touch(level);
  };

  // AC-11, AC-12: rows are added empty and removed anywhere; a shown error stays on its row.
  const addUpgrade = () => {
    const row: UpgradeDraft = { key: ++rowKey.current, title: '', price: '', extraDays: '' };
    focusField.current = `upgrades[${draft.upgrades.length}].title`;
    setDraft((d) => ({ ...d, upgrades: [...d.upgrades, row] }));
  };
  const addFaq = () => {
    const row: FaqDraft = { key: ++rowKey.current, question: '', answer: '' };
    focusField.current = `faqs[${draft.faqs.length}].question`;
    setDraft((d) => ({ ...d, faqs: [...d.faqs, row] }));
  };
  const setUpgrade = (i: number, patch: Partial<UpgradeDraft>) =>
    setDraft((d) => ({
      ...d,
      upgrades: d.upgrades.map((u, j) => (j === i ? { ...u, ...patch } : u)),
    }));
  const setFaq = (i: number, patch: Partial<FaqDraft>) =>
    setDraft((d) => ({ ...d, faqs: d.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const removeRow = (list: 'upgrades' | 'faqs', i: number) => {
    setDraft((d) => ({ ...d, [list]: d[list].filter((_, j) => j !== i) }));
    setShown((s) => shiftRowFields(s, list, i));
    // The removed row had the focus; the block's Add button is the next sensible place.
    (list === 'upgrades' ? addUpgradeRef : addFaqRef).current?.focus();
  };

  // AC-14: each uploader reports its ready ids in order and whether it is still busy.
  const busyParts = useRef({ thumbnail: false, images: false, documents: false });
  const onFiles = useCallback(
    (part: 'thumbnail' | 'images' | 'documents') => (ids: string[], busy: boolean) => {
      busyParts.current[part] = busy;
      const anyBusy = Object.values(busyParts.current).some(Boolean);
      setDraft((d) => ({ ...d, gallery: { ...d.gallery, [part]: ids, busy: anyBusy } }));
      // Once a file arrived, its list's error shows again if it is emptied.
      const field = {
        thumbnail: 'thumbnailFileId',
        images: 'imageFileIds',
        documents: 'documentFileIds',
      }[part];
      if (ids.length > 0) setShown((s) => (s.has(field) ? s : new Set(s).add(field)));
    },
    [],
  );
  const onThumbnail = useMemo(() => onFiles('thumbnail'), [onFiles]);
  const onImages = useMemo(() => onFiles('images'), [onFiles]);
  const onDocuments = useMemo(() => onFiles('documents'), [onFiles]);

  /** AC-15: Save keeps the dialog open while only one SEO field is filled. */
  const saveSeo = () => {
    touch('seo');
    if (!errors.seo) setSeoOpen(false);
  };

  const fields = blockFields(draft);
  const status = (block: BlockId): StepStatus => {
    const own = fields[block];
    if (own.some((f) => shown.has(f) && errors[f])) return 'error';
    if (!blockStarted(draft, block)) return 'not_started';
    if (block === 'gallery' && draft.gallery.busy) return 'in_progress';
    return own.every((f) => !errors[f]) ? 'complete' : 'in_progress';
  };
  const blockLabel: Record<BlockId, string> = {
    overview: t('t_overview'),
    pricing: t('t_pricing'),
    upgrades: t('t_upgrades'),
    faq: t('t_faq'),
    gallery: t('t_gallery'),
    seo: t('t_seo'),
  };
  const optional = `(${t('t_ui_optional')})`;
  const steps: StepItem[] = BLOCKS.map((b) => ({
    id: `gig-${b.id}`,
    label: blockLabel[b.id],
    status: status(b.id),
    note: b.required ? undefined : optional,
  }));
  // Only the required blocks count (screen 03: "2 of 4 required").
  const required = BLOCKS.filter((b) => b.required);
  const done = required.filter((b) => status(b.id) === 'complete').length;

  // AC-19: after a refused submit the first invalid field (page order) gets the focus. The SEO button marks its
  // error with `data-invalid` (aria-invalid does not belong on a button). A row just added focuses its first field.
  useEffect(() => {
    if (focusField.current) {
      const name = focusField.current;
      focusField.current = null;
      formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.focus();
    }
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')
      ?.focus();
  });

  // A refused submit as a whole moves the focus to its Banner.
  useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);

  // "Discard changes?" (screen 03): a link inside the site asks first; closing the tab or reloading gets the
  // browser's own question. Not after the gig was created.
  const dirty = !created && JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      ) {
        return;
      }
      const url = new URL(link.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin) return;
      if (url.pathname === here.pathname && url.search === here.search) return; // in-page (summary steps)
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.href);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSubmitted(true);
    setFailure(undefined);
    setShown(new Set(Object.values(fields).flat()));
    if (Object.keys(errors).length > 0) {
      focusFirstError.current = true;
      return;
    }
    // Files still on their way cannot be sent yet (legacy `t_pls_wait_until_uploading_finish`).
    if (draft.gallery.busy) return;

    setSending(true);
    const res = await api
      .POST('/gigs', { body: toCreateRequest(draft, !!documentRule?.enabled) })
      .catch(() => undefined);
    setSending(false);
    if (res?.data) {
      setCreated(res.data);
      return;
    }
    const err = res?.error as (ApiErrorBody & { details?: { limit?: number } }) | undefined;
    if (err?.code === 'ACCOUNT_RESTRICTED') return router.replace(href(locale, '/restricted'));
    // AC-3: the limit was reached meanwhile (another tab, a plan change); nothing was saved.
    if (err?.code === 'PLAN_LIMIT_REACHED') {
      return setFailure({ kind: 'limit', limit: Number(err.details?.limit ?? 0) });
    }
    // AC-19: every field error of the API on its own field, then the focus on the first one.
    const onFields = (err?.details?.fields ?? []).filter(
      (f) => fieldValue(draft, f.field) !== undefined,
    );
    const next: typeof serverErrors = {};
    for (const f of onFields) {
      next[formFieldName(f.field)] ??= { message: f.message, value: fieldValue(draft, f.field) };
    }
    // AC-14: a file the API refuses (not ready, wrong purpose, type, size) names no list.
    if (onFields.length === 0 && err?.code?.startsWith('FILE_')) {
      next.gallery = { message: err.message, value: fieldValue(draft, 'gallery') };
    }
    if (Object.keys(next).length > 0) {
      setServerErrors(next);
      setShown((s) => new Set([...s, ...Object.keys(next)]));
      focusFirstError.current = true;
      return;
    }
    setFailure({ kind: 'general', message: err?.message ?? t('t_toast_something_went_wrong') });
  }

  const goTo = (id: string) => {
    const block = id.replace(/^gig-/, '') as BlockId;
    setCurrent(block);
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'start' });
    el?.querySelector<HTMLElement>('h2')?.focus();
  };

  const hasErrors = submitted && Object.keys(errors).length > 0;
  const waitForUploads = submitted && !hasErrors && draft.gallery.busy;
  const deliveryOptions = DELIVERY_DAYS.map((d) => ({ value: String(d.days), label: t(d.label) }));
  const seoFilled = !!(draft.seo.title.trim() && draft.seo.description.trim());
  const seoError = errorOf('seo');
  const georgian = (label: string) => t('t_label_in_georgian', { label });
  const english = (label: string) => t('t_label_in_english', { label });
  const counter = (text: string) =>
    t('t_ui_char_count', { count: [...text.trim()].length, max: TITLE.max });
  const editorLabels = {
    toolbar: t('t_ui_text_formatting'),
    bold: t('t_ui_bold'),
    italic: t('t_ui_italic'),
    bulletedList: t('t_ui_bulleted_list'),
    numberedList: t('t_ui_numbered_list'),
  };
  const galleryError = errorOf('gallery');

  if (created) return <GigCreated gig={created} />;

  return (
    <div className="mt-gw">
      <header className="mt-gw-header">
        <h1 className="mt-gw-title">{t('t_create_new_gig')}</h1>
        {/* AC-7 (Q-023): English is optional; without it English visitors see the Georgian text. */}
        <Alert kind="info">{t('t_english_fields_optional_notice_v2')}</Alert>
      </header>

      <form ref={formRef} className="mt-gw-layout" onSubmit={submit} noValidate>
        {/* Read-only while the gig is being sent. */}
        <div className="mt-gw-main" inert={sending} aria-busy={sending}>
          {failure && (
            <div ref={failureRef} tabIndex={-1} data-testid="gig-submit-failed">
              <Alert kind="error">
                {failure.kind === 'limit' ? (
                  <>
                    {t('t_plan_gig_limit_reached', { limit: failure.limit })}{' '}
                    <a href={`${href(locale, '/subscription')}?gigs=true`}>
                      {t('t_upgrade_to_premium')}
                    </a>
                  </>
                ) : (
                  failure.message
                )}
              </Alert>
            </div>
          )}
          {hasErrors && (
            <div data-testid="gig-form-errors">
              <Alert kind="error">{t('t_toast_form_validation_error')}</Alert>
            </div>
          )}
          {waitForUploads && (
            <div data-testid="gig-uploads-busy">
              <Alert kind="info">{t('t_pls_wait_until_uploading_finish')}</Alert>
            </div>
          )}

          <section
            id="gig-overview"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-overview-title"
            onFocus={() => setCurrent('overview')}
          >
            <h2 id="gig-overview-title" className="mt-gw-block-title" tabIndex={-1}>
              1. {t('t_overview')}
            </h2>
            <p className="mt-gw-block-subtitle">{t('t_create_gig_overview_subtitle')}</p>
            <div className="mt-gw-pair" onBlur={(e) => blurField(e, touch)}>
              <Field
                label={georgian(t('t_service_title'))}
                name="title.ka"
                maxLength={TITLE.max}
                value={draft.titleKa}
                onChange={(v) => set('titleKa', v)}
                hint={counter(draft.titleKa)}
                error={errorOf('title.ka')}
                required
              />
              <Field
                label={english(t('t_service_title'))}
                name="title.en"
                maxLength={TITLE.max}
                value={draft.titleEn}
                onChange={(v) => set('titleEn', v)}
                hint={counter(draft.titleEn)}
                error={errorOf('title.en')}
              />
            </div>
            <div className="mt-gw-categories">
              <Select
                label={t('t_category')}
                name="categoryId"
                placeholder={t('t_choose_category')}
                options={options(categories)}
                value={draft.categoryId}
                onChange={(v) => chooseLevel('categoryId', v)}
                error={errorOf('categoryId')}
              />
              <Select
                label={t('t_subcategory')}
                name="subcategoryId"
                placeholder={t('t_choose_subcategory')}
                options={options(subcategories)}
                value={draft.subcategoryId}
                disabled={!draft.categoryId}
                hint={draft.categoryId ? undefined : t('t_ui_choose_level_above_first')}
                onChange={(v) => chooseLevel('subcategoryId', v)}
                error={errorOf('subcategoryId')}
              />
              <Select
                label={t('t_childcategory')}
                name="childCategoryId"
                placeholder={t('t_choose_childcategory')}
                options={options(children)}
                value={draft.childCategoryId}
                disabled={!draft.subcategoryId}
                hint={draft.subcategoryId ? undefined : t('t_ui_choose_level_above_first')}
                onChange={(v) => chooseLevel('childCategoryId', v)}
                error={errorOf('childCategoryId')}
              />
              <p className="mt-visually-hidden" role="status">
                {announce}
              </p>
            </div>
            <div onBlur={(e) => blurField(e, touch)}>
              <RichTextEditor
                label={georgian(t('t_description'))}
                name="description.ka"
                value={draft.descriptionKa.html}
                onChange={(html, text) => set('descriptionKa', { html, text })}
                labels={editorLabels}
                error={errorOf('description.ka')}
              />
            </div>
            <div onBlur={(e) => blurField(e, touch)}>
              <RichTextEditor
                label={english(t('t_description'))}
                name="description.en"
                value={draft.descriptionEn.html}
                onChange={(html, text) => set('descriptionEn', { html, text })}
                labels={editorLabels}
                error={errorOf('description.en')}
              />
            </div>
          </section>

          <section
            id="gig-pricing"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-pricing-title"
            onFocus={() => setCurrent('pricing')}
            onBlur={(e) => blurField(e, touch)}
          >
            <h2 id="gig-pricing-title" className="mt-gw-block-title" tabIndex={-1}>
              2. {t('t_pricing')}
            </h2>
            <p className="mt-gw-block-subtitle">{t('t_create_gig_pricing_subtitle')}</p>
            <div className="mt-gw-pair">
              <PriceInput
                label={t('t_price')}
                name="price"
                placeholder={t('t_price_placeholder_0_00')}
                value={draft.price}
                onChange={(v) => set('price', v)}
                error={errorOf('price')}
              />
              <Select
                label={t('t_delivery_time')}
                name="deliveryDays"
                placeholder={t('t_choose_delivery_time')}
                options={deliveryOptions}
                value={draft.deliveryDays}
                onChange={(v) => {
                  set('deliveryDays', v);
                  touch('deliveryDays');
                }}
                error={errorOf('deliveryDays')}
              />
            </div>
            <QuantityInput
              label={t('t_number_of_revisions')}
              name="revisionsAllowed"
              value={draft.revisions}
              onChange={(v) => set('revisions', v)}
              min={0}
              max={maxRevisions}
              decreaseLabel={t('t_ui_decrease')}
              increaseLabel={t('t_ui_increase')}
              hint={t('t_number_of_revisions_hint')}
              error={errorOf('revisionsAllowed')}
            />
          </section>

          <section
            id="gig-upgrades"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-upgrades-title"
            onFocus={() => setCurrent('upgrades')}
            onBlur={(e) => blurField(e, touch)}
          >
            <h2 id="gig-upgrades-title" className="mt-gw-block-title" tabIndex={-1}>
              3. {t('t_upgrades')} <span className="mt-gw-optional">{optional}</span>
            </h2>
            {draft.upgrades.map((u, i) => (
              <fieldset key={u.key} className="mt-gw-row" data-testid="gig-upgrade-row">
                <legend className="mt-gw-row-title" id={`gig-upgrade-${u.key}`}>
                  {t('t_upgrade_number', { number: i + 1 })}
                </legend>
                <Field
                  label={t('t_upgrade_title')}
                  name={`upgrades[${i}].title`}
                  placeholder={t('t_enter_upgrade_title')}
                  maxLength={UPGRADE_TITLE_MAX}
                  value={u.title}
                  onChange={(v) => setUpgrade(i, { title: v })}
                  error={errorOf(`upgrades[${i}].title`)}
                />
                <div className="mt-gw-pair">
                  <PriceInput
                    label={t('t_price')}
                    name={`upgrades[${i}].price`}
                    placeholder={t('t_price_placeholder_0_00')}
                    value={u.price}
                    onChange={(v) => setUpgrade(i, { price: v })}
                    error={errorOf(`upgrades[${i}].price`)}
                  />
                  <Select
                    label={t('t_delivery_time')}
                    name={`upgrades[${i}].extraDays`}
                    placeholder={t('t_and_an_additional_days')}
                    options={deliveryOptions}
                    value={u.extraDays}
                    onChange={(v) => {
                      setUpgrade(i, { extraDays: v });
                      touch(`upgrades[${i}].extraDays`);
                    }}
                    error={errorOf(`upgrades[${i}].extraDays`)}
                  />
                </div>
                <button
                  type="button"
                  className="mt-button mt-gw-row-remove"
                  aria-describedby={`gig-upgrade-${u.key}`}
                  onClick={() => removeRow('upgrades', i)}
                >
                  {t('t_remove_upgrade')}
                </button>
              </fieldset>
            ))}
            <AddRow
              buttonRef={addUpgradeRef}
              label={t('t_add_service_upgrade')}
              full={draft.upgrades.length >= MAX_UPGRADES}
              limitText={t('t_upgrades_limit_reached', { max: MAX_UPGRADES })}
              onAdd={addUpgrade}
            />
          </section>

          <section
            id="gig-faq"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-faq-title"
            onFocus={() => setCurrent('faq')}
            onBlur={(e) => blurField(e, touch)}
          >
            <h2 id="gig-faq-title" className="mt-gw-block-title" tabIndex={-1}>
              4. {t('t_faq')} <span className="mt-gw-optional">{optional}</span>
            </h2>
            <p className="mt-gw-block-subtitle">{t('t_create_gig_faq_subtitle')}</p>
            {draft.faqs.map((f, i) => (
              <fieldset key={f.key} className="mt-gw-row" data-testid="gig-faq-row">
                <legend className="mt-gw-row-title" id={`gig-faq-${f.key}`}>
                  {t('t_ui_faq_number', { number: i + 1 })}
                </legend>
                <Field
                  label={t('t_question')}
                  name={`faqs[${i}].question`}
                  placeholder={t('t_faq_question_example')}
                  maxLength={FAQ.questionMax}
                  value={f.question}
                  onChange={(v) => setFaq(i, { question: v })}
                  error={errorOf(`faqs[${i}].question`)}
                />
                <TextArea
                  label={t('t_answer')}
                  name={`faqs[${i}].answer`}
                  placeholder={t('t_faq_answer_example')}
                  maxLength={FAQ.answerMax}
                  rows={4}
                  value={f.answer}
                  onChange={(v) => setFaq(i, { answer: v })}
                  error={errorOf(`faqs[${i}].answer`)}
                />
                <button
                  type="button"
                  className="mt-button mt-gw-row-remove"
                  aria-describedby={`gig-faq-${f.key}`}
                  onClick={() => removeRow('faqs', i)}
                >
                  {t('t_remove')}
                </button>
              </fieldset>
            ))}
            <AddRow
              buttonRef={addFaqRef}
              label={t('t_add_faq')}
              full={draft.faqs.length >= MAX_FAQS}
              limitText={t('t_faq_limit_reached', { max: MAX_FAQS })}
              onAdd={addFaq}
            />
          </section>

          <section
            id="gig-gallery"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-gallery-title"
            onFocus={() => setCurrent('gallery')}
          >
            <h2 id="gig-gallery-title" className="mt-gw-block-title" tabIndex={-1}>
              5. {t('t_gallery')}
            </h2>
            <p className="mt-gw-block-subtitle">{t('t_get_noticed_by_right_buyers_images')}</p>
            {galleryError && (
              <p className="auth-error" role="alert" tabIndex={-1} data-invalid="true">
                {galleryError}
              </p>
            )}
            <GigFiles
              label={t('t_thumbnail')}
              info={t('t_restrictions_files_allowed_info_explain', {
                size: imageMb,
                extensions: imageExtensions.join(', '),
              })}
              purpose="gig_thumbnail"
              name="thumbnailFileId"
              kind="image"
              max={1}
              maxSizeMb={imageMb}
              extensions={imageExtensions}
              error={errorOf('thumbnailFileId')}
              testId="gig-thumbnail"
              onChange={onThumbnail}
            />
            <GigFiles
              label={t('t_images')}
              info={`${t('t_restrictions_files_allowed_info_explain', {
                size: imageMb,
                extensions: imageExtensions.join(', '),
              })} ${t('t_validator_max_array', {
                max: imageRule?.maxFiles ?? DEFAULT_GIG_IMAGE.maxFiles,
              })}`}
              purpose="gig_image"
              name="imageFileIds"
              kind="image"
              reorder
              max={imageRule?.maxFiles ?? DEFAULT_GIG_IMAGE.maxFiles}
              maxSizeMb={imageMb}
              extensions={imageExtensions}
              error={errorOf('imageFileIds')}
              testId="gig-images"
              onChange={onImages}
            />
            {/* EC-8: only while S-080 is ON; hidden until the config says so. */}
            {documentRule?.enabled && (
              <GigFiles
                label={t('t_documents')}
                info={`${t('t_show_some_of_best_work_doc_pdfs_only')} ${t(
                  't_restrictions_files_allowed_info_explain',
                  {
                    size: documentRule.maxSizeMb,
                    extensions: documentExtensions.join(', '),
                  },
                )}${
                  documentRule.maxFiles !== null
                    ? ` ${t('t_validator_max_array', { max: documentRule.maxFiles })}`
                    : ''
                }`}
                purpose="gig_document"
                name="documentFileIds"
                kind="document"
                max={documentRule.maxFiles ?? Number.POSITIVE_INFINITY}
                maxSizeMb={documentRule.maxSizeMb}
                extensions={documentExtensions}
                error={errorOf('documentFileIds')}
                testId="gig-documents"
                onChange={onDocuments}
              />
            )}
          </section>

          <section
            id="gig-seo"
            className="mt-panel mt-gw-block"
            aria-labelledby="gig-seo-title"
            onFocus={() => setCurrent('seo')}
          >
            <h2 id="gig-seo-title" className="mt-gw-block-title" tabIndex={-1}>
              {t('t_seo')} <span className="mt-gw-optional">{optional}</span>
            </h2>
            {seoFilled && (
              <SeoPreview title={draft.seo.title} description={draft.seo.description} />
            )}
            <div>
              <button
                type="button"
                className="mt-button"
                aria-haspopup="dialog"
                aria-describedby={seoError ? 'gig-seo-error' : undefined}
                data-invalid={seoError ? 'true' : undefined}
                onClick={() => setSeoOpen(true)}
              >
                {t('t_seo_meta_tags')}
              </button>
              {seoError && (
                <p id="gig-seo-error" className="auth-error" role="alert">
                  {seoError}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="mt-gw-side">
          <div className="mt-panel mt-gw-summary">
            <Stepper
              label={t('t_ui_form_progress')}
              steps={steps}
              current={`gig-${current}`}
              statusLabels={{
                not_started: t('t_ui_step_not_started'),
                in_progress: t('t_ui_step_in_progress'),
                complete: t('t_ui_step_completed'),
                error: t('t_ui_step_has_errors'),
              }}
              progress={{
                done,
                total: required.length,
                text: t('t_ui_required_blocks_progress', { done, total: required.length }),
              }}
              onSelect={goTo}
            >
              <button
                type="submit"
                className="mt-button mt-button-primary mt-gw-submit"
                disabled={sending}
                aria-busy={sending}
              >
                {sending ? t('t_please_wait_dots') : t('t_create')}
              </button>
            </Stepper>
          </div>
        </aside>
      </form>

      {/* Outside the form, so Enter in a dialog field does not submit the gig. */}
      <Dialog
        open={seoOpen}
        onClose={() => {
          if (blockStarted(draft, 'seo')) touch('seo');
          setSeoOpen(false);
        }}
        title={t('t_seo')}
        closeLabel={t('t_ui_close')}
        testId="gig-seo-dialog"
      >
        <div className="mt-gw-dialog">
          <Field
            label={t('t_seo_title')}
            name="seo.title"
            placeholder={t('t_enter_seo_title')}
            maxLength={SEO.titleMax}
            value={draft.seo.title}
            onChange={(v) => set('seo', { ...draft.seo, title: v })}
          />
          <TextArea
            label={t('t_seo_description')}
            name="seo.description"
            placeholder={t('t_enter_seo_description')}
            maxLength={SEO.descriptionMax}
            rows={3}
            value={draft.seo.description}
            onChange={(v) => set('seo', { ...draft.seo, description: v })}
          />
          {seoError && <Alert kind="error">{seoError}</Alert>}
          {seoFilled && <SeoPreview title={draft.seo.title} description={draft.seo.description} />}
          <div className="mt-gw-dialog-actions">
            <button type="button" className="mt-button mt-button-primary" onClick={saveSeo}>
              {t('t_save')}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!leaveTo}
        onClose={() => setLeaveTo(undefined)}
        title={t('t_ui_discard_changes')}
        description={t('t_ui_discard_changes_text')}
        closeLabel={t('t_ui_close')}
        testId="gig-discard-dialog"
      >
        <div className="mt-gw-dialog-actions">
          <button type="button" className="mt-button" onClick={() => setLeaveTo(undefined)}>
            {t('t_ui_keep_editing')}
          </button>
          <button
            type="button"
            className="mt-button mt-button-danger"
            onClick={() => {
              leaving.current = true;
              window.location.assign(leaveTo!);
            }}
          >
            {t('t_ui_discard')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

/**
 * AC-16 (legacy `create.blade.php:5-34`): S-070 ON → the gig is active, "View gig"; S-070 OFF → pending, the
 * review text and "My gigs".
 */
function GigCreated({ gig }: { gig: GigOwnerView }) {
  const locale = useLocale();
  const t = useT(locale);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = gig.status === 'active';
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus();
  }, []);
  return (
    <div className="mt-gw-state mt-gw-done" data-testid="gig-created">
      <div className="mt-panel mt-gw-done-card">
        <svg className="mt-gw-done-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 ref={heading} tabIndex={-1} className="mt-gw-done-title">
          {t('t_gig_created')}
        </h1>
        <p className="mt-gw-done-text">
          {active ? t('t_gig_created_subtitle') : t('t_gig_created_subtitle_pending_approval')}
        </p>
        <a
          className="mt-button mt-button-primary mt-gw-submit"
          href={active ? href(locale, `/service/${gig.slug}`) : href(locale, '/seller/gigs')}
        >
          {active ? t('t_view_gig') : t('t_my_gigs')}
        </a>
      </div>
    </div>
  );
}

/** "Add …" under a list of rows; at the limit it is disabled and says why (AC-11, AC-12). */
function AddRow(props: {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  label: string;
  full: boolean;
  limitText: string;
  onAdd: () => void;
}) {
  const hintId = useId();
  return (
    <div className="mt-gw-add">
      <button
        ref={props.buttonRef}
        type="button"
        className="mt-button"
        disabled={props.full}
        aria-describedby={props.full ? hintId : undefined}
        onClick={props.onAdd}
      >
        <span aria-hidden="true">+ </span>
        {props.label}
      </button>
      {props.full && (
        <p id={hintId} className="auth-hint">
          {props.limitText}
        </p>
      )}
    </div>
  );
}

/** How a search result could show the gig (legacy "Search engine Gig preview", `create.blade.php:361`). */
function SeoPreview({ title, description }: { title: string; description: string }) {
  const locale = useLocale();
  const t = useT(locale);
  return (
    <figure className="mt-gw-seo-preview">
      <figcaption className="mt-gw-seo-preview-label">
        {t('t_search_engine_gig_preview')}
      </figcaption>
      <p className="mt-gw-seo-preview-title">{title}</p>
      <p className="mt-gw-seo-preview-text">{description}</p>
    </figure>
  );
}

/** Shows a field's error once the focus leaves it (the field name is the control's `name` / `data-name`). */
function blurField(e: React.FocusEvent<HTMLElement>, touch: (field: string) => void) {
  const target = e.target as HTMLElement;
  const name = target.getAttribute('name') ?? target.getAttribute('data-name');
  if (name) touch(name);
}
