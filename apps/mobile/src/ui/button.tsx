// Native Button in the 3X look (visual-refresh.md §4, §10): a crisp border, the variant's vertical gradient, the
// darker pressed gradient fading in (M-1) with a 0.98 press (M-2), a flat disabled look, and busy = spinner at
// the start with the label kept (as the web Submit, 3X.14a). One size: md 44 (native never uses `sm`, components.md
// §0.3). Touch screens have no hover, so no glow at rest.
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressLayer, usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { GradientToken, Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  busy?: boolean;
  disabled?: boolean;
  /** `link` for buttons that open another screen or page. */
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const look = useMemo(() => looks(theme)[props.variant ?? 'primary'], [theme, props.variant]);
  const press = usePressScale();
  const layer = usePressLayer();
  const busy = !!props.busy;
  const off = busy || !!props.disabled;
  const flat = !!props.disabled && !busy;

  return (
    <AnimatedPressable
      style={[
        s.button,
        { borderColor: flat ? theme.colors.border.default : look.border },
        flat ? s.disabled : look.rest ? theme.shadow.control : null,
        busy ? s.busy : null,
        press.style,
        props.style,
      ]}
      onPress={props.onPress}
      onPressIn={() => {
        press.pressIn();
        layer.pressIn();
      }}
      onPressOut={() => {
        press.pressOut();
        layer.pressOut();
      }}
      disabled={off}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ busy, disabled: off }}
      testID={props.testID}
    >
      {!flat && look.rest ? <Gradient token={look.rest} fill style={s.layer} /> : null}
      {!flat ? (
        <Animated.View style={[s.fill, s.layer, layer.style]} pointerEvents="none">
          <Gradient token={look.pressed} fill style={s.layer} />
        </Animated.View>
      ) : null}
      <View style={s.content}>
        {busy ? <ActivityIndicator size="small" color={look.text} /> : null}
        <Text style={[s.label, { color: flat ? theme.colors.action.onDisabled : look.text }]}>
          {props.label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function looks(
  theme: Theme,
): Record<
  ButtonVariant,
  { rest: GradientToken | null; pressed: GradientToken; border: string; text: string }
> {
  const g = theme.gradient.action;
  const b = theme.colors.border.action;
  const a = theme.colors.action;
  return {
    primary: { rest: g.primary, pressed: g.primaryHover, border: b.primary, text: a.onPrimary },
    secondary: {
      rest: g.secondary,
      pressed: g.secondaryHover,
      border: b.secondary,
      text: a.onSecondary,
    },
    accent: { rest: g.accent, pressed: g.accentHover, border: b.accent, text: a.onAccent },
    danger: { rest: g.danger, pressed: g.dangerHover, border: b.danger, text: a.onDanger },
    // Ghost: transparent at rest, the subtle border keeps it a button (§4.2).
    ghost: { rest: null, pressed: g.ghostHover, border: b.ghost, text: a.onGhost },
  };
}

function styles(theme: Theme) {
  // The fill sits inside the 1 px border, so its corners are one pixel tighter.
  const inner = theme.radius.control - theme.borderWidth.hairline;
  return StyleSheet.create({
    button: {
      minHeight: theme.size.control.md,
      justifyContent: 'center',
      borderWidth: theme.borderWidth.hairline,
      borderRadius: theme.radius.control,
      paddingHorizontal: theme.space[4],
    },
    disabled: { backgroundColor: theme.colors.action.disabled },
    // Busy keeps the variant's look, slightly dimmed (§4.3).
    busy: { opacity: 0.85 },
    fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    layer: { borderRadius: inner },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[2],
      paddingVertical: theme.space[2],
    },
    label: { ...theme.text.label, textAlign: 'center' },
  });
}
