// Public profile screen (spec 02 AC-8…AC-14, AC-18, AC-28/AC-42 owner view, EC-10; screens table "Profile screen:
// left card stacks on top, share opens the native share sheet"; design components.md §7.4), the same data, order
// and keys as the web `/profile/{username}`. Open to guests (no session gate): the API answers as the visitor.
// "Edit profile" for the owner since 4.1.23b. Not yet in the app (no screen to open, so no dead end, as 4.1.22):
// "Contact me" (chat, slice 08), "Request an offer" (slice 11; the API sends `canRequestOffer: false`). Since 4.2.15
// the gigs block (listGigs, 6 + "Load more") and skill chips opening `/hire/{slug}` (spec 03 AC-30). Since 4.1.24a a work opens the item viewer and "View my portfolio"
// opens the portfolio screen when there are more than the preview shows.
// 3X look (3X.17c, as the web 3X.13): the canvas, the card on the native `Card` with the 4 px brand strip and the
// avatar in a glowing brand-gradient ring, the availability note in the alert look, skills as tappable `Chip`s.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { EmptyState, Section, SecondaryButton, Skeleton } from '../../../components/dashboard';
import { Button, Notice } from '../../../components/form';
import {
  Avatar,
  AvatarRing,
  ExpandableText,
  LocalTime,
  OnlineStatus,
  OutlineButton,
  RatingSummary,
  VerifiedMark,
} from '../../../components/profile';
import { GigCardView } from '../../../components/catalog';
import { PortfolioGrid } from '../../../components/portfolio';
import { ReportUser } from '../../../components/report-user';
import { loadSession, mobileApi } from '../../../lib/api';
import { formatDate, formatDateOnly } from '../../../lib/format';
import { createT } from '../../../lib/i18n';
import {
  isGuestView,
  LANGUAGE_LEVEL,
  LINKED,
  PREVIEW_SIZE,
  SKILL_LEVEL,
  type PortfolioItemCard,
  type UserProfile,
} from '../../../lib/profile';
import { profileUrl } from '../../../lib/web-pages';
import { Alert, BrandStrip, Canvas, Card, Chip } from '../../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      profile: UserProfile;
      portfolio: PortfolioItemCard[];
      hasMore: boolean;
      gigs: GigCard[];
      gigsCursor: string | null;
    };

type GigCard = components['schemas']['GigCard'];
/** Spec 02 AC-8: 6 gigs at a time. */
const GIGS_PAGE = 6;

