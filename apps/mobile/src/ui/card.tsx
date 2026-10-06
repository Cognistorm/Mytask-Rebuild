// Native Card in the 3X look (visual-refresh.md §3.2, §6.1): the surface gradient, a 1 px border, radius 16 and
// the small shadow. A tappable card presses in to 0.99 and its border turns `cardHover` while pressed; Featured
// keeps the orange 2 px frame (spec 03 AC-18). M-14: a success alert inside a card makes the card glow success once
// (as the web `:has(.auth-alert-success)`, 3X.14c): the alert calls `useCardGlow()` when it appears.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { easing, usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CARD_PRESSED = 0.99;

const GlowContext = createContext<(() => void) | null>(null);

/** The enclosing card's one-time success glow (M-14), or a no-op outside a card. */
export function useCardGlow() {
  return useContext(GlowContext);
}

/** M-14: a success border + glow fading in and out once (800 ms; a fade, so kept under Reduce Motion). */
function useGlow(theme: Theme) {
  const value = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: value.value }));
  const flash = useCallback(() => {
    const fade = (to: number, duration: number) =>
      withTiming(to, { duration, easing: easing('standard'), reduceMotion: ReduceMotion.Never });
    value.value = withSequence(fade(1, theme.motion.duration.base), fade(0, 600));
  }, [value, theme]);
  return { style, flash };
}

export function Card(props: {
  children: ReactNode;
  /** Makes the whole card one tap target. */
  onPress?: () => void;
  featured?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  /** Groups the card's content as one element for screen readers. */
  accessible?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const press = usePressScale(CARD_PRESSED);
  const glow = useGlow(theme);
  const [pressed, setPressed] = useState(false);
  const frame = [s.card, props.featured ? s.featured : pressed ? s.pressed : null, props.style];
  const border = props.featured ? theme.borderWidth.strong : theme.borderWidth.hairline;
  // The fill sits inside the border, so its corners are tighter by the border width.
  const surface = (
    <>
      <Gradient
        token={theme.gradient.surface}
        fill
        style={{ borderRadius: theme.radius.card - border }}
      />
      <Animated.View style={[s.glow, theme.glow.success, glow.style]} pointerEvents="none" />
    </>
  );

  if (!props.onPress)
    return (
      <View
        style={frame}
        accessible={props.accessible}
        accessibilityRole={props.accessibilityRole}
        accessibilityLabel={props.accessibilityLabel}
        testID={props.testID}
      >
        {surface}
        <GlowContext.Provider value={glow.flash}>{props.children}</GlowContext.Provider>
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
      <GlowContext.Provider value={glow.flash}>{props.children}</GlowContext.Provider>
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
    // Drawn over the card's own border.
    glow: {
      position: 'absolute',
      top: -theme.borderWidth.hairline,
      right: -theme.borderWidth.hairline,
      bottom: -theme.borderWidth.hairline,
      left: -theme.borderWidth.hairline,
      borderRadius: theme.radius.card,
      borderWidth: theme.borderWidth.strong,
      borderColor: theme.colors.feedback.successIcon,
    },
  });
}
