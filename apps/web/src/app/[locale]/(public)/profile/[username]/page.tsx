// Public profile `/profile/{username}` (spec 02 AC-8…AC-13, EC-10; design components.md §7.4, audit §3.6; legacy
// `Main/Profile/ProfileComponent.php`, `livewire/main/profile/profile.blade.php`). Rendered on the server as
// the visitor of the request: real 404 for hidden users (AC-9), `noindex, follow` for empty profiles
// (spec 17 AC-41). Left card + main column as on the live site; one h1 (audit §3.6).
// "Report user" (AC-14) since 4.1.20c. Not yet: the gigs list (slice 3, D2), "Request an offer" (slice 11: the API
// sends `canRequestOffer: false` until then).
import type { Metadata } from 'next';
import type { components } from '@mytask/types';
import Link from 'next/link';
import {
  Avatar,
  ChipLink,
  EmptyState,
  ExpandableText,
  OnlineStatus,
  RatingSummary,
  type RatingBlockData,
} from '@mytask/ui/web';
import {
  LocalTime,
  PortfolioCardView,
  ProfileGigs,
  ReportButton,
  ShareButton,
} from '../../../../../components/profile/client';
import {
  isGuestView,
  loadGigs,
  loadPortfolio,
  loadProfile,
  PREVIEW_SIZE,
} from '../../../../../components/profile/data';
import { LANGUAGE_LEVEL, LINKED, SKILL_LEVEL } from '../../../../../components/profile/levels';
import { contactHref, VerifiedMark } from '../../../../../components/profile/parts';
import { formatDate, formatDateOnly } from '../../../../../lib/format';
import { href } from '../../../../../lib/href';
import { getT, toLocale } from '../../../../../lib/i18n';
import { pageTitle } from '../../../../../lib/page-title';

type Params = { params: Promise<{ locale: string; username: string }> };
type GigCardItem = components['schemas']['GigCard'];

