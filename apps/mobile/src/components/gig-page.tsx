// Gig screen pieces (spec 04 AC-26…AC-30; screen 02 "Native app"), the same data, rules and keys as the web
// `/service/{slug}` (4.3.11a): notices, title + Featured pill, seller row, stats and the purchase box (starting
// price, revisions, upgrade checkboxes; the owner's "Edit gig") (4.3.14a); the sections FAQ / Reviews / Documents
// and "You may also like" (4.3.11c, 4.3.14b). "Add to cart" (slice 5) and "Contact seller" (slice 7) come with their
// slices, and with them the sticky price bar.
import type { TFunction } from 'i18next';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { splitLegacyLinks } from '@mytask/i18n';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { ApiClient } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { DELIVERY_KEYS, type DeliveryTime, type GigCard } from '../lib/catalog';
import { formatBytes, formatDate, formatMoney } from '../lib/format';
import { openWebPage } from '../lib/web-pages';
import { GigCardView, openProfile } from './catalog';
import { Section } from './dashboard';
import { Avatar, OnlineStatus, RatingStars, VerifiedMark } from './profile';
import { Alert, Button, Card, Checkbox, enterAt } from '../ui';

export type Gig = components['schemas']['Gig'];

/** The uid is the text after the last `-` of the slug (contract `lookupGig`; a slug without `-` is all uid). */
export const uidOfSlug = (slug: string) => slug.slice(slug.lastIndexOf('-') + 1);

/** "3 days" for a delivery time; 0 (upgrades only) has no label. */
const deliveryKey = (days: number) => DELIVERY_KEYS[days as DeliveryTime] as string | undefined;

const average = (tenths: number | null) => (tenths === null ? null : (tenths / 10).toFixed(1));

function Note(props: {
  tone: 'info' | 'warning' | 'danger';
  title?: string;
  text: string;
  testID: string;
}) {
  return (
    <Alert tone={props.tone} testID={props.testID}>
      {props.title ? <Text style={s.noteTitle}>{props.title}</Text> : null}
      <Text style={s.noteText}>{props.text}</Text>
    </Alert>
  );
}

/** AC-27…AC-29: the owner's pending / rejected gig, the seller away or restricted, the Georgian fallback. */
export function GigNotices({ gig, t, locale }: { gig: Gig; t: TFunction; locale: string }) {
  // AC-29: the seller is away (with the date) or cannot take orders (restricted); the legacy text carries markup.
  const awayText = gig.seller.unavailableUntil
    ? splitLegacyLinks(
        t('t_seller_wont_be_able_to_receive_orders_date', {
          date: formatDate(gig.seller.unavailableUntil),
        }),
      )
        .map((p) => p.text)
        .join('')
    : t('t_seller_not_receiving_orders');
  return (
    <>
      {gig.status === 'pending' ? (
        <Note tone="warning" text={t('t_this_gig_not_activated_yet')} testID="pending-note" />
      ) : null}
      {gig.status === 'rejected' ? (
        <Note
          tone="danger"
          title={t('t_rejected')}
          text={t('t_gig_rejected_not_public')}
          testID="rejected-note"
        />
      ) : null}
      {!gig.seller.isAcceptingOrders ? (
        <Note tone="warning" title={t('t_attention_needed')} text={awayText} testID="away-note" />
      ) : null}
      {gig.contentLocale !== locale ? (
        <Note tone="info" text={t('t_content_shown_in_georgian')} testID="georgian-note" />
      ) : null}
    </>
  );
}

/** Title (the screen's one header) with the Featured pill (spec 03 AC-18: text, never colour only). */
export function GigTitle({ gig, t, lang }: { gig: Gig; t: TFunction; lang?: string }) {
  return (
    <View style={s.titleBlock}>
      <Text style={s.title} accessibilityRole="header" accessibilityLanguage={lang}>
        {gig.title}
      </Text>
      {gig.isFeatured ? (
        <Text
          style={s.featured}
          accessibilityLabel={`${t('t_featured')}. ${t('t_featured_badge_hint')}`}
          testID="featured-pill"
        >
          {'♛ '}
          {t('t_featured')}
        </Text>
      ) : null}
    </View>
  );
}

