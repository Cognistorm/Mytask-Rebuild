// Native Card in the 3X look (visual-refresh.md §3.2, §6.1): the surface gradient, a 1 px border, radius 16 and
// the small shadow. A tappable card presses in to 0.99 and its border turns `cardHover` while pressed; Featured
// keeps the orange 2 px frame (spec 03 AC-18).
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CARD_PRESSED = 0.99;

export function Card(props: {
  children: ReactNode;
  /** Makes the whole card one tap target. */
  onPress?: () => void;
  featured?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const press = usePressScale(CARD_PRESSED);
  const [pressed, setPressed] = useState(false);
  const frame = [s.card, props.featured ? s.featured : pressed ? s.pressed : null, props.style];
  const border = props.featured ? theme.borderWidth.strong : theme.borderWidth.hairline;
  // The fill sits inside the border, so its corners are tighter by the border width.
  const surface = (
    <Gradient
      token={theme.gradient.surface}
      fill
      style={{ borderRadius: theme.radius.card - border }}
    />
  );

  if (!props.onPress)
    return (
      <View
        style={frame}
        accessibilityRole={props.accessibilityRole}
        accessibilityLabel={props.accessibilityLabel}
        testID={props.testID}
      >
        {surface}
        {props.children}
      </View>
    );

  return (
    <AnimatedPressable
      style={[frame, press.style]}
      onPress={props.onPress}
      onPressIn={() => {
        setPressed(true);
        press.pressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        press.pressOut();
      }}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
    >
      {surface}
      {props.children}
    </AnimatedPressable>
  );
}

function styles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderWidth: theme.borderWidth.hairline,
      borderColor: theme.colors.border.default,
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.bg.surface,
      ...theme.shadow.sm,
    },
    pressed: { borderColor: theme.colors.border.cardHover },
    featured: { borderWidth: theme.borderWidth.strong, borderColor: theme.colors.border.featured },
  });
}
