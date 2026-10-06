// Native icon button in the 3X look (visual-refresh.md §4.2 Secondary icon, as the web drawer / dialog close): a
// 44 round button with a border and the Secondary gradient, the pressed gradient fading in and a 0.98 press.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressLayer, usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton(props: {
  /** The glyph or icon (decorative; the label names the action). */
  children: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const press = usePressScale();
  const layer = usePressLayer();
  return (
    <AnimatedPressable
      style={[s.button, theme.shadow.control, press.style]}
      onPress={props.onPress}
      onPressIn={() => {
        press.pressIn();
        layer.pressIn();
      }}
      onPressOut={() => {
        press.pressOut();
        layer.pressOut();
      }}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
    >
      <Gradient token={theme.gradient.action.secondary} fill style={s.round} />
      <Animated.View style={[s.layer, layer.style]} pointerEvents="none">
        <Gradient token={theme.gradient.action.secondaryHover} fill style={s.round} />
      </Animated.View>
      {props.children}
    </AnimatedPressable>
  );
}

function styles(theme: Theme) {
  const size = theme.size.touchTarget.min;
  return StyleSheet.create({
    button: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      borderWidth: theme.borderWidth.hairline,
      borderColor: theme.colors.border.action.secondary,
    },
    round: { borderRadius: theme.radius.full },
    layer: StyleSheet.absoluteFill,
  });
}