/** Spec 02 AC-8: the profile lists 6 gigs at a time. */
const GIGS_PAGE_SIZE = 6;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw, username } = await params;
  const locale = toLocale(raw);
  const { profile } = await loadProfile(locale, username);
  return {
    // Legacy title: "<username> <separator> <site>".
    title: await pageTitle(locale, profile.username),
    ...(profile.isIndexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function ProfilePage({ params }: Params) {
  const { locale: raw, username } = await params;
  const locale = toLocale(raw);
  const [t, { profile: p }, portfolio, gigs] = await Promise.all([
    getT(locale),
    loadProfile(locale, username),
    loadPortfolio(locale, username, PREVIEW_SIZE),
    loadGigs(locale, username, GIGS_PAGE_SIZE),
  ]);
  const guest = isGuestView(p);
  const name = p.fullName || p.username;

  const ratingLabels = (block: RatingBlockData) => ({
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
    ? LINKED.filter(([key]) => p.linkedAccounts?.[key]).map(
        ([key, label]) => [label, p.linkedAccounts?.[key] as string] as const,
      )
    : [];

  return (
    <main className="mt-profile">
      <div className="mt-profile-layout">
        <aside className="mt-profile-card" data-testid="profile-card">
          <Avatar image={p.avatar} name={p.username} size="xl" online={p.isOnline} />
          <div className="mt-profile-identity">
            <h1 className="mt-profile-name">
              {name}
              {p.isIdVerified && <VerifiedMark label={t('t_account_verified')} />}
            </h1>
            <p className="mt-profile-muted">@{p.username}</p>
            <OnlineStatus online={p.isOnline} label={t(p.isOnline ? 't_online' : 't_offline')} />
          </div>
          {p.headline && <p className="mt-profile-headline">{p.headline}</p>}

          <div className="mt-profile-actions">
            {p.isOwnProfile ? (
              <a className="mt-button mt-button-primary" href={href(locale, '/account/profile')}>
                {t('t_edit_profile')}
              </a>
            ) : (
              p.canContact && (
                <a
                  className="mt-button mt-button-primary"
                  href={contactHref(locale, p.username, guest)}
                >
                  {t('t_contact_me')}
                </a>
              )
            )}
            <ShareButton
              label={t('t_share_profile')}
              title={name}
              copiedText={t('t_profile_link_copied_to_ur_clipboard')}
            />
            {!p.isOwnProfile && <ReportButton username={p.username} signedIn={p.canReport} />}
          </div>

          <dl className="mt-profile-facts">
            {p.timezone && (
              <div>
                <dt>{t('t_local_time')}</dt>
                <dd>
                  <LocalTime timezone={p.timezone} />
                </dd>
              </div>
            )}
            {p.lastDeliveryAt && (
              <div>
                <dt>{t('t_last_delivery')}</dt>
                <dd>{formatDate(p.lastDeliveryAt)}</dd>
              </div>
            )}
            <div>
              <dt>{t('t_member_since')}</dt>
              <dd data-testid="member-since">{formatDate(p.createdAt)}</dd>
            </div>
          </dl>

          {(p.isIdVerified || p.isEmailVerified) && (
            <section className="mt-profile-card-section" data-testid="verifications">
              <h2 className="mt-profile-card-title">{t('t_verifications')}</h2>
              <ul className="mt-profile-list">
                {p.isIdVerified && (
                  <li>
                    <span>{t('t_id')}</span>
                    <span className="mt-profile-ok">{t('t_verified')}</span>
                  </li>
                )}
                {p.isEmailVerified && (
                  <li>
                    <span>{t('t_email_address')}</span>
                    <span className="mt-profile-ok">{t('t_verified')}</span>
                  </li>
                )}
              </ul>
            </section>
          )}

          {p.languages.length > 0 && (
            <section className="mt-profile-card-section" data-testid="languages">
              <h2 className="mt-profile-card-title">{t('t_languages')}</h2>
              <ul className="mt-profile-list">
                {p.languages.map((l) => (
                  <li key={l.id}>
                    <span>{l.name}</span>
                    <span className="mt-profile-muted">{t(LANGUAGE_LEVEL[l.level])}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {linked.length > 0 && (
            <section className="mt-profile-card-section" data-testid="linked-accounts">
              <h2 className="mt-profile-card-title">{t('t_linked_accounts')}</h2>
              <ul className="mt-profile-list">
                {linked.map(([label, url]) => (
                  <li key={label}>
                    <span>{t(label)}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer nofollow ugc">
                      {t('t_visit_profile')}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <div className="mt-profile-main">
          {p.availability && (
            <div className="mt-profile-notice" role="note" data-testid="availability">
              <p className="mt-profile-notice-title">
                {t('t_this_user_is_not_available_right_now_msg', {
                  date: formatDateOnly(p.availability.unavailableUntil),
                })}
              </p>
              <p className="mt-profile-notice-text">{p.availability.message}</p>
            </div>
          )}

          <section className="mt-profile-section" aria-labelledby="profile-reviews">
            <h2 id="profile-reviews" className="mt-profile-section-title">
              {t('t_reviews')}
            </h2>
            <div className="mt-profile-ratings">
              <RatingSummary
                title={t('t_as_freelancer')}
                data={p.ratings.asFreelancer}
                labels={ratingLabels(p.ratings.asFreelancer)}
                testId="rating-freelancer"
              />
              <RatingSummary
                title={t('t_as_client')}
                data={p.ratings.asClient}
                labels={ratingLabels(p.ratings.asClient)}
                testId="rating-client"
              />
            </div>
          </section>

          {p.about && (
            <section className="mt-profile-section" aria-labelledby="profile-about">
              <h2 id="profile-about" className="mt-profile-section-title">
                {t('t_about_me')}
              </h2>
              <ExpandableText text={p.about} more={t('t_more')} less={t('t_less')} />
            </section>
          )}

          {/* Active gigs, newest first, 6 at a time (AC-8); without gigs only the owner sees the empty block with
              "Create a new gig" (EC-10), visitors see none. */}
          {gigs && gigs.data.length > 0 ? (
            <section
              className="mt-profile-section"
              aria-labelledby="profile-gigs"
              data-testid="profile-gigs"
            >
              <h2 id="profile-gigs" className="mt-profile-section-title">
                {t('t_gigs')}
              </h2>
              <ProfileGigs
                username={p.username}
                initial={gigs.data as GigCardItem[]}
                nextCursor={gigs.nextCursor}
                pageSize={GIGS_PAGE_SIZE}
              />
            </section>
          ) : (
            p.isOwnProfile && (
              <section className="mt-profile-section" aria-labelledby="profile-gigs">
                <h2 id="profile-gigs" className="mt-profile-section-title">
                  {t('t_gigs')}
                </h2>
                <EmptyState
                  title={t('t_profile_no_gigs_yet')}
                  action={
                    <a className="mt-button mt-button-primary" href={href(locale, '/create')}>
                      {t('t_create_a_new_gig')}
                    </a>
                  }
                />
              </section>
            )
          )}

          {(portfolio.data.length > 0 || p.isOwnProfile) && (
            <section
              className="mt-profile-section"
              aria-labelledby="profile-portfolio"
              data-testid="portfolio-preview"
            >
              <h2 id="profile-portfolio" className="mt-profile-section-title">
                {t('t_portfolio')}
              </h2>
              {portfolio.data.length === 0 ? (
                <EmptyState
                  title={t('t_no_portfolio_yet')}
                  action={
                    <a
                      className="mt-button mt-button-primary"
                      href={href(locale, '/seller/portfolio/create')}
                    >
                      {t('t_create_project')}
                    </a>
                  }
                />
              ) : (
                <>
                  <ul className="mt-portfolio-grid">
                    {portfolio.data.map((item) => (
                      <PortfolioCardView key={item.id} item={item} username={p.username} />
                    ))}
                  </ul>
                  {portfolio.nextCursor && (
                    <div className="mt-profile-more">
                      <Link
                        className="mt-button"
                        href={href(locale, `/profile/${p.username}/portfolio`)}
                      >
                        {t('t_view_my_porfolio')}
                      </Link>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {p.skills.length > 0 && (
            <section className="mt-profile-section" aria-labelledby="profile-skills">
              <h2 id="profile-skills" className="mt-profile-section-title">
                {t('t_skills')}
              </h2>
              <ul className="mt-profile-chips">
                {p.skills.map((s) => (
                  <li key={s.id}>
                    <ChipLink
                      href={href(locale, `/hire/${encodeURIComponent(s.slug)}`)}
                      title={t(SKILL_LEVEL[s.experience])}
                    >
                      {s.name}
                      <span className="mt-visually-hidden">, {t(SKILL_LEVEL[s.experience])}</span>
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
