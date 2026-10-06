// Multi-layer gradients of the 3X look on native (visual-refresh.md §3.1 canvas, §3.4 hero, §10). The tokens stack
// radial glows over a linear base as on the web; expo-linear-gradient has no radial gradient, so a radial layer is
// drawn as a linear fade from its centre (`at`) towards the opposite corner, with the same colours and stops.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gradient, useTheme } from './theme';
import type { GradientToken } from './theme';

type LayerToken = {
  readonly type: string;
  readonly colors: readonly string[];
  readonly locations: readonly number[];
  readonly at?: string;
  readonly start?: { readonly x: number; readonly y: number };
  readonly end?: { readonly x: number; readonly y: number };
};

/** `"85% 15%"` → `{ x: 0.85, y: 0.15 }`. */
function point(at: string | undefined) {
  const [x = 50, y = 50] = (at ?? '50% 50%').split(' ').map((v) => parseFloat(v));
  return { x: x / 100, y: y / 100 };
}

function asLinear(layer: LayerToken): GradientToken {
  const start = layer.start ?? point(layer.at);
  const end = layer.end ?? { x: 1 - start.x, y: 1 - start.y };
  return {
    colors: layer.colors as unknown as GradientToken['colors'],
    locations: layer.locations as unknown as GradientToken['locations'],
    start,
    end,
  };
}

/** Paints a layered token (`theme.gradient.canvas`, `theme.gradient.hero`), the last layer at the bottom. */
export function GradientLayers(props: {
  layers: readonly LayerToken[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const bottomUp = [...props.layers].reverse();
  return (
    <View style={props.style}>
      {bottomUp.map((layer, i) => (
        <Gradient key={i} token={asLinear(layer)} fill />
      ))}
      {props.children}
    </View>
  );
}

/** A screen on the page canvas (§3.1): the canvas gradient fixed behind scrolling content. */
export function Canvas(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[s.screen, { backgroundColor: theme.colors.bg.canvas }, props.style]}>
      <GradientLayers layers={theme.gradient.canvas} style={StyleSheet.absoluteFill} />
      {props.children}
    </View>
  );
}

const s = StyleSheet.create({ screen: { flex: 1 } });
