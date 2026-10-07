'use client';
// Gig create wizard `/create` (spec 04 AC-1…AC-9, AC-19; screen docs/05-design/screens/03-gig-create-wizard.md;
// legacy `livewire/main/create/create.blade.php`): one page with the blocks in the legacy order and a side summary
// (Stepper) with each block's status. Opening checks the plan limit (AC-2, `getGigCreationEligibility`); guests go
// to login and back (AC-1). ROADMAP 4.3.9 builds the entry, Overview and Pricing; 4.3.10 adds Upgrades, FAQ,
// Gallery, the SEO dialog, the submit itself, the success screens, edit mode and the phone step mode.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  EmptyState,
  Field,
  PriceInput,
  QuantityInput,
  RichTextEditor,
  Select,
  Skeleton,
  Stepper,
  type StepItem,
  type StepStatus,
} from '@mytask/ui/web';
import { href, useApi, useLocale, useT } from '../../lib/client';
import { usePublicConfig } from '../../lib/public-config';
import {
  BLOCK_FIELDS,
  blockStarted,
  DELIVERY_DAYS,
  EMPTY_DRAFT,
  TITLE,
  validateDraft,
  type BlockId,
  type GigDraft,
} from './gig-form';
import './gig-wizard.css';

type CategoryNode = components['schemas']['CategoryNode'];
type Eligibility = components['schemas']['GigCreationEligibility'];

/** S-041 default (spec 00) while the public config loads. */
const DEFAULT_MAX_REVISIONS = 10;

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
  const config = usePublicConfig(locale);
  const maxRevisions = config?.revisions.maxAllowed ?? DEFAULT_MAX_REVISIONS;
  const [draft, setDraft] = useState<GigDraft>(EMPTY_DRAFT);
  /** Fields whose error is shown: left once (blur) or all after a submit. */
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState<BlockId>('overview');
  const [announce, setAnnounce] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstError = useRef(false);

  const errors = useMemo(() => validateDraft(draft, t, maxRevisions), [draft, t, maxRevisions]);
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

  const status = (block: BlockId): StepStatus => {
    const fields = BLOCK_FIELDS[block];
    if (fields.some((f) => shown.has(f) && errors[f])) return 'error';
    if (fields.every((f) => !errors[f])) return 'complete';
    return blockStarted(draft, block) ? 'in_progress' : 'not_started';
  };
  const blocks: { id: BlockId; label: string }[] = [
    { id: 'overview', label: t('t_overview') },
    { id: 'pricing', label: t('t_pricing') },
  ];
  const steps: StepItem[] = blocks.map((b) => ({
    id: `gig-${b.id}`,
    label: b.label,
    status: status(b.id),
  }));
  const done = steps.filter((s) => s.status === 'complete').length;

  // AC-19: after a refused submit the first invalid field (page order) gets the focus.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setShown(new Set(Object.values(BLOCK_FIELDS).flat()));
    if (Object.keys(errors).length > 0) {
      focusFirstError.current = true;
      return;
    }
    // ROADMAP 4.3.10: the gallery uploads and `createGig`.
  }

  const goTo = (id: string) => {
    const block = id.replace(/^gig-/, '') as BlockId;
    setCurrent(block);
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'start' });
    el?.querySelector<HTMLElement>('h2')?.focus();
  };

  const hasErrors = submitted && Object.keys(errors).length > 0;
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

  return (
    <div className="mt-gw">
      <header className="mt-gw-header">
        <h1 className="mt-gw-title">{t('t_create_new_gig')}</h1>
        {/* AC-7 (Q-023): English is optional; without it English visitors see the Georgian text. */}
        <Alert kind="info">{t('t_english_fields_optional_notice_v2')}</Alert>
      </header>

      <form ref={formRef} className="mt-gw-layout" onSubmit={submit} noValidate>
        <div className="mt-gw-main">
          {hasErrors && (
            <div data-testid="gig-form-errors">
              <Alert kind="error">{t('t_toast_form_validation_error')}</Alert>
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
                options={DELIVERY_DAYS.map((d) => ({ value: String(d.days), label: t(d.label) }))}
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
                total: steps.length,
                text: t('t_ui_required_blocks_progress', { done, total: steps.length }),
              }}
              onSelect={goTo}
            >
              <button type="submit" className="mt-button mt-button-primary mt-gw-submit">
                {t('t_create')}
              </button>
            </Stepper>
          </div>
        </aside>
      </form>
    </div>
  );
}

/** Shows a field's error once the focus leaves it (the field name is the control's `name` / `data-name`). */
function blurField(e: React.FocusEvent<HTMLElement>, touch: (field: string) => void) {
  const target = e.target as HTMLElement;
  const name = target.getAttribute('name') ?? target.getAttribute('data-name');
  if (name) touch(name);
}