/** Seller row (→ profile), verified mark, online status and the seller's rating (AC-26). */
export function GigSeller({ gig, t }: { gig: Gig; t: TFunction }) {
  const seller = gig.seller.user;
  const sellerAverage = average(gig.seller.rating.averageTenths);
  return (
    <View style={s.seller} testID="gig-seller">
      <Pressable
        style={s.sellerLink}
        onPress={() => openProfile(seller.username)}
        accessibilityRole="link"
        hitSlop={theme.space[2]}
      >
        <Avatar image={seller.avatar} name={seller.username} size="md" online={seller.isOnline} />
        <Text style={s.sellerName}>{seller.username}</Text>
      </Pressable>
      {seller.isIdVerified ? <VerifiedMark label={t('t_account_verified')} /> : null}
      <OnlineStatus
        online={seller.isOnline}
        label={t(seller.isOnline ? 't_online' : 't_offline')}
      />
      {sellerAverage !== null ? (
        <View style={s.rating}>
          <RatingStars
            tenths={gig.seller.rating.averageTenths!}
            label={t('t_ui_rating_label', {
              rating: sellerAverage,
              count: gig.seller.rating.count,
            })}
          />
          <Text style={s.ratingText}>
            <Text style={s.strong}>{sellerAverage}</Text> ({gig.seller.rating.count})
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Orders in queue, delivery time and the gig's rating, or N/A (AC-26, R-G8). */
export function GigStats({ gig, t }: { gig: Gig; t: TFunction }) {
  const gigAverage = average(gig.rating.averageTenths);
  const delivery = deliveryKey(gig.deliveryDays);
  return (
    <View style={s.stats} testID="gig-stats">
      <Text style={s.stat}>
        {t(gig.ordersInQueueCount <= 1 ? 't_number_order_in_queue' : 't_number_orders_in_queue', {
          number: gig.ordersInQueueCount,
        })}
      </Text>
      {gig.deliveryDays > 0 && delivery ? (
        <Text style={s.stat}>{t('t_expected_delivery_date_time', { date: t(delivery) })}</Text>
      ) : null}
      <View style={s.rating}>
        <RatingStars
          tenths={gig.rating.averageTenths ?? 0}
          label={t('t_ui_rating_label', { rating: gigAverage ?? '0.0', count: gig.rating.count })}
        />
        <Text style={s.ratingText}>
          <Text style={s.strong}>{gigAverage ?? t('t_n_a')}</Text> (
          {t('t_number_reviews', { number: gig.rating.count })})
        </Text>
      </View>
    </View>
  );
}

/**
 * Purchase box (AC-26, P-46 no quantity): "Starting at" price, revisions (none, or "not specified" for a migrated
 * gig, Q-142), the upgrades as checkboxes read as title + price + delivery effect. The ticked ones stay here for
 * "Add to cart" (slice 5). The owner gets "Edit gig" (AC-30) → the app's editor (4.3.15d).
 */
export function PurchaseBox({ gig, t, lang }: { gig: Gig; t: TFunction; lang?: string }) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const revisions =
    gig.revisionsAllowed === null
      ? t('t_revisions_not_specified')
      : gig.revisionsAllowed === 0
        ? t('t_no_revisions')
        : t('t_revisions_included', { count: gig.revisionsAllowed });

  return (
    <Card style={s.box} testID="purchase-box">
      <View style={s.price} accessible>
        <Text style={s.priceLabel}>{t('t_starting_at')}</Text>
        <Text style={s.priceValue}>{formatMoney(gig.price)}</Text>
      </View>
      <Text style={s.revisions} testID="gig-revisions">
        {revisions}
      </Text>
      {gig.upgrades.length > 0 ? (
        <View style={s.upgrades} testID="gig-upgrades">
          <Text style={s.boxTitle} accessibilityRole="header">
            {t('t_upgrades')}
          </Text>
          {gig.upgrades.map((u) => {
            const extra = deliveryKey(u.extraDays);
            const delivery =
              u.extraDays > 0 && extra
                ? t('t_delivery_time_will_be_increased_by_extra', { time: t(extra) })
                : t('t_no_changes_delivery_time');
            const price = `+${formatMoney(u.price)}`;
            const on = ticked.has(u.id);
            return (
              <Pressable
                key={u.id}
                style={s.upgrade}
                onPress={() => toggle(u.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${u.title}, ${price}, ${delivery}`}
                accessibilityLanguage={lang}
                testID={`upgrade-${u.id}`}
              >
                <Checkbox checked={on} />
                <View style={s.upgradeText}>
                  <View style={s.upgradeHead}>
                    <Text style={s.upgradeTitle}>{u.title}</Text>
                    <Text style={s.upgradePrice}>{price}</Text>
                  </View>
                  <Text style={s.muted}>{delivery}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {gig.viewer?.isOwner ? (
        <Button
          variant="secondary"
          label={t('t_edit_gig')}
          onPress={() =>
            router.push({ pathname: '/seller/gigs/[uid]/edit', params: { uid: gig.uid } })
          }
          testID="edit-gig"
        />
      ) : null}
    </Card>
  );
}

/** Phosphor `CaretDown` (as the web accordion). */
const CARET =
  'm213.66 101.66-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z';

/** FAQ (AC-26, only with FAQs): an accordion, several may be open; answers keep their line breaks. */
export function GigFaq({ gig, t, lang }: { gig: Gig; t: TFunction; lang?: string }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  if (gig.faqs.length === 0) return null;
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <Section title={t('t_faq')} testID="gig-faq">
      {gig.faqs.map((f) => {
        const expanded = open.has(f.id);
        return (
          <View key={f.id} style={s.faq}>
            <Pressable
              style={s.faqHead}
              onPress={() => toggle(f.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLanguage={lang}
            >
              <Text style={s.faqQuestion}>{f.question}</Text>
              <View style={expanded ? s.caretOpen : null}>
                <Svg width={theme.size.icon.sm} height={theme.size.icon.sm} viewBox="0 0 256 256">
                  <Path d={CARET} fill={theme.colors.text.secondary} />
                </Svg>
              </View>
            </Pressable>
            {expanded ? (
              <Text style={s.faqAnswer} accessibilityLanguage={lang}>
                {f.answer}
              </Text>
            ) : null}
          </View>
        );
      })}
    </Section>
  );
}

/** Reviews (always shown): stars, average and the count, or "No reviews yet"; the list waits for slice 7. */
export function GigReviews({ gig, t }: { gig: Gig; t: TFunction }) {
  const gigAverage = average(gig.rating.averageTenths);
  return (
    <Section title={`${t('t_reviews')} (${gig.rating.count})`} testID="gig-reviews">
      {gigAverage === null ? (
        <Text style={s.muted}>{t('t_no_reviews_yet')}</Text>
      ) : (
        <View style={s.rating}>
          <RatingStars
            tenths={gig.rating.averageTenths!}
            label={t('t_ui_rating_label', { rating: gigAverage, count: gig.rating.count })}
          />
          <Text style={s.ratingText}>
            <Text style={s.strong}>{gigAverage}</Text>{' '}
            {t('t_based_on_number_reviews', { number: gig.rating.count })}
          </Text>
        </View>
      )}
    </Section>
  );
}

/** Documents (only with documents, R-G11 public PDFs): name, size and "Download" (opens in the browser). */
export function GigDocuments({ gig, t }: { gig: Gig; t: TFunction }) {
  if (gig.documents.length === 0) return null;
  return (
    <Section title={t('t_documents')} testID="gig-documents">
      {gig.documents.map((d) => (
        <View key={d.fileId} style={s.document}>
          <View style={s.documentText}>
            <Text style={s.documentName}>{d.fileName}</Text>
            <Text style={s.muted}>{formatBytes(d.sizeBytes)}</Text>
          </View>
          <Button
            variant="secondary"
            label={t('t_download')}
            onPress={() => openWebPage(d.url)}
            accessibilityLabel={`${t('t_download')}: ${d.fileName}`}
          />
        </View>
      ))}
    </Section>
  );
}

/** "You may also like" (AC-32, `listRelatedGigs`): a row of gig cards; hidden when empty or on failure (EC-13). */
export function RelatedGigs({ gig, t, api }: { gig: Gig; t: TFunction; api: ApiClient }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.8);
  const [gigs, setGigs] = useState<GigCard[]>([]);
  useEffect(() => {
    let live = true;
    void api
      .GET('/gigs/{gigId}/related', { params: { path: { gigId: gig.id } } })
      .then((res) => live && setGigs(res.data?.gigs ?? []))
      .catch(() => live && setGigs([]));
    return () => {
      live = false;
    };
  }, [api, gig.id]);
  if (gigs.length === 0) return null;
  return (
    <View style={s.related} testID="gig-related">
      <Text style={s.relatedTitle} accessibilityRole="header">
        {t('t_you_may_also_like')}
      </Text>
      <FlatList
        horizontal
        data={gigs}
        keyExtractor={(g) => g.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={enterAt(index)}>
            <GigCardView gig={item} t={t} api={api} width={cardWidth} />
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ width: theme.space[3] }} />}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + theme.space[3]}
        decelerationRate="fast"
      />
    </View>
  );
}

const s = StyleSheet.create({
  noteTitle: { ...theme.text.title, color: theme.colors.text.primary },
  noteText: { ...theme.text.bodySm, color: theme.colors.text.primary },
  titleBlock: { gap: theme.space[2], alignItems: 'flex-start' },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  featured: {
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space['0.5'],
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.badge.featuredBg,
    color: theme.colors.badge.featuredText,
    ...theme.text.badge,
  },
  seller: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2] },
  sellerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.size.touchTarget.min,
  },
  sellerName: { ...theme.text.title, color: theme.colors.text.primary },
  rating: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
  ratingText: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  strong: { fontFamily: theme.fonts.family['700'], color: theme.colors.text.primary },
  stats: { gap: theme.space[1] },
  stat: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  box: { padding: theme.space[4], gap: theme.space[3] },
  price: { gap: theme.space['0.5'] },
  priceLabel: { ...theme.text.bodySm, color: theme.colors.text.muted },
  priceValue: { ...theme.text.priceLg, color: theme.colors.text.primary },
  revisions: { ...theme.text.body, color: theme.colors.text.primary },
  upgrades: {
    gap: theme.space[1],
    paddingTop: theme.space[3],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
  },
  boxTitle: { ...theme.text.title, color: theme.colors.text.primary },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.space[3],
    minHeight: theme.size.touchTarget.min,
    paddingVertical: theme.space[2],
  },
  upgradeText: { flex: 1, gap: theme.space['0.5'] },
  upgradeHead: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.space[2] },
  upgradeTitle: { ...theme.text.body, color: theme.colors.text.primary, flex: 1 },
  upgradePrice: { ...theme.text.title, color: theme.colors.text.primary },
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  faq: {
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    minHeight: theme.size.touchTarget.min,
    paddingVertical: theme.space[2],
  },
  faqQuestion: { ...theme.text.title, color: theme.colors.text.primary, flex: 1 },
  caretOpen: { transform: [{ rotate: '180deg' }] },
  faqAnswer: {
    ...theme.text.body,
    color: theme.colors.text.secondary,
    paddingBottom: theme.space[3],
  },
  document: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  documentText: { flex: 1, gap: theme.space['0.5'] },
  documentName: { ...theme.text.body, color: theme.colors.text.primary },
  related: { gap: theme.space[3] },
  relatedTitle: { ...theme.text.h3, color: theme.colors.text.primary },
});
