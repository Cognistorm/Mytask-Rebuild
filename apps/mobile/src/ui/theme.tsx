// The native theme for the 3X look (visual-refresh.md §10). One seam for the scheme: the app is light-only today
// (tokens.md: the mobile ThemeProvider with light / dark / system comes with an Account → Settings switch, not
// built yet); the 3X pieces read the theme through `useTheme()` so they follow it the day it lands.
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { lightTheme } from '@mytask/tokens/native';
import type { Theme } from '@mytask/tokens/native';

export type { Theme };

export function useTheme(): Theme {
  return lightTheme;
}

/** A linear gradient token from the native build (`theme.gradient.*`, stop arrays for expo-linear-gradient). */
export interface GradientToken {
  readonly colors: readonly [string, string, ...string[]];
  readonly locations: readonly [number, number, ...number[]];
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
}

/** Paints a gradient token. `fill` lays it under the parent's content (absolute, inside the parent's border). */
export function Gradient(props: {
  token: GradientToken;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
  children?: ReactNode;
}) {
  const { token } = props;
  return (
    <LinearGradient
      colors={token.colors}
      locations={token.locations}
      start={token.start}
      end={token.end}
      style={[props.fill ? fillStyle : null, props.style]}
      pointerEvents={props.fill ? 'none' : undefined}
    >
      {props.children}
    </LinearGradient>
  );
}

const fillStyle: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
