// Shared Reanimated presets for the 3X motion catalogue (visual-refresh.md §7, §10). Every animation honours the
// system Reduce Motion setting (spec 3X R-4.3): movement and scale are dropped, short fades stay, loops stop.
import { useEffect } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { lightTheme } from '@mytask/tokens/native';

const m = lightTheme.motion;
type Curve = keyof typeof m.easing;

/** A token curve (`motion.easing.*`, cubic-bezier) as a Reanimated easing. */
export function easing(curve: Curve) {
  const [x1, y1, x2, y2] = m.easing[curve];
  return Easing.bezier(x1, y1, x2, y2);
}

/** M-2 / §6.1 pressed: scale 0.98 (controls) or 0.99 (cards), 80 ms in / 120 ms out, none under Reduce Motion. */
export function usePressScale(scale: number = m.scale.pressed) {
  const reduced = useReducedMotion();
  const value = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: value.value }] }));
  return {
    style,
    pressIn() {
      if (reduced) return;
      value.value = withTiming(scale, { duration: m.duration.press, easing: easing('standard') });
    },
    pressOut() {
      value.value = withTiming(1, { duration: m.duration.fast, easing: easing('standard') });
    },
  };
}

/** A layer that fades in while pressed (the pressed gradient of Button / Chip, as the web hover layer, M-1). */
export function usePressLayer() {
  const value = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: value.value }));
  const fade = (to: number) =>
    withTiming(to, {
      duration: to ? m.duration.press : m.duration.fast,
      easing: easing('standard'),
      // A fade is kept under Reduce Motion (≤ 120 ms, visual-refresh.md §7).
      reduceMotion: ReduceMotion.Never,
    });
  return {
    style,
    pressIn() {
      value.value = fade(1);
    },
    pressOut() {
      value.value = fade(0);
    },
  };
}

/**
 * M-10 first-view entrance for item `index` of a list: fade + 8 px up, 300 ms `enter`, 40 ms stagger for the
 * first 8 items (later items have no delay). Under Reduce Motion the content is shown at once.
 */
export function enterAt(index: number) {
  const delay = index < m.stagger.max ? index * m.stagger.step : 0;
  return FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: m.distance.enter }] })
    .duration(m.duration.slow)
    .delay(delay)
    .easing(easing('enter'))
    .reduceMotion(ReduceMotion.System);
}

/** M-15 alert / toast in: a short fade (kept under Reduce Motion: no movement). */
export const fadeIn = FadeIn.duration(m.duration.base)
  .easing(easing('enter'))
  .reduceMotion(ReduceMotion.Never);

/** M-13 skeleton shimmer: 0 → 1 progress, 1200 ms linear, looping; static (0) under Reduce Motion. */
export function useShimmer() {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    progress.value = withRepeat(
      withTiming(1, { duration: m.duration.shimmer, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduced, progress]);
  return { progress, reduced };
}
