// Native form controls in the 3X look (visual-refresh.md §6.3, as the web `controls.css` of 3X.9b): the input frame
// (strong border, input gradient fill; focus = brand border + soft brand glow; invalid = danger border) and the
// radio mark (strong ring; checked = the Primary gradient with a white dot that grows in, none under Reduce Motion).
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { lightTheme } from '@mytask/tokens/native';
import { easing } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

/** Wraps a `TextInput` (give the input a transparent background and no border). */
export function InputFrame(props: {
  children: ReactNode;
  focused?: boolean;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  return (
    <View
      style={[
        s.frame,
        props.invalid ? s.invalid : props.focused ? s.focused : null,
        props.focused ? (props.invalid ? theme.glow.danger : theme.glow.brandSoft) : null,
        props.style,
      ]}
    >
      <Gradient token={theme.gradient.input} fill style={s.fill} />
      {props.children}
    </View>
  );
}

const markIn = ZoomIn.duration(lightTheme.motion.duration.fast)
  .easing(easing('standard'))
  .reduceMotion(ReduceMotion.System);

/** The radio mark of an option row; the row itself carries `accessibilityRole="radio"` and its state. */
export function Radio({ checked }: { checked: boolean }) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  return (
    <View style={[s.radio, checked ? s.radioOn : null]}>
      {checked ? (
        <>
          <Gradient token={theme.gradient.action.primary} fill style={s.round} />
          <Animated.View entering={markIn} style={s.dot} />
        </>
      ) : null}
    </View>
  );
}

function styles(theme: Theme) {
  const box = theme.size.checkbox;
  return StyleSheet.create({
    frame: {
      borderWidth: theme.borderWidth.hairline,
      borderColor: theme.colors.border.strong,
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.bg.surface,
    },
    fill: { borderRadius: theme.radius.control - theme.borderWidth.hairline },
    focused: { borderColor: theme.colors.border.brand },
    invalid: { borderColor: theme.colors.border.danger },
    radio: {
      width: box,
      height: box,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      borderWidth: theme.borderWidth.strong,
      borderColor: theme.colors.border.strong,
      backgroundColor: theme.colors.bg.surface,
    },
    radioOn: { borderColor: theme.colors.border.action.primary },
    round: { borderRadius: theme.radius.full },
    dot: {
      width: box / 2.5,
      height: box / 2.5,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.action.onPrimary,
    },
  });
}
