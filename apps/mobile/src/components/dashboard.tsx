// Dashboard pieces of the app on the shared tokens (components.md §6.7 RoleSwitcher, §6.9 TabBar icons,
// §7.5 StatTile, §7.10 EmptyState, §7.15 InfoButton, Skeleton; design 07 "Native app"). Same artwork as the
// web (`packages/ui/src/web/dashboard.tsx`, Phosphor 256 grid). Texts come from i18n.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { DashboardSide } from '../lib/dashboard';
import { Button, SkeletonBlock } from '../ui';

const ICON = {
  // Handbag (Buying) and Storefront (Selling), as the web switcher.
  buying:
    'M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 160H40V56h176v144ZM176 88a48 48 0 0 1-96 0 8 8 0 0 1 16 0 32 32 0 0 0 64 0 8 8 0 0 1 16 0Z',
  selling:
    'M232 96a7.89 7.89 0 0 0-.3-2.2l-14.35-50.2A16.07 16.07 0 0 0 202 32H54a16.07 16.07 0 0 0-15.35 11.6L24.31 93.8A7.89 7.89 0 0 0 24 96v16a40 40 0 0 0 16 32v64a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16v-64a40 40 0 0 0 16-32ZM54 48h148l11.42 40H42.61Zm50 56h48v8a24 24 0 0 1-48 0Zm-16 0v8a24 24 0 0 1-48 0v-8Zm112 104H56v-56.8a40.57 40.57 0 0 0 8 .8 40 40 0 0 0 32-16 40 40 0 0 0 64 0 40 40 0 0 0 32 16 40.57 40.57 0 0 0 8-.8Zm-8-72a24 24 0 0 1-24-24v-8h48v8a24 24 0 0 1-24 24Z',
  info: 'M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm16-40a8 8 0 0 1-8 8 16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16 16 16 0 0 1 16 16v40a8 8 0 0 1 8 8Zm-32-92a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z',
  // TabBar (§6.9): Regular when inactive, Fill when active.
  home: 'M219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32ZM208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80 80 80Z',
  homeFill:
    'M224 120v96a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8v-52a4 4 0 0 0-4-4h-40a4 4 0 0 0-4 4v52a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-96a16 16 0 0 1 4.69-11.31l80-80a16 16 0 0 1 22.62 0l80 80A16 16 0 0 1 224 120Z',
  explore:
    'm229.66 218.34-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32ZM40 112a72 72 0 1 1 72 72 72.08 72.08 0 0 1-72-72Z',
  exploreFill:
    'M168 112a56 56 0 1 1-56-56 56.06 56.06 0 0 1 56 56Zm61.66 117.66a8 8 0 0 1-11.32 0l-50.06-50.07a88 88 0 1 1 11.32-11.31l50.06 50.06a8 8 0 0 1 0 11.32ZM112 184a72 72 0 1 0-72-72 72.08 72.08 0 0 0 72 72Z',
  dashboard:
    'M104 40H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 64H56V56h48v48Zm96-64h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 64h-48V56h48v48Zm-96 32H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16Zm0 64H56v-48h48v48Zm96-64h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16Zm0 64h-48v-48h48v48Z',
  dashboardFill:
    'M120 56v48a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h48a16 16 0 0 1 16 16Zm80-16h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm-96 96H56a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16Zm96 0h-48a16 16 0 0 0-16 16v48a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16v-48a16 16 0 0 0-16-16Z',
  account:
    'M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24ZM74.08 197.5a64 64 0 0 1 107.84 0 87.83 87.83 0 0 1-107.84 0ZM96 120a32 32 0 1 1 32 32 32 32 0 0 1-32-32Zm97.76 66.41a79.66 79.66 0 0 0-36.06-28.75 48 48 0 1 0-59.4 0 79.66 79.66 0 0 0-36.06 28.75 88 88 0 1 1 131.52 0Z',
  accountFill:
    'M172 120a44 44 0 1 1-44-44 44.05 44.05 0 0 1 44 44Zm60 8A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88.09 88.09 0 0 0-91.47-87.93C77.43 41.89 39.87 81.12 40 128.25a87.65 87.65 0 0 0 22.24 58.16A79.71 79.71 0 0 1 84 165.1a4 4 0 0 1 4.83.32 59.83 59.83 0 0 0 78.28 0 4 4 0 0 1 4.83-.32 79.71 79.71 0 0 1 21.79 21.31A87.62 87.62 0 0 0 216 128Z',
} as const;

export function Icon({
  name,
  color,
  size = theme.size.icon.md,
}: {
  name: keyof typeof ICON;
  color: ColorValue;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessible={false}>
      <Path d={ICON[name]} fill={color} />
    </Svg>
  );
}

const ROLE = {
  buying: { bg: theme.colors.role.buyingBg, text: theme.colors.role.buyingText },
  selling: { bg: theme.colors.role.sellingBg, text: theme.colors.role.sellingText },
};

/**
 * Buying / Selling segmented control (§6.7): full width, label + icon always visible, the current side in the
 * role colours and marked selected (never colour alone). Selecting the other side calls `onSelect`.
 */
