// The 4 px brand gradient strip along the top edge of a card or sheet (visual-refresh.md §3.2, §6.4; as the web
// profile card, dialogs and auth card). Place it as the first child of a view with a 1 px border and rounded top
// corners: it is clipped to the inner corners, so the parent keeps its shadow (no `overflow: hidden` there).
import { StyleSheet, View } from 'react-native';
import { Gradient, useTheme } from './theme';

export function BrandStrip({ radius }: { radius?: number }) {
  const theme = useTheme();
  const inner = (radius ?? theme.radius.card) - theme.borderWidth.hairline;
  return (
    <View
      style={[
        s.clip,
        { height: Math.max(inner, 4), borderTopLeftRadius: inner, borderTopRightRadius: inner },
      ]}
      pointerEvents="none"
    >
      <Gradient token={theme.gradient.brandStrip} style={{ height: theme.space[1] }} />
    </View>
  );
}

const s = StyleSheet.create({
  clip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
});
