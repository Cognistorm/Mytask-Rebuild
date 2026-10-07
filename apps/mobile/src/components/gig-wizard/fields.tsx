// Native form controls of the gig wizard (screen 03 "native app"; components.md §5 Field, Select → BottomSheet,
// PriceInput, QuantityInput, compact Stepper), in the 3X input frame. Each shows its label, an optional hint and
// its error below (announced politely), as the web `Field` family.
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import { toTetri } from '../../lib/gig-form';
import { IconButton, InputFrame, Radio } from '../../ui';
import { BottomSheet } from '../profile';

function Frame(props: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={s.field} testID={props.testID}>
      <Text style={s.label}>{props.label}</Text>
      {props.children}
      {props.hint ? <Text style={s.hint}>{props.hint}</Text> : null}
      {props.error ? (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  /** Text language for screen readers (`ka` / `en` fields). */
  lang?: string;
  prefix?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Frame label={props.label} hint={props.hint} error={props.error} testID={props.testID}>
      <InputFrame focused={focused} invalid={!!props.error} style={s.row}>
        {props.prefix ? (
          <Text style={s.prefix} importantForAccessibility="no" accessibilityElementsHidden>
            {props.prefix}
          </Text>
        ) : null}
        <TextInput
          style={[s.input, props.multiline ? s.multiline : null]}
          value={props.value}
          onChangeText={props.onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            props.onBlur?.();
          }}
          multiline={props.multiline}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.text.muted}
          autoCapitalize="sentences"
          keyboardType={props.keyboardType ?? 'default'}
          accessibilityLabel={props.label}
          accessibilityHint={props.error ?? props.hint}
          accessibilityLanguage={props.lang}
          testID={props.testID ? `${props.testID}-input` : undefined}
        />
      </InputFrame>
    </Frame>
  );
}

/** GEL amount (₾ in front, decimal keypad); a valid amount gets 2 decimals when the field is left (as the web). */
export function PriceField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  testID?: string;
}) {
  return (
    <TextField
      label={props.label}
      value={props.value}
      onChangeText={props.onChange}
      onBlur={() => {
        const tetri = toTetri(props.value);
        if (tetri !== null) props.onChange((tetri / 100).toFixed(2));
        props.onBlur?.();
      }}
      prefix="₾"
      keyboardType="decimal-pad"
      maxLength={13}
      placeholder={props.placeholder}
      error={props.error}
      testID={props.testID}
    />
  );
}

