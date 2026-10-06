// Profile pieces of the app on the shared tokens (components.md §7.4 ProfileCard, §7.6 Pill, §7.7 Avatar,
// §7.8 RatingSummary, §5.14 Chip, §8.1 Dialog as a bottom sheet on phones). Same rules as the web
// (`packages/ui/src/web/profile.tsx`). Texts come from i18n.
import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { formatClock } from '../lib/format';
import type { PortfolioItemCard } from '../lib/profile';
import { Button, Gradient, IconButton, Chip as UiChip } from '../ui';

type ImageVariants = components['schemas']['ImageVariants'];
type RatingBlock = components['schemas']['RatingBlock'];

const AVATAR = { md: theme.size.avatar.md, lg: theme.size.avatar.lg, xl: theme.size.avatar.xl };

/** Avatar (§7.7): the image, or the first letter when there is none or it fails to load; optional online dot. */
export function Avatar(props: {
  image: ImageVariants | null;
  name: string;
  size: keyof typeof AVATAR;
  online?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const px = AVATAR[props.size];
  const src = props.image ? (props.size === 'md' ? props.image.thumb : props.image.medium) : null;
  return (
    <View
      style={[s.avatar, { width: px, height: px }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {src && !broken ? (
        <Image source={{ uri: src }} style={s.avatarImage} onError={() => setBroken(true)} />
      ) : (
        <Text style={[s.avatarInitial, { fontSize: px * 0.4, lineHeight: px * 0.5 }]}>
          {[...props.name.trim()][0]?.toUpperCase() ?? '?'}
        </Text>
      )}
      {props.online !== undefined ? (
        <View style={[s.avatarDot, props.online ? s.dotOnline : null]} />
      ) : null}
    </View>
  );
}

/** Online / offline as text with its dot (§7.7: never colour only). */
export function OnlineStatus({ online, label }: { online: boolean; label: string }) {
  return (
    <View style={s.online}>
      <View style={[s.onlineDot, online ? s.dotOnline : null]} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

const SEAL =
  'M225.86 102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28 23.51 138.44 16 128 16s-18.27 7.51-25.18 14.14c-3.94 3.77-8 7.67-11.57 9.14-3.25 1.36-8.69 1.44-13.94 1.52-9.76.15-20.82.31-28.51 8s-7.8 18.75-8 28.51c-.08 5.25-.16 10.67-1.52 13.94-1.47 3.56-5.37 7.63-9.14 11.57C23.51 109.72 16 117.56 16 128s7.51 18.27 14.14 25.18c3.77 3.94 7.67 8 9.14 11.57 1.36 3.27 1.44 8.69 1.52 13.94.15 9.76.31 20.82 8 28.51s18.75 7.85 28.51 8c5.25.08 10.67.16 13.94 1.52 3.56 1.47 7.63 5.37 11.57 9.14 6.9 6.63 14.74 14.14 25.18 14.14s18.27-7.51 25.18-14.14c3.94-3.77 8-7.67 11.57-9.14 3.27-1.36 8.69-1.44 13.94-1.52 9.76-.15 20.82-.31 28.51-8s7.85-18.75 8-28.51c.08-5.25.16-10.67 1.52-13.94 1.47-3.56 5.37-7.63 9.14-11.57 6.63-6.9 14.14-14.74 14.14-25.18s-7.51-18.27-14.14-25.18Zm-52.2 6.84-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z';

/** Verified mark next to a name (Phosphor `SealCheck` fill), named for screen readers. */
export function VerifiedMark({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} testID="id-verified-mark">
      <Svg width={theme.size.icon.sm} height={theme.size.icon.sm} viewBox="0 0 256 256">
        <Path d={SEAL} fill={theme.colors.text.brand} />
      </Svg>
    </View>
  );
}

const STAR =
  'M234.29 114.85l-45 38.83L203 211.75a16.4 16.4 0 0 1-24.5 17.82L128 198.49l-50.53 31.08A16.4 16.4 0 0 1 53 211.75l13.76-58.07-45-38.83A16.46 16.46 0 0 1 31.08 86l59-4.76 22.76-55.08a16.36 16.36 0 0 1 30.27 0l22.75 55.08 59 4.76a16.46 16.46 0 0 1 9.37 28.86Z';

function Star({ color }: { color: string }) {
  const px = theme.size.icon.sm;
  return (
    <Svg width={px} height={px} viewBox="0 0 256 256">
      <Path d={STAR} fill={color} />
    </Svg>
  );
}

/** Five stars for an average in tenths (43 = 4.3), partly filled; `label` names the rating. */
export function RatingStars({ tenths, label }: { tenths: number; label: string }) {
  const px = theme.size.icon.sm;
  return (
    <View style={s.stars} accessible accessibilityRole="image" accessibilityLabel={label}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, tenths / 10 - i));
        return (
          <View key={i} style={{ width: px, height: px }}>
            <Star color={theme.colors.rating.starEmpty} />
            <View style={[s.starFill, { width: px * fill }]}>
              <Star color={theme.colors.rating.star} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** One rating block (§7.8, AC-10): average, stars, count and the 5→1 breakdown, or "No reviews yet". */
export function RatingSummary(props: {
  title: string;
  data: RatingBlock;
  labels: {
    empty: string;
    outOf5: string;
    stars: string;
    basedOn: string;
    rows: [string, string, string, string, string];
  };
  testID?: string;
}) {
  const { data, labels } = props;
  const average = data.averageTenths === null ? null : (data.averageTenths / 10).toFixed(1);
  const c = data.starCounts;
  const counts = [c.five, c.four, c.three, c.two, c.one];
  return (
    <View style={s.rating} testID={props.testID}>
      <Text style={s.ratingTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {data.count === 0 || average === null ? (
        <Text style={s.muted}>{labels.empty}</Text>
      ) : (
        <>
          <View style={s.ratingHead}>
            <Text style={s.ratingAverage}>{average}</Text>
            <Text style={s.secondary}>{labels.outOf5}</Text>
          </View>
          <RatingStars tenths={data.averageTenths ?? 0} label={labels.stars} />
          <Text style={s.muted}>{labels.basedOn}</Text>
          {counts.map((n, i) => (
            <View
              key={i}
              style={s.ratingRow}
              accessible
              accessibilityLabel={`${labels.rows[i]}: ${n}`}
            >
              <Text style={s.ratingRowLabel}>{labels.rows[i]}</Text>
              <View style={s.ratingBar}>
                <View style={[s.ratingBarFill, { width: `${(n / data.count) * 100}%` }]} />
              </View>
              <Text style={s.ratingRowCount}>{n}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const FOLDED_LINES = 6;

/** Long text folded to a few lines with More / Less (AC-18); the toggle shows only when the text is cut. */
export function ExpandableText(props: { text: string; more: string; less: string }) {
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  return (
    <View>
      {/* Measured once at full length (hidden) to know whether the folded text is cut. */}
      <Text
        style={[s.body, s.measure]}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        onTextLayout={(e) => setCut(e.nativeEvent.lines.length > FOLDED_LINES)}
      >
        {props.text}
      </Text>
      <Text style={s.body} numberOfLines={open ? undefined : FOLDED_LINES}>
        {props.text}
      </Text>
      {cut ? (
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={theme.space[2]}
        >
          <Text style={s.link}>{open ? props.less : props.more}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Chip (§5.14): a short label, not tappable until it has a screen to open. */
export function Chip({
  label,
  accessibilityLabel,
}: {
  label: string;
  accessibilityLabel?: string;
}) {
  return <UiChip label={label} accessibilityLabel={accessibilityLabel} />;
}

const PILL = {
  warning: { backgroundColor: theme.colors.badge.warningBg, color: theme.colors.badge.warningText },
  danger: { backgroundColor: theme.colors.badge.dangerBg, color: theme.colors.badge.dangerText },
  success: { backgroundColor: theme.colors.badge.successBg, color: theme.colors.badge.successText },
};

/** Status pill (§7.6): text on a soft colour, never colour alone. */
export function Pill({ tone, label }: { tone: keyof typeof PILL; label: string }) {
  return <Text style={[s.pill, PILL[tone]]}>{label}</Text>;
}

const STATUS_PILL = {
  pending: { tone: 'warning', key: 't_pending' },
  rejected: { tone: 'danger', key: 't_portfolio_status_rejected' },
} as const;

/** One work in a portfolio grid; the owner also sees "Pending" / "Rejected" (AC-28, AC-42). Opens the item viewer. */
export function PortfolioCard({
  item,
  t,
  onPress,
}: {
  item: PortfolioItemCard;
  t: (key: string) => string;
  onPress: () => void;
}) {
  const pill = item.status === 'active' ? null : STATUS_PILL[item.status];
  return (
    <Pressable
      style={({ pressed }) => [s.work, pressed && s.pressed]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={pill ? `${item.title}, ${t(pill.key)}` : item.title}
      testID={`portfolio-${item.uid}`}
    >
      <Image
        source={{ uri: item.thumbnail.medium }}
        style={s.workImage}
        accessibilityIgnoresInvertColors
      />
      <Text style={s.workTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {pill ? <Pill tone={pill.tone} label={t(pill.key)} /> : null}
    </Pressable>
  );
}

/** The user's clock (AC-8 "local time"), refreshed every minute; "—" for an unknown zone. */
export function LocalTime({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(() => formatClock(timezone));
  useEffect(() => {
    setNow(formatClock(timezone));
    const timer = setInterval(() => setNow(formatClock(timezone)), 60_000);
    return () => clearInterval(timer);
  }, [timezone]);
  return (
    <Text style={s.factValue} testID="local-time">
      {now ?? '—'}
    </Text>
  );
}

/**
 * Bottom sheet (§8.1 Dialog on phones): slides up over a scrim; the scrim, the close button and the system back
 * gesture close it; screen readers stay inside it. 3X look (§6.4): the surface gradient, a hairline top border, the
 * large shadow and a Secondary icon close.
 */
export function BottomSheet(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Modal visible={props.open} transparent animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView
        style={s.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={s.scrim}
          onPress={props.onClose}
          accessibilityRole="button"
          accessibilityLabel={props.closeLabel}
        />
        <View style={s.sheet} accessibilityViewIsModal testID={props.testID}>
          <Gradient token={theme.gradient.surface} fill style={s.sheetFill} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle} accessibilityRole="header">
              {props.title}
            </Text>
            <IconButton onPress={props.onClose} accessibilityLabel={props.closeLabel}>
              <Text style={s.sheetClose}>{'✕'}</Text>
            </IconButton>
          </View>
          {props.children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Outlined button for the profile actions (Share, Report). */
export function OutlineButton(props: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Button variant="secondary" label={props.label} onPress={props.onPress} testID={props.testID} />
  );
}

const s = StyleSheet.create({
  avatar: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: theme.radius.full },
  avatarInitial: { fontFamily: theme.text.title.fontFamily, color: theme.colors.text.brand },
  avatarDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: theme.size.onlineDot,
    height: theme.size.onlineDot,
    borderRadius: theme.radius.full,
    borderWidth: theme.borderWidth.strong,
    borderColor: theme.colors.bg.surface,
    backgroundColor: theme.colors.status.offline,
  },
  dotOnline: { backgroundColor: theme.colors.status.online },
  online: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
  onlineDot: {
    width: theme.space[2],
    height: theme.space[2],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.status.offline,
  },
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  secondary: { ...theme.text.body, color: theme.colors.text.secondary },
  body: { ...theme.text.body, color: theme.colors.text.primary },
  measure: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  link: { ...theme.text.label, color: theme.colors.text.link, marginTop: theme.space[1] },
  factValue: { ...theme.text.bodySm, color: theme.colors.text.primary },
  stars: { flexDirection: 'row', gap: theme.space['0.5'] },
  starFill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  rating: { gap: theme.space[2], flex: 1 },
  ratingTitle: { ...theme.text.title, color: theme.colors.text.primary },
  ratingHead: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space[2] },
  ratingAverage: { ...theme.text.h1, color: theme.colors.text.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  ratingRowLabel: {
    ...theme.text.bodySm,
    color: theme.colors.text.secondary,
    minWidth: theme.space[16],
  },
  ratingBar: {
    flex: 1,
    height: theme.space[2],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.subtle,
    overflow: 'hidden',
  },
  ratingBarFill: { height: '100%', backgroundColor: theme.colors.action.primary },
  ratingRowCount: {
    ...theme.text.bodySm,
    color: theme.colors.text.primary,
    minWidth: theme.space[6],
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  pill: {
    ...theme.text.badge,
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    paddingHorizontal: theme.space[2],
  },
  work: { width: '48%', gap: theme.space[1] },
  pressed: { backgroundColor: theme.colors.action.ghostPressed, borderRadius: theme.radius.md },
  workImage: {
    width: '100%',
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  workTitle: { ...theme.text.label, color: theme.colors.text.primary },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.bg.scrim },
  sheet: {
    backgroundColor: theme.colors.bg.surface,
    borderTopLeftRadius: theme.radius.dialog,
    borderTopRightRadius: theme.radius.dialog,
    borderWidth: theme.borderWidth.hairline,
    borderBottomWidth: 0,
    borderColor: theme.colors.border.default,
    padding: theme.space[4],
    paddingBottom: theme.space[8],
    gap: theme.space[4],
    ...theme.shadow.lg,
  },
  sheetFill: {
    borderTopLeftRadius: theme.radius.dialog - theme.borderWidth.hairline,
    borderTopRightRadius: theme.radius.dialog - theme.borderWidth.hairline,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...theme.text.h3, color: theme.colors.text.primary, flex: 1 },
  sheetClose: { ...theme.text.label, color: theme.colors.text.primary },
});
