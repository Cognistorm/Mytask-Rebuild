// Pieces of the edit-profile screen (spec 02 AC-15: each part saves on its own and shows its own message), the
// same as the web `apps/web/src/components/profile-edit/block.tsx`: a titled block with a one-line hint and an
// action on the right, its saving state, and the radio group of the level choices (components.md §5.8).
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTheme as theme } from '@mytask/tokens/native';
import { Card, Radio } from '../../ui';
import { Notice } from '../form';
import type { ApiError } from '../reauth';

export function Block(props: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Card style={s.block} testID={props.testID}>
      <View style={s.head}>
        <View style={s.headText}>
          <Text style={s.title} accessibilityRole="header">
            {props.title}
          </Text>
          {props.hint ? <Text style={s.hint}>{props.hint}</Text> : null}
        </View>
        {props.action}
      </View>
      {props.children}
    </Card>
  );
}

/** Saving state of one block: busy flag, the success text and the API error (field errors + general text). */
export function useBlockState() {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string>();
  const [err, setErr] = useState<ApiError>();
  const start = useCallback(() => {
    setBusy(true);
    setOk(undefined);
    setErr(undefined);
  }, []);
  const done = useCallback((result: { ok?: string; err?: ApiError }) => {
    setBusy(false);
    setOk(result.ok);
    setErr(result.err);
  }, []);
  const reset = useCallback(() => {
    setOk(undefined);
    setErr(undefined);
  }, []);
  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;
  return { busy, ok, fields, general, start, done, reset };
}

/** The block's success message or its general error (field errors sit under their fields). */
export function BlockMessage({ ok, general }: { ok?: string; general?: string }) {
  if (ok) return <Notice kind="success" text={ok} />;
  if (general) return <Notice kind="error" text={general} />;
  return null;
}

const PENCIL =
  'm227.31 73.37-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63ZM92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68 147.31 64l24-24L216 84.68Z';

/**
 * Small button with a pencil (legacy "Edit" / "Set availability" links in the block head). 3X look (as the web
 * `button.mt-edit-link`, 3X.14c): a compact Ghost button, 36 high with a 44 hit area; Delete in the danger colour
 * with a danger tint while pressed.
 */
export function EditLink(props: {
  label: string;
  onPress: () => void;
  /** Accessible name when the visible label alone is not enough ("Edit" → "Edit: Headline"). */
  accessibilityLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const color = props.danger ? theme.colors.text.danger : theme.colors.text.link;
  return (
    <Pressable
      style={({ pressed }) => [
        s.link,
        props.danger ? s.linkDanger : null,
        pressed ? (props.danger ? s.linkDangerPressed : s.linkPressed) : null,
        props.disabled ? s.linkDisabled : null,
      ]}
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: !!props.disabled }}
      hitSlop={(theme.size.touchTarget.min - theme.size.control.sm) / 2}
      testID={props.testID}
    >
      {props.danger ? null : (
        <Svg width={theme.size.icon.xs} height={theme.size.icon.xs} viewBox="0 0 256 256">
          <Path d={PENCIL} fill={color} />
        </Svg>
      )}
      <Text style={[s.linkText, { color }]}>{props.label}</Text>
    </Pressable>
  );
}

/** Radio group (§5.8): a labelled list of choices, the chosen one marked (never colour alone). */
export function RadioGroup<V extends string>(props: {
  label: string;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (value: V) => void;
  error?: string;
}) {
  return (
    <View style={s.radios} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      <Text style={s.radioLegend}>{props.label}</Text>
      {props.options.map((o) => {
        const checked = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            style={s.radio}
            onPress={() => props.onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
          >
            <Radio checked={checked} />
            <Text style={s.radioText}>{o.label}</Text>
          </Pressable>
        );
      })}
      {props.error ? (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

/** Two buttons side by side (Cancel / Update). */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={s.buttons}>{children}</View>;
}

export const ButtonCell = ({ children }: { children: ReactNode }) => (
  <View style={s.cell}>{children}</View>
);

const s = StyleSheet.create({
  block: {
    padding: theme.space[4],
    gap: theme.space[3],
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[3] },
  headText: { flex: 1, gap: theme.space[1] },
  title: { ...theme.text.title, color: theme.colors.text.primary },
  hint: { ...theme.text.bodySm, color: theme.colors.text.muted },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[1],
    minHeight: theme.size.control.sm,
    paddingHorizontal: theme.space[2],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.action.ghost,
    borderRadius: theme.radius.control,
  },
  linkPressed: { backgroundColor: theme.colors.action.ghostHover },
  linkDanger: { borderColor: theme.colors.feedback.dangerBorder },
  linkDangerPressed: { backgroundColor: theme.colors.feedback.dangerBg },
  linkDisabled: { opacity: 0.6 },
  linkText: { ...theme.text.label },
  radios: { gap: theme.space[1] },
  radioLegend: { ...theme.text.label, color: theme.colors.text.primary },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.size.touchTarget.min,
  },
  radioText: { ...theme.text.body, color: theme.colors.text.primary },
  error: { ...theme.text.bodySm, color: theme.colors.text.danger },
  buttons: { flexDirection: 'row', gap: theme.space[3] },
  cell: { flex: 1 },
});
