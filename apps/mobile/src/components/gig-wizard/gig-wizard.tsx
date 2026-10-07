// Gig create wizard in the app (spec 04 AC-4…AC-9, AC-19; screen 03 "Mobile web (360) and native app"; the web
// `apps/web/src/components/gig-wizard/gig-wizard.tsx` in its phone step mode): header ✕ (asks "Discard changes?"
// once something was entered, as the Android back on the first step), compact Stepper, one step per screen
// (1 Overview → 2 Pricing → 3 Extras → 4 Gallery → 5 Review & publish), sticky Back / Next bar above the keyboard.
// "Next" checks only the current step and scrolls to its first error. Same field names, rules and message keys as
// the web (`lib/gig-form.ts`). Every step stays mounted (only the current one is shown), so typed text and running
// uploads survive Back / Next, as the web's hidden blocks. ROADMAP 4.3.15a = the frame and steps 1–2; 4.3.15b =
// step 3 Extras (Upgrades + FAQ, AC-11, AC-12) and step 4 Gallery (AC-14); step 5 and the submit follow in
// 4.3.15c, edit mode in 4.3.15d.
import type { TFunction } from 'i18next';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiClient } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { lightTheme as theme } from '@mytask/tokens/native';
import {
  blockFields,
  DELIVERY_DAYS,
  EMPTY_DRAFT,
  FAQ,
  MAX_FAQS,
  MAX_UPGRADES,
  shiftRowFields,
  TITLE,
  UPGRADE_TITLE_MAX,
  validateDraft,
  type BlockId,
  type FaqDraft,
  type GigDraft,
  type UpgradeDraft,
} from '../../lib/gig-form';
import type { PublicConfig } from '../../lib/public-config';
import { Button, Canvas, Card, IconButton } from '../../ui';
import { Notice } from '../form';
import { BottomSheet } from '../profile';
import { CompactStepper, PriceField, QuantityField, SelectField, TextField } from './fields';
import { GigFiles } from './gig-files';

type CategoryNode = components['schemas']['CategoryNode'];

/** S-041 default (spec 00) while the public config loads. */
const DEFAULT_MAX_REVISIONS = 10;
/** S-077 / S-078 defaults (spec 00) while the public config loads; documents wait for it (S-080 may be OFF). */
const DEFAULT_GIG_IMAGE = { maxFiles: 10, maxSizeMb: 5 };
/** Legacy fixed lists (`GalleryValidator.php:42-54`); the public config may narrow them. */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const DOCUMENT_EXTENSIONS = ['pdf'];
const extensionsOf = (allowed: string[] | undefined, fallback: string[]) =>
  allowed?.length ? allowed.map((e) => e.toLowerCase()) : fallback;

/** The steps (screen 03): 1 Overview → 2 Pricing → 3 Extras → 4 Gallery → 5 Review & publish (with SEO). */
const STEPS: readonly (readonly BlockId[])[] = [
  ['overview'],
  ['pricing'],
  ['upgrades', 'faq'],
  ['gallery'],
  ['seo'],
];
const LAST_STEP = STEPS.length - 1;

