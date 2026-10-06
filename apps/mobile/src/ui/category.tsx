// Category-coloured pieces on native (visual-refresh.md §8.5, §10): the 8 px dot, a category row heading with the
// accent bar on its start edge, the "See more" Ghost link in the category's ink, the category page title band and
// the breadcrumb chips and the category-coloured chip. Colours come from the shared function
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
    band: {
      paddingVertical: theme.space[6],
      paddingHorizontal: theme.space[5],
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.bg.hero,
    },
    bandFill: { borderRadius: theme.radius.card },
    bandTitle: theme.text.h2,
    crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[1] },
    crumb: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
    crumbSep: { ...theme.text.caption, color: theme.colors.text.muted },
    crumbChip: {
      paddingHorizontal: theme.space[2],
      paddingVertical: theme.space['0.5'],
      borderWidth: theme.borderWidth.hairline,
      borderRadius: theme.radius.full,
    },
    crumbText: theme.text.caption,
    crumbCurrent: { color: theme.colors.text.primary },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[2],
      minHeight: theme.size.control.sm,
      paddingHorizontal: theme.space[3],
      borderWidth: theme.borderWidth.hairline,
      borderRadius: theme.radius.pill,
    },
    catChipFill: { borderRadius: theme.radius.pill },
    catChipDot: { width: theme.space[2], height: theme.space[2], borderRadius: theme.radius.full },
    catChipText: theme.text.label,
  });
}

/**
 * Category page title band (§8.5, as the web `.mt-catalog-band`): the category gradient with the title in onSolid
 * (≥ 4.5:1 on both ends); long texts stay on the plain surface below it.
 */
export function CategoryBand(props: { title: string; color: string | null | undefined }) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useCategoryTheme(props.color);
  return (
    <View style={[s.band, theme.shadow.sm]}>
      <Gradient
        token={{
          ...theme.gradient.brandBanner,
          colors: [cat.gradientStart, cat.gradientEnd],
          locations: [0, 1],
        }}
        fill
        style={s.bandFill}
      />
      <Text style={[s.bandTitle, { color: cat.onSolid }]} accessibilityRole="header">
        {props.title}
      </Text>
    </View>
  );
}

/**
 * Breadcrumb (as the web `.mt-breadcrumb`): earlier steps are small tint chips in the category ink that open their
 * page; the last step (this page) is plain text.
 */
export function Breadcrumb(props: {
  label: string;
  color: string | null | undefined;
  items: { label: string; onPress?: () => void }[];
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useCategoryTheme(props.color);
  return (
    <View style={s.crumbs} accessibilityLabel={props.label}>
      {props.items.map((item, i) => (
        <View key={i} style={s.crumb}>
          {i > 0 ? (
            <Text style={s.crumbSep} accessibilityElementsHidden>
              {'›'}
            </Text>
          ) : null}
          {item.onPress ? (
            <Pressable
              style={({ pressed }) => [
                s.crumbChip,
                {
                  backgroundColor: pressed ? cat.tintStrong : cat.tint,
                  borderColor: pressed ? cat.indicator : cat.tintStrong,
                },
              ]}
              onPress={item.onPress}
              hitSlop={theme.space[2]}
              accessibilityRole="link"
            >
              <Text style={[s.crumbText, { color: cat.ink }]}>{item.label}</Text>
            </Pressable>
          ) : (
            <Text style={[s.crumbText, s.crumbCurrent]}>{item.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * A chip in its linked top-level category's colour (§8.5, Q-171; as the web `.mt-chip-category`): tint → tintStrong
 * with the dot and ink text at rest, the filled category gradient with onSolid text when selected. Presses in (M-2).
 */
export function CategoryChip(props: {
  label: string;
  color: string | null | undefined;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => styles(theme), [theme]);
  const cat = useCategoryTheme(props.color);
  const press = usePressScale();
  const [pressed, setPressed] = useState(false);
  const on = !!props.selected;
  return (
    <AnimatedPressable
      style={[
        s.catChip,
        { borderColor: on ? 'transparent' : pressed ? cat.indicator : cat.tintStrong },
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
      accessibilityState={{ selected: on }}
    >
      <Gradient
        token={{
          ...theme.gradient.surface,
          colors: on ? [cat.gradientStart, cat.gradientEnd] : [cat.tint, cat.tintStrong],
        }}
        fill
        style={s.catChipFill}
      />
      <View style={[s.catChipDot, { backgroundColor: on ? cat.onSolid : cat.indicator }]} />
      <Text style={[s.catChipText, { color: on ? cat.onSolid : cat.ink }]}>{props.label}</Text>
    </AnimatedPressable>
  );
}
