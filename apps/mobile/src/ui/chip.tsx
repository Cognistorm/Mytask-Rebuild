// Native Chip in the 3X look (visual-refresh.md §6.2, §8.5): a bordered pill with the Secondary gradient at rest;
// selected = the tint → tintStrong gradient, the indicator border and ink text. Colours come from the shared
// category function, so a chip with a category `color` takes that category's set and one without takes the brand
// set (`categoryTheme(null)`). A tappable chip presses in (M-2) with the indicator border.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { categoryTheme } from '@mytask/tokens/native';
import { usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { GradientToken, Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip(props: {
  label: string;
  selected?: boolean;
  /** The top-level category's colour (`#RRGGBB`); none = brand. */
  color?: string | null;
  onPress?: () => void;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useMemo(
    () => categoryTheme(props.color ?? null, theme.dark ? 'dark' : 'light'),
    [props.color, theme.dark],
  );
  const press = usePressScale();
  const [pressed, setPressed] = useState(false);
  const on = !!props.selected;
  const fill: GradientToken = on
    ? { ...theme.gradient.surface, colors: [cat.tint, cat.tintStrong] }
    : theme.gradient.action.secondary;
  const frame = [
    s.chip,
    { borderColor: on || pressed ? cat.indicator : theme.colors.border.default },
    props.style,
  ];
  const content = (
    <>
      <Gradient token={fill} fill style={s.fill} />
      <Text style={[s.label, { color: on ? cat.ink : theme.colors.text.primary }]}>
        {props.label}
      </Text>
    </>
  );

  if (!props.onPress)
    return (
      <Animated.View
        style={frame}
        accessible
        accessibilityLabel={props.accessibilityLabel ?? props.label}
        accessibilityState={on ? { selected: true } : undefined}
        testID={props.testID}
      >
        {content}
      </Animated.View>
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
      hitSlop={(theme.size.touchTarget.min - chipHeight(theme)) / 2}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ selected: on }}
      testID={props.testID}
    >
      {content}
    </AnimatedPressable>
  );
}

/** 32: compact, the hit area grows to the 44 touch target. */
function chipHeight(theme: Theme) {
  return theme.size.control.sm - theme.space[1];
}

function styles(theme: Theme) {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      minHeight: chipHeight(theme),
      justifyContent: 'center',
      borderWidth: theme.borderWidth.hairline,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.space[3],
    },
    fill: { borderRadius: theme.radius.pill },
    label: { ...theme.text.label, paddingVertical: theme.space[1] },
  });
}
