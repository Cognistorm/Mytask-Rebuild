// Native alert frame in the 3X look (visual-refresh.md §6.4, as the web `.auth-alert`): the feedback border, a 4 px
// start bar in the tone's icon colour and a vertical tint (55 % tint over the surface → the full tint); fades in
// (M-15, a fade is kept under Reduce Motion). The caller lays out the text inside.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeIn } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/** `#RRGGBB` mix of two colours (`amount` of `a`). */
function mix(a: string, b: string, amount: number) {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(ch(a, i) * amount + ch(b, i) * (1 - amount))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

export function Alert(props: {
  tone: AlertTone;
  children: ReactNode;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const f = theme.colors.feedback;
  const c = {
    info: { bg: f.infoBg, border: f.infoBorder, bar: f.infoIcon },
    success: { bg: f.successBg, border: f.successBorder, bar: f.successIcon },
    warning: { bg: f.warningBg, border: f.warningBorder, bar: f.warningIcon },
    danger: { bg: f.dangerBg, border: f.dangerBorder, bar: f.dangerIcon },
  }[props.tone];
  return (
    <Animated.View
      entering={fadeIn}
      style={[s.alert, { borderColor: c.border, borderLeftColor: c.bar }, props.style]}
      accessibilityRole={props.accessibilityRole}
      testID={props.testID}
    >
      <Gradient
        token={{
          ...theme.gradient.surface,
          colors: [mix(c.bg, theme.colors.bg.surface, 0.55), c.bg],
        }}
        fill
        style={s.fill}
      />
      {props.children}
    </Animated.View>
  );
}

function styles(theme: Theme) {
  return StyleSheet.create({
    alert: {
      padding: theme.space[3],
      gap: theme.space[1],
      borderWidth: theme.borderWidth.hairline,
      borderLeftWidth: theme.space[1],
      borderRadius: theme.radius.control,
    },
    fill: {
      borderTopRightRadius: theme.radius.control - theme.borderWidth.hairline,
      borderBottomRightRadius: theme.radius.control - theme.borderWidth.hairline,
    },
  });
}
