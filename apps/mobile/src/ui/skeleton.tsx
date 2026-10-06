// Skeleton block with the M-13 shimmer (visual-refresh.md §6.4): a soft highlight band (`gradient.skeleton`)
// sweeps across the block every 1200 ms; static under Reduce Motion. Decorative: the caller's container carries
// the progressbar role and label.
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useShimmer } from './motion';
import { Gradient, useTheme } from './theme';

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const { progress, reduced } = useShimmer();
  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value * 2 - 1) * width }],
  }));
  const s = useMemo(
    () =>
      StyleSheet.create({
        block: {
          overflow: 'hidden',
          borderRadius: theme.radius.control,
          backgroundColor: theme.colors.bg.skeleton,
        },
      }),
    [theme],
  );

  return (
    <View
      style={[s.block, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {reduced || !width ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, band]} pointerEvents="none">
          <Gradient
            token={theme.gradient.skeleton}
            fill
            style={{ borderRadius: theme.radius.control }}
          />
        </Animated.View>
      )}
    </View>
  );
}
