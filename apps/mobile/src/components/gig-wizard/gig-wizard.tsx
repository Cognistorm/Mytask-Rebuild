// Gig create wizard in the app (spec 04 AC-4…AC-9, AC-19; screen 03 "Mobile web (360) and native app"; the web
// `apps/web/src/components/gig-wizard/gig-wizard.tsx` in its phone step mode): header ✕ (asks "Discard changes?"
// once something was entered, as the Android back on the first step), compact Stepper, one step per screen
// (1 Overview → 2 Pricing → 3 Extras → 4 Gallery → 5 Review & publish), sticky Back / Next bar above the keyboard.
// "Next" checks only the current step and scrolls to its first error. Same field names, rules and message keys as
// the web (`lib/gig-form.ts`). ROADMAP 4.3.15a = the frame and steps 1–2; steps 3–5 and the submit follow in
// 4.3.15b/c, edit mode in 4.3.15d.
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
import type { components } from '@mytask/types';
import { lightTheme as theme } from '@mytask/tokens/native';
import {
  blockFields,
  DELIVERY_DAYS,
  EMPTY_DRAFT,
  TITLE,
  validateDraft,
  type BlockId,
  type GigDraft,
} from '../../lib/gig-form';
import { Button, Canvas, IconButton } from '../../ui';
import { Notice } from '../form';
import { BottomSheet } from '../profile';
import { CompactStepper, PriceField, QuantityField, SelectField, TextField } from './fields';

type CategoryNode = components['schemas']['CategoryNode'];

/** S-041 default (spec 00) while the public config loads. */
const DEFAULT_MAX_REVISIONS = 10;

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
  t: TFunction;
  categories: CategoryNode[];
  /** S-041 (`PublicConfig.revisions.maxAllowed`). */
  maxRevisions: number | undefined;
}) {
  const { t, categories } = props;
  const maxRevisions = props.maxRevisions ?? DEFAULT_MAX_REVISIONS;
  const navigation = useNavigation();
  const [initial] = useState<GigDraft>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<GigDraft>(initial);
  /** Fields whose error is shown: left once, or all of a step after "Next". */
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [step, setStep] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  /** Where each field sits in the scrolled content (its wrapper's y), for "Next" with an error. */
  const positions = useRef<Record<string, number>>({});
  const scrollToFirstError = useRef(false);
  /** The leave that "Discard changes?" holds back (a navigation action), or a plain close. */
  const pendingLeave = useRef<(() => void) | null>(null);
  const leaving = useRef(false);

  const errors = useMemo(() => validateDraft(draft, t, maxRevisions), [draft, t, maxRevisions]);
  const errorOf = (field: string) => (shown.has(field) ? errors[field] : undefined);
  const touch = (field: string) => setShown((s) => (s.has(field) ? s : new Set(s).add(field)));
  const set = <K extends keyof GigDraft>(key: K, value: GigDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const at = (field: string) => (e: LayoutChangeEvent) => {
    positions.current[field] = e.nativeEvent.layout.y;
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
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - theme.space[4]) });
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

            {step === 0 ? (
              <>
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
              </>
            ) : null}

            {step === 1 ? (
              <>
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
              </>
            ) : null}

            {/* Steps 3–5 are built in ROADMAP 4.3.15b/c. */}
            {step === 2 ? (
              <>
                {heading(`3. ${t('t_upgrades')}`, optional)}
                {heading(`4. ${t('t_faq')}`, optional)}
              </>
            ) : null}
            {step === 3 ? heading(`5. ${t('t_gallery')}`) : null}
            {step === LAST_STEP ? heading(t('t_ui_review_and_publish')) : null}
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