/** Select → BottomSheet (components.md §5.6 "sheet"): the chosen label or the placeholder, ▾. */
export function SelectField(props: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  closeLabel: string;
  disabled?: boolean;
  hint?: string;
  error?: string;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  // Long lists (categories) scroll inside the sheet, which keeps the top of the screen visible.
  const { height } = useWindowDimensions();
  const chosen = props.options.find((o) => o.value === props.value);
  return (
    <Frame label={props.label} hint={props.hint} error={props.error}>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={props.disabled}
        accessibilityRole="button"
        accessibilityLabel={`${props.label}: ${chosen?.label ?? props.placeholder}`}
        accessibilityHint={props.error ?? props.hint}
        accessibilityState={{ disabled: !!props.disabled, expanded: open }}
        testID={props.testID}
      >
        <InputFrame invalid={!!props.error} style={[s.row, props.disabled ? s.disabled : null]}>
          <Text style={[s.input, s.grow, chosen ? null : s.placeholder]} numberOfLines={2}>
            {chosen?.label ?? props.placeholder}
          </Text>
          <Text style={s.caret} importantForAccessibility="no" accessibilityElementsHidden>
            {'▾'}
          </Text>
        </InputFrame>
      </Pressable>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={props.label}
        closeLabel={props.closeLabel}
        testID={props.testID ? `${props.testID}-sheet` : undefined}
      >
        <ScrollView style={{ maxHeight: height * 0.6 }} keyboardShouldPersistTaps="handled">
          {props.options.map((o) => {
            const checked = o.value === props.value;
            return (
              <Pressable
                key={o.value}
                style={s.option}
                onPress={() => {
                  setOpen(false);
                  props.onChange(o.value);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
              >
                <Radio checked={checked} />
                <Text style={s.optionText}>{o.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </Frame>
  );
}

/** QuantityInput: [ − ] number [ + ] within min…max; the number can also be typed. */
export function QuantityField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  min: number;
  max: number;
  decreaseLabel: string;
  increaseLabel: string;
  hint?: string;
  error?: string;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const n = /^\d+$/.test(props.value.trim()) ? Number(props.value.trim()) : null;
  const step = (by: number) => {
    const next = Math.min(props.max, Math.max(props.min, (n ?? props.min - by) + by));
    props.onChange(String(next));
    props.onBlur?.();
  };
  return (
    <Frame label={props.label} hint={props.hint} error={props.error} testID={props.testID}>
      <View style={s.quantity}>
        <IconButton
          onPress={() => step(-1)}
          accessibilityLabel={props.decreaseLabel}
          accessibilityState={{ disabled: n !== null && n <= props.min }}
          testID={props.testID ? `${props.testID}-decrease` : undefined}
        >
          <Text style={s.stepGlyph}>{'−'}</Text>
        </IconButton>
        <InputFrame focused={focused} invalid={!!props.error} style={s.quantityBox}>
          <TextInput
            style={[s.input, s.center]}
            value={props.value}
            onChangeText={(v) => props.onChange(v.replace(/[^\d]/g, ''))}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              props.onBlur?.();
            }}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel={props.label}
            accessibilityHint={props.error ?? props.hint}
            testID={props.testID ? `${props.testID}-input` : undefined}
          />
        </InputFrame>
        <IconButton
          onPress={() => step(1)}
          accessibilityLabel={props.increaseLabel}
          accessibilityState={{ disabled: n !== null && n >= props.max }}
          testID={props.testID ? `${props.testID}-increase` : undefined}
        >
          <Text style={s.stepGlyph}>{'+'}</Text>
        </IconButton>
      </View>
    </Frame>
  );
}

/** Compact Stepper (screen 03): "Step 2 of 5" and a bar. */
export function CompactStepper({
  text,
  index,
  total,
}: {
  text: string;
  index: number;
  total: number;
}) {
  return (
    <View
      style={s.stepper}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      accessibilityValue={{ min: 1, max: total, now: index + 1, text }}
      testID="gig-stepper"
    >
      <Text style={s.stepperText}>{text}</Text>
      <View style={s.track}>
        <View style={[s.bar, { width: `${((index + 1) / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: theme.space[1] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  hint: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  error: { ...theme.text.bodySm, color: theme.colors.text.danger },
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  input: {
    ...theme.text.body,
    flex: 1,
    color: theme.colors.text.primary,
    padding: theme.space[3],
    minHeight: theme.size.touchTarget.min,
  },
  multiline: { minHeight: theme.space[24] * 1.5, textAlignVertical: 'top' },
  prefix: { ...theme.text.body, color: theme.colors.text.secondary, paddingLeft: theme.space[3] },
  placeholder: { color: theme.colors.text.muted },
  caret: { ...theme.text.body, color: theme.colors.text.secondary, paddingRight: theme.space[3] },
  disabled: { opacity: 0.6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.touchTarget.min,
    paddingVertical: theme.space[2],
  },
  optionText: { ...theme.text.body, color: theme.colors.text.primary, flex: 1 },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  quantityBox: { width: theme.space[24] },
  center: { textAlign: 'center' },
  stepGlyph: { ...theme.text.title, color: theme.colors.text.primary },
  stepper: { gap: theme.space[2] },
  stepperText: { ...theme.text.label, color: theme.colors.text.secondary },
  track: {
    height: theme.space[2],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.skeleton,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.action.primary,
  },
});