export function RoleSwitcher(props: {
  label: string;
  current: DashboardSide | undefined;
  items: { side: DashboardSide; label: string }[];
  onSelect: (side: DashboardSide) => void;
}) {
  return (
    <View style={s.switcher} accessibilityRole="tablist" accessibilityLabel={props.label}>
      {props.items.map((item) => {
        const selected = item.side === props.current;
        const color = selected ? ROLE[item.side].text : theme.colors.text.secondary;
        return (
          <Pressable
            key={item.side}
            style={[s.segment, selected ? { backgroundColor: ROLE[item.side].bg } : null]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={`switch-${item.side}`}
            onPress={() => !selected && props.onSelect(item.side)}
          >
            <Icon name={item.side} color={color} size={theme.size.icon.sm} />
            <Text style={[s.segmentText, { color }, selected ? s.segmentTextOn : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Role badge ("ფრილანსერის პროფილი" / "დამკვეთის პროფილი"), as the legacy sidebar. */
export function RoleBadge({ side, label }: { side: DashboardSide; label: string }) {
  return (
    <Text style={[s.badge, { backgroundColor: ROLE[side].bg, color: ROLE[side].text }]}>
      {label}
    </Text>
  );
}

/** KPI tile (§7.5): label wraps to 2 lines, value below; optional explanation behind an info toggle. */
export function StatTile(props: {
  label: string;
  value: string;
  negative?: boolean;
  info?: { label: string; text: string };
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.tile} testID={props.testID} accessible={!props.info}>
      <View style={s.tileHead}>
        <Text style={s.tileLabel}>{props.label}</Text>
        {props.info ? (
          <Pressable
            style={s.infoButton}
            hitSlop={theme.space[2]}
            accessibilityRole="button"
            accessibilityLabel={props.info.label}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
          >
            <Icon name="info" color={theme.colors.text.secondary} size={theme.size.icon.sm} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[s.tileValue, props.negative ? s.negative : null]}>{props.value}</Text>
      {props.info && open ? (
        <Text style={s.tileInfo} accessibilityLiveRegion="polite">
          {props.info.text}
        </Text>
      ) : null}
    </View>
  );
}

/** Tiles in 2 columns on phones; tiles in a row keep equal height. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={s.grid}>{children}</View>;
}

/** A titled card section (Panel). */
export function Section({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={s.section} testID={testID}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      {action}
    </View>
  );
}

/** Loading placeholder: grey tiles and rows, announced once as "Loading…". */
export function Skeleton({ label, tiles, rows }: { label: string; tiles: number; rows: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={s.skeleton}>
      <View style={s.grid}>
        {Array.from({ length: tiles }, (_, i) => (
          <SkeletonBlock key={i} style={[s.tile, s.skeletonTile]} />
        ))}
      </View>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} style={s.skeletonRow} />
      ))}
    </View>
  );
}

/** Secondary (outlined) button for the second action of a pair. */
export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button variant="secondary" label={label} onPress={onPress} />;
}

/** A label/value row inside a section (stacked table rows on phones, ResponsiveTable §7.x). */
export function Row({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={s.row} accessible>
      <Text style={s.rowTitle}>{title}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={s.rowLine}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/** The side's navigation as a grouped list (design 07 "Native app"). */
export function NavList(props: {
  label: string;
  items: { key: string; label: string }[];
  onPress: (key: string) => void;
}) {
  if (props.items.length === 0) return null;
  return (
    <View style={s.section} accessibilityLabel={props.label}>
      {props.items.map((item) => (
        <Pressable
          key={item.key}
          style={s.navItem}
          accessibilityRole="link"
          onPress={() => props.onPress(item.key)}
        >
          <Text style={s.navText}>{item.label}</Text>
          <Text style={s.navChevron}>{'›'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const card = {
  backgroundColor: theme.colors.bg.surface,
  borderWidth: theme.borderWidth.hairline,
  borderColor: theme.colors.border.default,
  borderRadius: theme.radius.card,
};

const s = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    padding: theme.space[1],
    gap: theme.space[1],
    ...card,
    borderRadius: theme.radius.control + theme.space[1],
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[2],
    minHeight: theme.size.touchTarget.min,
    paddingHorizontal: theme.space[2],
    borderRadius: theme.radius.control,
  },
  segmentText: { ...theme.text.label, flexShrink: 1, textAlign: 'center' },
  segmentTextOn: { fontFamily: theme.fonts.family[600] },
  badge: {
    ...theme.text.badge,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] },
  tile: { ...card, flexBasis: '40%', flexGrow: 1, padding: theme.space[3], gap: theme.space[1] },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[1] },
  tileLabel: { ...theme.text.bodySm, color: theme.colors.text.secondary, flex: 1 },
  tileValue: { ...theme.text.price, color: theme.colors.text.primary },
  negative: { color: theme.colors.text.danger },
  tileInfo: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  infoButton: { alignItems: 'center', justifyContent: 'center' },
  section: { ...card, padding: theme.space[4], gap: theme.space[3] },
  sectionTitle: { ...theme.text.h3, color: theme.colors.text.primary },
  empty: { alignItems: 'center', gap: theme.space[3], paddingVertical: theme.space[4] },
  emptyTitle: { ...theme.text.body, color: theme.colors.text.secondary, textAlign: 'center' },
  skeleton: { gap: theme.space[3] },
  skeletonTile: {
    backgroundColor: theme.colors.bg.skeleton,
    borderColor: theme.colors.bg.skeleton,
    minHeight: theme.space[20],
  },
  skeletonRow: {
    height: theme.space[10],
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.skeleton,
  },
  row: {
    gap: theme.space[1],
    paddingBottom: theme.space[3],
    borderBottomWidth: theme.borderWidth.hairline,
    borderBottomColor: theme.colors.border.subtle,
  },
  rowTitle: { ...theme.text.label, color: theme.colors.text.primary },
  rowLine: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.touchTarget.min,
  },
  navText: { ...theme.text.body, color: theme.colors.text.primary, flex: 1 },
  navChevron: { ...theme.text.h3, color: theme.colors.text.muted },
});