export function GigWizard(props: {
  api: ApiClient;
  t: TFunction;
  categories: CategoryNode[];
  /** `undefined` while it loads (defaults of spec 00; documents hidden). */
  config: PublicConfig | undefined;
}) {
  const { api, t, categories, config } = props;
  const maxRevisions = config?.revisions.maxAllowed ?? DEFAULT_MAX_REVISIONS;
  const imageRule = config?.uploads.gigImage;
  const documentRule = config?.uploads.gigDocument;
  const imageExtensions = extensionsOf(imageRule?.allowedExtensions, IMAGE_EXTENSIONS);
  const documentExtensions = extensionsOf(documentRule?.allowedExtensions, DOCUMENT_EXTENSIONS);
  const imageMb = imageRule?.maxSizeMb ?? DEFAULT_GIG_IMAGE.maxSizeMb;
  const maxImages = imageRule?.maxFiles ?? DEFAULT_GIG_IMAGE.maxFiles;
  const rowKey = useRef(0);
  const navigation = useNavigation();
  const [initial] = useState<GigDraft>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<GigDraft>(initial);
  /** Fields whose error is shown: left once, or all of a step after "Next". */
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [step, setStep] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  /**
   * Where each field sits in its step (its wrapper's y; a row's fields share the row's) and where each step starts
   * in the scrolled content, for "Next" with an error.
   */
  const positions = useRef<Record<string, number>>({});
  const stepTops = useRef<Record<number, number>>({});
  const scrollToFirstError = useRef(false);
  /** The leave that "Discard changes?" holds back (a navigation action), or a plain close. */
  const pendingLeave = useRef<(() => void) | null>(null);
  const leaving = useRef(false);

  const errors = useMemo(() => validateDraft(draft, t, maxRevisions), [draft, t, maxRevisions]);
  const errorOf = (field: string) => (shown.has(field) ? errors[field] : undefined);
  const touch = (field: string) => setShown((s) => (s.has(field) ? s : new Set(s).add(field)));
  const set = <K extends keyof GigDraft>(key: K, value: GigDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const at =
    (...names: string[]) =>
    (e: LayoutChangeEvent) => {
      for (const name of names) positions.current[name] = e.nativeEvent.layout.y;
    };
  const top = (i: number) => (e: LayoutChangeEvent) => {
    stepTops.current[i] = e.nativeEvent.layout.y;
  };

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
      (level === 'categoryId' &&
        id !== draft.categoryId &&
        (draft.subcategoryId || draft.childCategoryId)) ||
      (level === 'subcategoryId' && id !== draft.subcategoryId && draft.childCategoryId);
    setDraft((d) =>
      d[level] === id
        ? d
        : {
            ...d,
            [level]: id,
            ...(level === 'categoryId' ? { subcategoryId: '', childCategoryId: '' } : {}),
            ...(level === 'subcategoryId' ? { childCategoryId: '' } : {}),
          },
    );
    if (cleared)
      AccessibilityInfo.announceForAccessibility(t('t_ui_lower_category_levels_cleared'));
    touch(level);
  };

  // AC-11, AC-12: rows are added empty and removed anywhere; a shown error stays on its row.
  const addUpgrade = () => {
    const row: UpgradeDraft = { key: ++rowKey.current, title: '', price: '', extraDays: '' };
    setDraft((d) => ({ ...d, upgrades: [...d.upgrades, row] }));
  };
  const addFaq = () => {
    const row: FaqDraft = { key: ++rowKey.current, question: '', answer: '' };
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

  const fields = blockFields(draft);
  const stepFields = (i: number) => STEPS[i]!.flatMap((b) => fields[b]);

  const goStep = (i: number) => {
    setStep(i);
    scroll.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(
      t('t_ui_step_of', { step: i + 1, total: STEPS.length }),
    );
  };
  /** "Next" checks only the current step (screen 03). */
  const next = () => {
    const own = stepFields(step);
    setShown((s) => new Set([...s, ...own]));
    if (own.some((f) => errors[f])) {
      scrollToFirstError.current = true;
      return;
    }
    goStep(step + 1);
  };

  // After a refused "Next": the first invalid field of the step comes into view and its message is read out.
  useEffect(() => {
    if (!scrollToFirstError.current) return;
    scrollToFirstError.current = false;
    const first = stepFields(step).find((f) => errors[f]);
    if (!first) return;
    const y = positions.current[first];
    const start = stepTops.current[step] ?? 0;
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, start + y - theme.space[4]) });
    AccessibilityInfo.announceForAccessibility(errors[first]!);
  });

  // "Discard changes?" (screen 03): leaving with something entered asks first (✕, Android back, a swipe back).
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty || leaving.current) return;
        e.preventDefault();
        pendingLeave.current = () => navigation.dispatch(e.data.action);
        setDiscardOpen(true);
      }),
    [navigation, dirty],
  );
  // Android back on a later step = the previous step (as the Back button).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      goStep(step - 1);
      return true;
    });
    return () => sub.remove();
  });

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  const discard = () => {
    leaving.current = true;
    setDiscardOpen(false);
    const leave = pendingLeave.current ?? close;
    pendingLeave.current = null;
    leave();
  };

  const georgian = (label: string) => t('t_label_in_georgian', { label });
  const english = (label: string) => t('t_label_in_english', { label });
  const counter = (text: string) =>
    t('t_ui_char_count', { count: [...text.trim()].length, max: TITLE.max });
  const formatHint = t('t_ui_description_format_hint');
  const deliveryOptions = DELIVERY_DAYS.map((d) => ({ value: String(d.days), label: t(d.label) }));
  const optional = `(${t('t_ui_optional')})`;
  const closeLabel = t('t_ui_close');
  const imageInfo = t('t_restrictions_files_allowed_info_explain', {
    size: imageMb,
    extensions: imageExtensions.join(', '),
  });

  const heading = (text: string, note?: string) => (
    <Text style={s.blockTitle} accessibilityRole="header">
      {text}
      {note ? <Text style={s.optional}> {note}</Text> : null}
    </Text>
  );

  return (
    <Canvas>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <View style={s.header}>
          <IconButton onPress={close} accessibilityLabel={closeLabel} testID="gig-close">
            <Text style={s.close}>{'✕'}</Text>
          </IconButton>
          <Text style={s.title} accessibilityRole="header" numberOfLines={2}>
            {t('t_create_new_gig')}
          </Text>
        </View>
        <KeyboardAvoidingView
          style={s.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scroll}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            testID="gig-wizard"
          >
            <CompactStepper
              text={t('t_ui_step_of', { step: step + 1, total: STEPS.length })}
              index={step}
              total={STEPS.length}
            />

            <View style={step === 0 ? s.step : s.hidden} onLayout={top(0)}>
              {heading(`1. ${t('t_overview')}`)}
              <Text style={s.subtitle}>{t('t_create_gig_overview_subtitle')}</Text>
              {/* AC-7 (Q-023): English is optional; without it English visitors see the Georgian text. */}
              <Notice kind="info" text={t('t_english_fields_optional_notice_v2')} />
              <View onLayout={at('title.ka')}>
                <TextField
                  label={georgian(t('t_service_title'))}
                  value={draft.titleKa}
                  onChangeText={(v) => set('titleKa', v)}
                  onBlur={() => touch('title.ka')}
                  maxLength={TITLE.max}
                  hint={counter(draft.titleKa)}
                  error={errorOf('title.ka')}
                  lang="ka"
                  testID="gig-title-ka"
                />
              </View>
              <View onLayout={at('title.en')}>
                <TextField
                  label={english(t('t_service_title'))}
                  value={draft.titleEn}
                  onChangeText={(v) => set('titleEn', v)}
                  onBlur={() => touch('title.en')}
                  maxLength={TITLE.max}
                  hint={counter(draft.titleEn)}
                  error={errorOf('title.en')}
                  lang="en"
                  testID="gig-title-en"
                />
              </View>
              <View onLayout={at('categoryId')}>
                <SelectField
                  label={t('t_category')}
                  placeholder={t('t_choose_category')}
                  options={options(categories)}
                  value={draft.categoryId}
                  onChange={(v) => chooseLevel('categoryId', v)}
                  closeLabel={closeLabel}
                  error={errorOf('categoryId')}
                  testID="gig-category"
                />
              </View>
              <View onLayout={at('subcategoryId')}>
                <SelectField
                  label={t('t_subcategory')}
                  placeholder={t('t_choose_subcategory')}
                  options={options(subcategories)}
                  value={draft.subcategoryId}
                  onChange={(v) => chooseLevel('subcategoryId', v)}
                  disabled={!draft.categoryId}
                  hint={draft.categoryId ? undefined : t('t_ui_choose_level_above_first')}
                  closeLabel={closeLabel}
                  error={errorOf('subcategoryId')}
                  testID="gig-subcategory"
                />
              </View>
              <View onLayout={at('childCategoryId')}>
                <SelectField
                  label={t('t_childcategory')}
                  placeholder={t('t_choose_childcategory')}
                  options={options(children)}
                  value={draft.childCategoryId}
                  onChange={(v) => chooseLevel('childCategoryId', v)}
                  disabled={!draft.subcategoryId}
                  hint={draft.subcategoryId ? undefined : t('t_ui_choose_level_above_first')}
                  closeLabel={closeLabel}
                  error={errorOf('childCategoryId')}
                  testID="gig-childcategory"
                />
              </View>
              <View onLayout={at('description.ka')}>
                <TextField
                  label={georgian(t('t_description'))}
                  value={draft.descriptionKa}
                  onChangeText={(v) => set('descriptionKa', v)}
                  onBlur={() => touch('description.ka')}
                  multiline
                  hint={formatHint}
                  error={errorOf('description.ka')}
                  lang="ka"
                  testID="gig-description-ka"
                />
              </View>
              <View onLayout={at('description.en')}>
                <TextField
                  label={english(t('t_description'))}
                  value={draft.descriptionEn}
                  onChangeText={(v) => set('descriptionEn', v)}
                  onBlur={() => touch('description.en')}
                  multiline
                  hint={formatHint}
                  error={errorOf('description.en')}
                  lang="en"
                  testID="gig-description-en"
                />
              </View>
            </View>

            <View style={step === 1 ? s.step : s.hidden} onLayout={top(1)}>
              {heading(`2. ${t('t_pricing')}`)}
              <Text style={s.subtitle}>{t('t_create_gig_pricing_subtitle')}</Text>
              <View onLayout={at('price')}>
                <PriceField
                  label={t('t_price')}
                  placeholder={t('t_price_placeholder_0_00')}
                  value={draft.price}
                  onChange={(v) => set('price', v)}
                  onBlur={() => touch('price')}
                  error={errorOf('price')}
                  testID="gig-price"
                />
              </View>
              <View onLayout={at('deliveryDays')}>
                <SelectField
                  label={t('t_delivery_time')}
                  placeholder={t('t_choose_delivery_time')}
                  options={deliveryOptions}
                  value={draft.deliveryDays}
                  onChange={(v) => {
                    set('deliveryDays', v);
                    touch('deliveryDays');
                  }}
                  closeLabel={closeLabel}
                  error={errorOf('deliveryDays')}
                  testID="gig-delivery"
                />
              </View>
              <View onLayout={at('revisionsAllowed')}>
                <QuantityField
                  label={t('t_number_of_revisions')}
                  value={draft.revisions}
                  onChange={(v) => set('revisions', v)}
                  onBlur={() => touch('revisionsAllowed')}
                  min={0}
                  max={maxRevisions}
                  decreaseLabel={t('t_ui_decrease')}
                  increaseLabel={t('t_ui_increase')}
                  hint={t('t_number_of_revisions_hint')}
                  error={errorOf('revisionsAllowed')}
                  testID="gig-revisions"
                />
              </View>
            </View>

            <View style={step === 2 ? s.step : s.hidden} onLayout={top(2)}>
              {heading(`3. ${t('t_upgrades')}`, optional)}
              {draft.upgrades.map((u, i) => {
                const name = t('t_upgrade_number', { number: i + 1 });
                const field = (f: string) => `upgrades[${i}].${f}`;
                return (
                  <View
                    key={u.key}
                    onLayout={at(field('title'), field('price'), field('extraDays'))}
                  >
                    <Card style={s.rowCard} testID="gig-upgrade-row">
                      <Text style={s.rowTitle} accessibilityRole="header">
                        {name}
                      </Text>
                      <TextField
                        label={t('t_upgrade_title')}
                        placeholder={t('t_enter_upgrade_title')}
                        maxLength={UPGRADE_TITLE_MAX}
                        value={u.title}
                        onChangeText={(v) => setUpgrade(i, { title: v })}
                        onBlur={() => touch(field('title'))}
                        error={errorOf(field('title'))}
                        testID={`gig-upgrade-${i}-title`}
                      />
                      <PriceField
                        label={t('t_price')}
                        placeholder={t('t_price_placeholder_0_00')}
                        value={u.price}
                        onChange={(v) => setUpgrade(i, { price: v })}
                        onBlur={() => touch(field('price'))}
                        error={errorOf(field('price'))}
                        testID={`gig-upgrade-${i}-price`}
                      />
                      <SelectField
                        label={t('t_delivery_time')}
                        placeholder={t('t_and_an_additional_days')}
                        options={deliveryOptions}
                        value={u.extraDays}
                        onChange={(v) => {
                          setUpgrade(i, { extraDays: v });
                          touch(field('extraDays'));
                        }}
                        closeLabel={closeLabel}
                        error={errorOf(field('extraDays'))}
                        testID={`gig-upgrade-${i}-days`}
                      />
                      <Button
                        variant="secondary"
                        label={t('t_remove_upgrade')}
                        accessibilityLabel={`${t('t_remove_upgrade')}: ${name}`}
                        onPress={() => removeRow('upgrades', i)}
                        testID={`gig-upgrade-${i}-remove`}
                      />
                    </Card>
                  </View>
                );
              })}
              <AddRow
                label={t('t_add_service_upgrade')}
                full={draft.upgrades.length >= MAX_UPGRADES}
                limitText={t('t_upgrades_limit_reached', { max: MAX_UPGRADES })}
                onAdd={addUpgrade}
                testID="gig-add-upgrade"
              />

              {heading(`4. ${t('t_faq')}`, optional)}
              <Text style={s.subtitle}>{t('t_create_gig_faq_subtitle')}</Text>
              {draft.faqs.map((f, i) => {
                const name = t('t_ui_faq_number', { number: i + 1 });
                const field = (n: string) => `faqs[${i}].${n}`;
                return (
                  <View key={f.key} onLayout={at(field('question'), field('answer'))}>
                    <Card style={s.rowCard} testID="gig-faq-row">
                      <Text style={s.rowTitle} accessibilityRole="header">
                        {name}
                      </Text>
                      <TextField
                        label={t('t_question')}
                        placeholder={t('t_faq_question_example')}
                        maxLength={FAQ.questionMax}
                        value={f.question}
                        onChangeText={(v) => setFaq(i, { question: v })}
                        onBlur={() => touch(field('question'))}
                        error={errorOf(field('question'))}
                        testID={`gig-faq-${i}-question`}
                      />
                      <TextField
                        label={t('t_answer')}
                        placeholder={t('t_faq_answer_example')}
                        maxLength={FAQ.answerMax}
                        multiline
                        value={f.answer}
                        onChangeText={(v) => setFaq(i, { answer: v })}
                        onBlur={() => touch(field('answer'))}
                        hint={t('t_ui_char_count', {
                          count: [...f.answer].length,
                          max: FAQ.answerMax,
                        })}
                        error={errorOf(field('answer'))}
                        testID={`gig-faq-${i}-answer`}
                      />
                      <Button
                        variant="secondary"
                        label={t('t_remove')}
                        accessibilityLabel={`${t('t_remove')}: ${name}`}
                        onPress={() => removeRow('faqs', i)}
                        testID={`gig-faq-${i}-remove`}
                      />
                    </Card>
                  </View>
                );
              })}
              <AddRow
                label={t('t_add_faq')}
                full={draft.faqs.length >= MAX_FAQS}
                limitText={t('t_faq_limit_reached', { max: MAX_FAQS })}
                onAdd={addFaq}
                testID="gig-add-faq"
              />
            </View>

            <View style={step === 3 ? s.step : s.hidden} onLayout={top(3)}>
              {heading(`5. ${t('t_gallery')}`)}
              <Text style={s.subtitle}>{t('t_get_noticed_by_right_buyers_images')}</Text>
              <View onLayout={at('thumbnailFileId')}>
                <GigFiles
                  api={api}
                  t={t}
                  label={t('t_thumbnail')}
                  info={imageInfo}
                  purpose="gig_thumbnail"
                  kind="image"
                  max={1}
                  maxSizeMb={imageMb}
                  extensions={imageExtensions}
                  error={errorOf('thumbnailFileId')}
                  testID="gig-thumbnail"
                  onChange={onThumbnail}
                />
              </View>
              <View onLayout={at('imageFileIds')}>
                <GigFiles
                  api={api}
                  t={t}
                  label={t('t_images')}
                  info={`${imageInfo} ${t('t_validator_max_array', { max: maxImages })}`}
                  purpose="gig_image"
                  kind="image"
                  reorder
                  max={maxImages}
                  maxSizeMb={imageMb}
                  extensions={imageExtensions}
                  error={errorOf('imageFileIds')}
                  testID="gig-images"
                  onChange={onImages}
                />
              </View>
              {/* EC-8: only while S-080 is ON; hidden until the config says so. */}
              {documentRule?.enabled ? (
                <View onLayout={at('documentFileIds')}>
                  <GigFiles
                    api={api}
                    t={t}
                    label={t('t_documents')}
                    info={[
                      t('t_show_some_of_best_work_doc_pdfs_only'),
                      t('t_restrictions_files_allowed_info_explain', {
                        size: documentRule.maxSizeMb,
                        extensions: documentExtensions.join(', '),
                      }),
                      documentRule.maxFiles !== null
                        ? t('t_validator_max_array', { max: documentRule.maxFiles })
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    purpose="gig_document"
                    kind="document"
                    max={documentRule.maxFiles ?? Number.POSITIVE_INFINITY}
                    maxSizeMb={documentRule.maxSizeMb}
                    extensions={documentExtensions}
                    error={errorOf('documentFileIds')}
                    testID="gig-documents"
                    onChange={onDocuments}
                  />
                </View>
              ) : null}
            </View>

            {/* Step 5 and the submit are built in ROADMAP 4.3.15c. */}
            <View style={step === LAST_STEP ? s.step : s.hidden} onLayout={top(LAST_STEP)}>
              {heading(t('t_ui_review_and_publish'))}
            </View>
          </ScrollView>

          {/* StickyActionBar (screen 03): Back / Next, "Create" on the last step. */}
          <View style={s.bar}>
            {step > 0 ? (
              <Button
                variant="secondary"
                label={t('t_back')}
                onPress={() => goStep(step - 1)}
                style={s.barButton}
                testID="gig-back"
              />
            ) : null}
            {step < LAST_STEP ? (
              <Button label={t('t_next')} onPress={next} style={s.barButton} testID="gig-next" />
            ) : (
              <Button
                label={t('t_create')}
                onPress={() => undefined}
                disabled
                style={s.barButton}
                testID="gig-submit"
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={t('t_ui_discard_changes')}
        closeLabel={closeLabel}
        testID="gig-discard-sheet"
      >
        <Text style={s.subtitle}>{t('t_ui_discard_changes_text')}</Text>
        <View style={s.sheetButtons}>
          <Button
            variant="secondary"
            label={t('t_ui_keep_editing')}
            onPress={() => {
              pendingLeave.current = null;
              setDiscardOpen(false);
            }}
          />
          <Button
            variant="danger"
            label={t('t_ui_discard')}
            onPress={discard}
            testID="gig-discard"
          />
        </View>
      </BottomSheet>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  close: { ...theme.text.body, color: theme.colors.text.primary },
  title: { ...theme.text.title, color: theme.colors.text.primary, flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[4] },
  step: { gap: theme.space[4] },
  // Not unmounted: typed text and running uploads stay (screen readers skip it too).
  hidden: { display: 'none' },
  rowCard: { padding: theme.space[4], gap: theme.space[3] },
  rowTitle: { ...theme.text.label, color: theme.colors.text.primary },
  addRow: { gap: theme.space[2] },
  blockTitle: { ...theme.text.h3, color: theme.colors.text.primary },
  optional: { ...theme.text.body, color: theme.colors.text.secondary },
  subtitle: { ...theme.text.body, color: theme.colors.text.secondary },
  bar: {
    flexDirection: 'row',
    gap: theme.space[3],
    padding: theme.space[4],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
    backgroundColor: theme.colors.bg.surface,
  },
  barButton: { flex: 1 },
  sheetButtons: { gap: theme.space[3], marginTop: theme.space[4] },
});

/** "+ Add …" under a row list; at the limit it is disabled and says why (AC-11, AC-12). */
function AddRow(props: {
  label: string;
  full: boolean;
  limitText: string;
  onAdd: () => void;
  testID?: string;
}) {
  return (
    <View style={s.addRow}>
      <Button
        variant="secondary"
        label={`+ ${props.label}`}
        accessibilityLabel={props.label}
        onPress={props.onAdd}
        disabled={props.full}
        testID={props.testID}
      />
      {props.full ? <Text style={s.subtitle}>{props.limitText}</Text> : null}
    </View>
  );
}
