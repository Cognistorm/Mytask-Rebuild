// Portfolio pieces of the app (spec 02 AC-28, AC-42; screens table "Portfolio grid → item viewer (swipe gallery)"),
// the same data and order as the web `components/profile/client.tsx` + `parts.tsx`: the 2-column grid, the
// owner box and the gallery pager. Texts come from i18n. 3X look (3X.17c, as the web 3X.13): the owner box on the
// native `Card` with the avatar ring, status notes in the alert look, gallery images framed like cards.
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import type { PortfolioItemCard, UserSummary } from '../lib/profile';
import { Avatar, AvatarRing, OutlineButton, Pill, PortfolioCard, VerifiedMark } from './profile';
import { Alert, Card } from '../ui';
import { inSentence } from '@mytask/i18n';

type ImageVariants = components['schemas']['ImageVariants'];
type T = (key: string, vars?: Record<string, string | number>) => string;

/** Opens a work in the item viewer. */
export function openPortfolioItem(username: string, slug: string) {
  router.push({
    pathname: '/profile/[username]/portfolio/[slug]',
    params: { username, slug },
  });
}

/** The 2-column grid of works (profile preview and the portfolio screen). */
export function PortfolioGrid(props: { username: string; items: PortfolioItemCard[]; t: T }) {
  return (
    <View style={s.grid} testID="portfolio-grid">
      {props.items.map((item) => (
        <PortfolioCard
          key={item.id}
          item={item}
          t={props.t}
          onPress={() => openPortfolioItem(props.username, item.slug)}
        />
      ))}
    </View>
  );
}

/** The owner's note above a work that is not public (AC-28 pending, AC-42 rejected with the reason). */
export function StatusNote(props: { status: 'pending' | 'rejected'; reason: string | null; t: T }) {
  const { t } = props;
  return (
    <Alert
      tone={props.status === 'pending' ? 'warning' : 'danger'}
      style={s.note}
      accessibilityRole="summary"
      testID={`${props.status}-note`}
    >
      {props.status === 'pending' ? (
        <>
          <Pill tone="warning" label={t('t_pending')} />
          <Text style={s.noteText}>{t('t_portfolio_pending_review')}</Text>
        </>
      ) : (
        <>
          <Pill tone="danger" label={t('t_portfolio_status_rejected')} />
          <Text style={s.noteText}>
            {t('t_portfolio_rejected_reason', { reason: inSentence(props.reason) })}
          </Text>
        </>
      )}
    </Alert>
  );
}

/**
 * Owner box (web `OwnerBox`): avatar, username, verified mark, headline and "View profile". "Contact me" waits for
 * the chat screen (slice 08), as on the profile.
 */
export function OwnerBox(props: { user: UserSummary; headline?: string | null; t: T }) {
  const { user, t } = props;
  return (
    <Card style={s.owner} testID="owner-box">
      <View style={s.ownerRow}>
        <AvatarRing>
          <Avatar image={user.avatar} name={user.username} size="lg" online={user.isOnline} />
        </AvatarRing>
        <View style={s.ownerText}>
          <View style={s.ownerNameRow}>
            <Text style={s.ownerName}>{user.username}</Text>
            {user.isIdVerified ? <VerifiedMark label={t('t_account_verified')} /> : null}
          </View>
          {props.headline ? <Text style={s.muted}>{props.headline}</Text> : null}
        </View>
      </View>
      <OutlineButton
        label={t('t_view_profile')}
        onPress={() =>
          router.push({ pathname: '/profile/[username]', params: { username: user.username } })
        }
        testID="view-profile"
      />
    </Card>
  );
}

/** Swipe gallery: one image per page with "n / total"; each image is labelled "title (n/total)" as on the web. */
export function Gallery(props: { images: ImageVariants[]; title: string }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const total = props.images.length;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={s.gallery} testID="gallery">
      <View style={s.galleryFrame}>
        <View style={s.galleryClip} onLayout={onLayout}>
          {width > 0 ? (
            <FlatList
              data={props.images}
              keyExtractor={(image) => image.fileId}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScroll}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              renderItem={({ item: image, index: i }) => (
                <Image
                  source={{ uri: image.large }}
                  style={[s.galleryImage, { width }]}
                  resizeMode="contain"
                  accessible
                  accessibilityLabel={`${props.title} (${i + 1}/${total})`}
                  accessibilityIgnoresInvertColors
                />
              )}
            />
          ) : (
            <View style={s.galleryImage} />
          )}
        </View>
      </View>
      {total > 1 ? (
        <Text style={s.counter} importantForAccessibility="no" accessibilityElementsHidden>
          {`${Math.min(index, total - 1) + 1} / ${total}`}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.space[4],
  },
  note: { gap: theme.space[2] },
  noteText: { ...theme.text.bodySm, color: theme.colors.text.primary },
  owner: { padding: theme.space[4], gap: theme.space[3] },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  ownerText: { flex: 1, gap: theme.space[1] },
  ownerNameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
  ownerName: { ...theme.text.title, color: theme.colors.text.primary, flexShrink: 1 },
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  gallery: { gap: theme.space[2] },
  // Framed like a card (as the web 3X.13): border, card radius, small shadow.
  galleryFrame: {
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.bg.skeleton,
    ...theme.shadow.sm,
  },
  galleryClip: {
    overflow: 'hidden',
    borderRadius: theme.radius.card - theme.borderWidth.hairline,
  },
  galleryImage: {
    width: '100%',
    aspectRatio: theme.size.layout.cardImageRatio,
    backgroundColor: theme.colors.bg.skeleton,
  },
  counter: { ...theme.text.bodySm, color: theme.colors.text.muted, textAlign: 'center' },
});
