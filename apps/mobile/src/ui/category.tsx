// Category-coloured pieces on native (visual-refresh.md §8.5, §10): the 8 px dot, a category row heading with the
// accent bar on its start edge, and the "See more" Ghost link in the category's ink. Colours come from the shared function
// (`categoryTheme`), so no colour (search, sellers, Top gigs) gives the brand set.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { categoryTheme } from '@mytask/tokens/native';
import { usePressScale } from './motion';
import { Gradient, useTheme } from './theme';
import type { Theme } from './theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The category set for the current scheme. */
export function useCategoryTheme(color: string | null | undefined) {
  const theme = useTheme();
  return useMemo(() => categoryTheme(color ?? null, theme.dark ? 'dark' : 'light'), [color, theme]);
}

export function CategoryDot({ color }: { color: string | null | undefined }) {
  const theme = useTheme();
  const cat = useCategoryTheme(color);
  const size = theme.space[2];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.full,
        backgroundColor: cat.indicator,
      }}
    />
  );
}

/**
 * Category row heading (as the web `.mt-home-row-head h2`): a 4 px bar (indicator → gradient end) on the start
 * edge and the title in text.primary.
 */
export function CategoryHeading(props: { title: string; color: string | null | undefined }) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useCategoryTheme(props.color);
  return (
    <View style={s.heading}>
      <Gradient
        token={{
          ...theme.gradient.surface,
          colors: [cat.indicator, cat.gradientEnd],
        }}
        style={s.bar}
      />
      <Text style={s.title} accessibilityRole="header">
        {props.title}
      </Text>
    </View>
  );
}

/** "See more": a compact Ghost link in the category's ink with a tintStrong border; tint while pressed. */
export function CategoryLink(props: {
  label: string;
  color: string | null | undefined;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useCategoryTheme(props.color);
  const press = usePressScale();
  const [pressed, setPressed] = useState(false);
  return (
    <AnimatedPressable
      style={[
        s.link,
        { borderColor: cat.tintStrong, backgroundColor: pressed ? cat.tint : 'transparent' },
        press.style,
      ]}
      onPress={props.onPress}
      onPressIn={() => {
        setPressed(true);
        press.pressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        press.pressOut();
      }}
      hitSlop={(theme.size.touchTarget.min - theme.size.control.sm) / 2}
      accessibilityRole="link"
      testID={props.testID}
    >
      <Text style={[s.linkText, { color: cat.ink }]}>{props.label}</Text>
    </AnimatedPressable>
  );
}

function styles(theme: Theme) {
  return StyleSheet.create({
    heading: { flexDirection: 'row', gap: theme.space[2], flexShrink: 1 },
    bar: {
      width: theme.space[1],
      marginVertical: theme.space['0.5'],
      borderRadius: theme.radius.full,
    },
    title: { ...theme.text.h3, color: theme.colors.text.primary, flexShrink: 1 },
    link: {
      minHeight: theme.size.control.sm,
      justifyContent: 'center',
      paddingHorizontal: theme.space[3],
      borderWidth: theme.borderWidth.hairline,
      borderRadius: theme.radius.control,
    },
    linkText: theme.text.label,
  });
}