async function fetchProfile(username: string): Promise<State> {
  const [profile, portfolio, gigs] = await Promise.all([
    api.GET('/users/{username}', { params: { path: { username } } }),
    api.GET('/portfolio-items', { params: { query: { username, limit: PREVIEW_SIZE } } }),
    api
      .GET('/gigs', { params: { query: { sellerUsername: username, limit: GIGS_PAGE } } })
      .catch(() => undefined),
  ]);
  // Pending, banned, deleted and unknown users (AC-9, EC-4).
  if (profile.response.status === 404) return { kind: 'not-found' };
  if (!profile.data) return { kind: 'error' };
  return {
    kind: 'ready',
    profile: profile.data,
    portfolio: portfolio.data?.data ?? [],
    hasMore: !!portfolio.data?.nextCursor,
    gigs: (gigs?.data?.data ?? []) as GigCard[],
    gigsCursor: gigs?.data?.nextCursor ?? null,
  };
}

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    // Coming back (e.g. from Edit profile) re-reads quietly; only the first load shows the skeleton.
    setState((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    const hasSession = await loadSession();
    let next = await fetchProfile(username);
    // A stored session whose access token expired reads as a guest (the profile endpoints take an optional
    // user): one `getMe` lets the API client refresh it, then the profile is read again as the signed-in visitor.
    if (hasSession && next.kind === 'ready' && isGuestView(next.profile)) {
      const me = await api.GET('/me');
      if (me.data) next = await fetchProfile(username);
    }
    setState(next);
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Canvas>
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.content}>
          {state.kind === 'loading' ? (
            <Skeleton label={t('t_ui_loading')} tiles={2} rows={4} />
          ) : null}
          {state.kind === 'not-found' ? (
            <View style={s.gap} testID="profile-not-found">
              <Notice kind="info" text={t('t_user_not_found')} />
              <SecondaryButton
                label={t('t_go_back')}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            </View>
          ) : null}
          {state.kind === 'error' ? (
            <View style={s.gap}>
              <Notice kind="error" text={t('t_toast_something_went_wrong')} />
              <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
            </View>
          ) : null}
          {state.kind === 'ready' ? (
            <Profile
              profile={state.profile}
              portfolio={state.portfolio}
              hasMore={state.hasMore}
              gigs={state.gigs}
              gigsCursor={state.gigsCursor}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Canvas>
  );
}

function Profile({
  profile: p,
  portfolio,
  hasMore,
  gigs: firstGigs,
  gigsCursor,
}: {
  profile: UserProfile;
  portfolio: PortfolioItemCard[];
  hasMore: boolean;
  gigs: GigCard[];
  gigsCursor: string | null;
}) {
  const name = p.fullName || p.username;
  const [gigs, setGigs] = useState(firstGigs);
  const [cursor, setCursor] = useState(gigsCursor);
  const [gigsBusy, setGigsBusy] = useState(false);
  useEffect(() => {
    setGigs(firstGigs);
    setCursor(gigsCursor);
  }, [firstGigs, gigsCursor]);

  async function moreGigs() {
    if (!cursor) return;
    setGigsBusy(true);
    const res = await api
      .GET('/gigs', { params: { query: { sellerUsername: p.username, cursor, limit: GIGS_PAGE } } })
      .catch(() => undefined);
    setGigsBusy(false);
    if (!res?.data) return;
    const next = (res.data.data as GigCard[]).filter((g) => !gigs.some((x) => x.id === g.id));
    setGigs([...gigs, ...next]);
    setCursor(res.data.nextCursor);
  }

  const ratingLabels = (block: UserProfile['ratings']['asClient']) => ({
    empty: t('t_no_reviews_yet'),
    outOf5: t('t_out_of_5'),
    stars: t('t_ui_rating_label', {
      rating: ((block.averageTenths ?? 0) / 10).toFixed(1),
      count: block.count,
    }),
    basedOn: t('t_based_on_number_reviews', { number: block.count }),
    rows: [t('t_5_stars'), t('t_4_stars'), t('t_3_stars'), t('t_2_stars'), t('t_1_star')] as [
      string,
      string,
      string,
      string,
      string,
    ],
  });

  const linked = p.linkedAccounts
    ? LINKED.flatMap(([key, label]) => {
        const url = p.linkedAccounts?.[key];
        return url ? [{ label, url }] : [];
      })
    : [];

  const share = () => {
    const url = profileUrl(p.username);
    // iOS shares the link as a URL; Android only takes text.
    void Share.share(Platform.OS === 'ios' ? { url, title: name } : { message: url, title: name });
  };

  return (
    <>
      {/* Card (§7.4): stacks on top on phones. */}
      <Card style={s.card} testID="profile-card">
        <BrandStrip />
        <View style={s.identity}>
          <AvatarRing glow>
            <Avatar image={p.avatar} name={p.username} size="xl" online={p.isOnline} />
          </AvatarRing>
          <View style={s.identityText}>
            <View style={s.nameRow}>
              <Text style={s.name} accessibilityRole="header">
                {name}
              </Text>
              {p.isIdVerified ? <VerifiedMark label={t('t_account_verified')} /> : null}
            </View>
            <Text style={s.muted}>@{p.username}</Text>
            <OnlineStatus online={p.isOnline} label={t(p.isOnline ? 't_online' : 't_offline')} />
          </View>
        </View>
        {p.headline ? <Text style={s.headline}>{p.headline}</Text> : null}

        <View style={s.actions}>
          {p.isOwnProfile ? (
            <Button label={t('t_edit_profile')} onPress={() => router.push('/account/profile')} />
          ) : null}
          <OutlineButton label={t('t_share_profile')} onPress={share} testID="share-profile" />
          {!p.isOwnProfile ? (
            <ReportUser api={api} t={t} username={p.username} signedIn={p.canReport} />
          ) : null}
        </View>

        <View style={s.facts}>
          {p.timezone ? (
            <Fact label={t('t_local_time')}>
              <LocalTime timezone={p.timezone} />
            </Fact>
          ) : null}
          {p.lastDeliveryAt ? (
            <Fact label={t('t_last_delivery')}>
              <Text style={s.factValue}>{formatDate(p.lastDeliveryAt)}</Text>
            </Fact>
          ) : null}
          <Fact label={t('t_member_since')}>
            <Text style={s.factValue} testID="member-since">
              {formatDate(p.createdAt)}
            </Text>
          </Fact>
        </View>

        {p.isIdVerified || p.isEmailVerified ? (
          <CardList
            title={t('t_verifications')}
            testID="verifications"
            rows={[
              ...(p.isIdVerified ? [{ key: 'id', label: t('t_id'), value: t('t_verified') }] : []),
              ...(p.isEmailVerified
                ? [{ key: 'email', label: t('t_email_address'), value: t('t_verified') }]
                : []),
            ]}
            ok
          />
        ) : null}

        {p.languages.length > 0 ? (
          <CardList
            title={t('t_languages')}
            testID="languages"
            rows={p.languages.map((l) => ({
              key: l.id,
              label: l.name,
              value: t(LANGUAGE_LEVEL[l.level]),
            }))}
          />
        ) : null}

        {linked.length > 0 ? (
          <View style={s.cardSection} testID="linked-accounts">
            <Text style={s.cardTitle} accessibilityRole="header">
              {t('t_linked_accounts')}
            </Text>
            {linked.map((l) => (
              <View key={l.label} style={s.listRow}>
                <Text style={s.factValue}>{t(l.label)}</Text>
                <Pressable
                  onPress={() => void Linking.openURL(l.url)}
                  accessibilityRole="link"
                  accessibilityLabel={`${t(l.label)}: ${t('t_visit_profile')}`}
                  hitSlop={theme.space[2]}
                >
                  <Text style={s.link}>{t('t_visit_profile')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {p.availability ? (
        <Alert tone="warning" accessibilityRole="summary" testID="availability">
          <Text style={s.noticeTitle}>
            {t('t_this_user_is_not_available_right_now_msg', {
              date: formatDateOnly(p.availability.unavailableUntil),
            })}
          </Text>
          <Text style={s.noticeText}>{p.availability.message}</Text>
        </Alert>
      ) : null}

      <Section title={t('t_reviews')}>
        <View style={s.ratings}>
          <RatingSummary
            title={t('t_as_freelancer')}
            data={p.ratings.asFreelancer}
            labels={ratingLabels(p.ratings.asFreelancer)}
            testID="rating-freelancer"
          />
          <RatingSummary
            title={t('t_as_client')}
            data={p.ratings.asClient}
            labels={ratingLabels(p.ratings.asClient)}
            testID="rating-client"
          />
        </View>
      </Section>

      {p.about ? (
        <Section title={t('t_about_me')}>
          <ExpandableText text={p.about} more={t('t_more')} less={t('t_less')} />
        </Section>
      ) : null}

      {/* Active gigs, newest first, 6 at a time (AC-8); without gigs only the owner sees the empty block (EC-10). */}
      {gigs.length > 0 ? (
        <Section title={t('t_gigs')} testID="profile-gigs">
          <View style={s.gap}>
            {gigs.map((g) => (
              <GigCardView key={g.id} gig={g} t={t} />
            ))}
            {cursor ? (
              <Button label={t('t_load_more')} busy={gigsBusy} onPress={() => void moreGigs()} />
            ) : null}
          </View>
        </Section>
      ) : p.isOwnProfile ? (
        <Section title={t('t_gigs')}>
          <EmptyState title={t('t_profile_no_gigs_yet')} />
        </Section>
      ) : null}

      {portfolio.length > 0 || p.isOwnProfile ? (
        <Section title={t('t_portfolio')} testID="portfolio-preview">
          {portfolio.length === 0 ? (
            <EmptyState
              title={t('t_no_portfolio_yet')}
              action={
                <Button
                  label={t('t_create_project')}
                  onPress={() => router.push('/seller/portfolio/create')}
                />
              }
            />
          ) : (
            <View style={s.gap}>
              <PortfolioGrid username={p.username} items={portfolio} t={t} />
              {hasMore ? (
                <OutlineButton
                  label={t('t_view_my_porfolio')}
                  onPress={() =>
                    router.push({
                      pathname: '/profile/[username]/portfolio',
                      params: { username: p.username },
                    })
                  }
                  testID="view-portfolio"
                />
              ) : null}
            </View>
          )}
        </Section>
      ) : null}

      {p.skills.length > 0 ? (
        <Section title={t('t_skills')}>
          <View style={s.chips}>
            {p.skills.map((skill) => (
              <Chip
                key={skill.id}
                label={skill.name}
                accessibilityLabel={`${skill.name}, ${t(SKILL_LEVEL[skill.experience])}`}
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/hire/[keyword]', params: { keyword: skill.slug } })
                }
              />
            ))}
          </View>
        </Section>
      ) : null}
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.listRow}>
      <Text style={s.muted}>{label}</Text>
      {children}
    </View>
  );
}

function CardList(props: {
  title: string;
  testID: string;
  rows: { key: string; label: string; value: string }[];
  ok?: boolean;
}) {
  return (
    <View style={s.cardSection} testID={props.testID}>
      <Text style={s.cardTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {props.rows.map((r) => (
        <View key={r.key} style={s.listRow} accessible>
          <Text style={s.factValue}>{r.label}</Text>
          <Text style={props.ok ? s.ok : s.muted}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[4] },
  gap: { gap: theme.space[3] },
  // The top padding clears the 4 px brand strip.
  card: { padding: theme.space[4], paddingTop: theme.space[5], gap: theme.space[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.space[4] },
  identityText: { flex: 1, gap: theme.space[1] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1], flexWrap: 'wrap' },
  name: { ...theme.text.h2, color: theme.colors.text.primary, flexShrink: 1 },
  headline: { ...theme.text.body, color: theme.colors.text.secondary },
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  factValue: { ...theme.text.bodySm, color: theme.colors.text.primary },
  ok: { ...theme.text.bodySm, color: theme.colors.text.success },
  link: { ...theme.text.label, color: theme.colors.text.link, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  facts: {
    gap: theme.space[2],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
    paddingTop: theme.space[3],
  },
  cardSection: {
    gap: theme.space[2],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
    paddingTop: theme.space[3],
  },
  cardTitle: { ...theme.text.title, color: theme.colors.text.primary },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.space[6],
  },
  noticeTitle: { ...theme.text.label, color: theme.colors.feedback.warningText },
  noticeText: { ...theme.text.bodySm, color: theme.colors.feedback.warningText },
  ratings: { gap: theme.space[6] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
});
