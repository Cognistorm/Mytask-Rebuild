// Gig page `/service/{slug}` (spec 04 AC-26…AC-30, AC-33; spec 17 AC-3, AC-4; screen 02; legacy
// `Main/Service/ServiceComponent.php`, `livewire/main/service/service.blade.php`). Rendered on the server as the
// visitor of the request: real 404 for gigs others may not see (AC-28), 301 from an old or differently written slug
// to the current one (AC-33). ROADMAP 4.3.11a = the frame: notices, breadcrumb, title, seller row, stats, cover
// image, purchase box and the description. Still to come: the gallery (4.3.11b), tabs + "You may also like"
// (4.3.11c), Share / Report / favourite (4.3.11d); "Add to cart" and "Contact seller" stay hidden until slices
// 5 / 7; the visit is recorded in 4.3.12 (`recordGigView`).
import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { splitLegacyLinks } from '@mytask/i18n';
import {
  Avatar,
  Breadcrumb,
  FeaturedPill,
  formatMoney,
  OnlineStatus,
  RatingStars,
} from '@mytask/ui/web';
import { loadGig } from '../../../../../components/gig-page/data';
import { GigUpgrades } from '../../../../../components/gig-page/upgrades';
import '../../../../../components/gig-page/gig-page.css';
import { DELIVERY_DAYS } from '../../../../../components/gig-wizard/gig-form';
import { VerifiedMark } from '../../../../../components/profile/parts';
import { categoryHref } from '../../../../../lib/category-nav';
import { formatDate } from '../../../../../lib/format';
import { href } from '../../../../../lib/href';
import { getT, toLocale } from '../../../../../lib/i18n';
import { pageTitle } from '../../../../../lib/page-title';
import { siteUrl } from '../../../../../lib/seo';

type Params = { params: Promise<{ locale: string; slug: string }> };

/** The gig for this URL; an old slug, a different case or a legacy English-UI slug → 301 to the current one. */
async function resolve(params: Params['params']) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const gig = await loadGig(locale, decodeURIComponent(slug));
  if (gig.slug !== decodeURIComponent(slug))
    permanentRedirect(href(locale, `/service/${gig.slug}`));
  return { locale, gig };
}

/** Plain text of the stored description HTML, for the meta description. */
function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, gig } = await resolve(params);
  const path = `/service/${gig.slug}`;
  const abs = (l: 'ka' | 'en') => `${siteUrl()}${href(l, path)}`;
  const description = gig.seoDescription || plain(gig.description).slice(0, 160);
  // Spec 17 AC-4: without English text the Georgian URL is canonical, the English page is `noindex, follow` and
  // not an `en` alternate. Pending and rejected gigs (owner only) are never indexed.
  const robots =
    gig.status !== 'active'
      ? { index: false, follow: false }
      : locale === 'en' && !gig.hasEnglish
        ? { index: false, follow: true }
        : undefined;
  return {
    title: await pageTitle(locale, gig.seoTitle || gig.title),
    description,
    alternates: gig.hasEnglish
      ? {
          canonical: abs(locale),
          languages: { ka: abs('ka'), en: abs('en'), 'x-default': abs('ka') },
        }
      : { canonical: abs('ka'), languages: { ka: abs('ka'), 'x-default': abs('ka') } },
    openGraph: {
      title: gig.seoTitle || gig.title,
      description,
      url: abs(gig.hasEnglish ? locale : 'ka'),
      images: [{ url: gig.thumbnail.large }],
    },
    ...(robots ? { robots } : {}),
  };
}

function deliveryLabel(days: number): string | undefined {
  return DELIVERY_DAYS.find((d) => d.days === days)?.label;
}

export default async function GigPage({ params }: Params) {
  const { locale, gig } = await resolve(params);
  const t = await getT(locale);
  const lang = gig.contentLocale !== locale ? gig.contentLocale : undefined;
  const seller = gig.seller.user;
  const isOwner = gig.viewer?.isOwner ?? false;
  const average = (tenths: number | null) => (tenths === null ? null : (tenths / 10).toFixed(1));
  const gigAverage = average(gig.rating.averageTenths);
  const sellerAverage = average(gig.seller.rating.averageTenths);
  const delivery = deliveryLabel(gig.deliveryDays);

  // Breadcrumb: Home › category › sub-category › child category (AC-26), each to its category page.
  const levels = [gig.category, gig.subcategory, gig.childCategory];
  let crumbPath = '';
  const crumbs = [
    { label: t('t_home'), href: href(locale, '/') },
    ...levels.map((c) => {
      crumbPath = crumbPath ? `${crumbPath}/${c.slug}` : c.slug;
      return {
        label: c.name,
        href: categoryHref(locale, crumbPath),
        lang: c.contentLocale !== locale ? c.contentLocale : undefined,
      };
    }),
  ];

  const revisions =
    gig.revisionsAllowed === null
      ? t('t_revisions_not_specified') // migrated gig without a value (Q-142)
      : gig.revisionsAllowed === 0
        ? t('t_no_revisions')
        : t('t_revisions_included', { count: gig.revisionsAllowed });

  const upgrades = gig.upgrades.map((u) => {
    const extra = deliveryLabel(u.extraDays);
    return {
      id: u.id,
      title: u.title,
      price: formatMoney(u.price),
      delivery:
        u.extraDays > 0 && extra
          ? t('t_delivery_time_will_be_increased_by_extra', { time: t(extra) })
          : t('t_no_changes_delivery_time'),
    };
  });

  // AC-29: the seller is away (with the date) or cannot take orders (restricted).
  const away = !gig.seller.isAcceptingOrders;
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
    <main className="mt-gig-page" data-testid="gig-page">
      <div className="mt-gig-notices">
        {gig.status === 'pending' && (
          <div className="mt-gig-notice" role="note" data-testid="pending-note">
            <p className="mt-gig-notice-text">{t('t_this_gig_not_activated_yet')}</p>
          </div>
        )}
        {gig.status === 'rejected' && (
          <div
            className="mt-gig-notice mt-gig-notice-danger"
            role="note"
            data-testid="rejected-note"
          >
            <p className="mt-gig-notice-title">{t('t_rejected')}</p>
            <p className="mt-gig-notice-text">{t('t_gig_rejected_not_public')}</p>
          </div>
        )}
        {away && (
          <div className="mt-gig-notice" role="note" data-testid="away-note">
            <p className="mt-gig-notice-title">{t('t_attention_needed')}</p>
            <p className="mt-gig-notice-text">{awayText}</p>
          </div>
        )}
        {gig.contentLocale !== locale && (
          <div className="mt-gig-notice mt-gig-notice-info" role="note" data-testid="georgian-note">
            <p className="mt-gig-notice-text">{t('t_content_shown_in_georgian')}</p>
          </div>
        )}
      </div>

      <Breadcrumb label={t('t_breadcrumb')} items={crumbs} Link={Link} />

      <header className="mt-gig-head">
        <h1 className="mt-gig-title">
          <span lang={lang}>{gig.title}</span>
          {gig.isFeatured && (
            <>
              {' '}
              <FeaturedPill label={t('t_featured')} hint={t('t_featured_badge_hint')} />
            </>
          )}
        </h1>
        <div className="mt-gig-seller" data-testid="gig-seller">
          <a className="mt-gig-seller-link" href={href(locale, `/profile/${seller.username}`)}>
            <Avatar
              image={seller.avatar}
              name={seller.username}
              size="md"
              online={seller.isOnline}
            />
            <span className="mt-gig-seller-name">{seller.username}</span>
          </a>
          {seller.isIdVerified && <VerifiedMark label={t('t_account_verified')} />}
          <OnlineStatus
            online={seller.isOnline}
            label={t(seller.isOnline ? 't_online' : 't_offline')}
          />
          {sellerAverage !== null && (
            <span className="mt-gig-rating">
              <RatingStars
                tenths={gig.seller.rating.averageTenths!}
                label={t('t_ui_rating_label', {
                  rating: sellerAverage,
                  count: gig.seller.rating.count,
                })}
              />
              <strong>{sellerAverage}</strong>
              <span>({gig.seller.rating.count})</span>
            </span>
          )}
        </div>
        <ul className="mt-gig-stats" data-testid="gig-stats">
          <li>
            {t(
              gig.ordersInQueueCount <= 1 ? 't_number_order_in_queue' : 't_number_orders_in_queue',
              {
                number: gig.ordersInQueueCount,
              },
            )}
          </li>
          {gig.deliveryDays > 0 && delivery && (
            <li>{t('t_expected_delivery_date_time', { date: t(delivery) })}</li>
          )}
          <li className="mt-gig-rating">
            <RatingStars
              tenths={gig.rating.averageTenths ?? 0}
              label={t('t_ui_rating_label', {
                rating: gigAverage ?? '0.0',
                count: gig.rating.count,
              })}
            />
            <strong>{gigAverage ?? t('t_n_a')}</strong>
            <span>({t('t_number_reviews', { number: gig.rating.count })})</span>
          </li>
        </ul>
      </header>

      <div className="mt-gig-layout">
        <div className="mt-gig-main">
          {/* The cover image; the gallery with thumbnails replaces it in 4.3.11b. */}
          <figure className="mt-gig-cover" data-testid="gig-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN variants are already sized (ADR-009 §2) */}
            <img
              src={gig.thumbnail.large}
              alt={gig.title}
              width={gig.thumbnail.width ?? undefined}
              height={gig.thumbnail.height ?? undefined}
            />
          </figure>
        </div>

        <aside className="mt-gig-box" aria-labelledby="gig-box-price" data-testid="purchase-box">
          <p className="mt-gig-price">
            <span className="mt-gig-price-label">{t('t_starting_at')}</span>
            <strong id="gig-box-price" className="mt-gig-price-value">
              {formatMoney(gig.price)}
            </strong>
          </p>
          <p className="mt-gig-revisions" data-testid="gig-revisions">
            {revisions}
          </p>
          {upgrades.length > 0 && (
            <GigUpgrades label={t('t_upgrades')} rows={upgrades} lang={lang} />
          )}
          {/* "Add to cart" (slice 5) and "Contact seller" (slice 7) come with their slices. */}
          {isOwner && (
            <div className="mt-gig-box-section">
              <p className="mt-gig-box-title">{t('t_actions')}</p>
              <div className="mt-gig-actions">
                {/* A private page: a full page load (ADR-019 §2). */}
                <a className="mt-button" href={href(locale, `/seller/gigs/${gig.uid}/edit`)}>
                  {t('t_edit_gig')}
                </a>
              </div>
            </div>
          )}
        </aside>

        <section className="mt-gig-section" aria-labelledby="gig-description">
          <h2 id="gig-description" className="mt-gig-section-title">
            {t('t_description')}
          </h2>
          <div
            className="mt-gig-description"
            lang={lang}
            data-testid="gig-description"
            // Sanitised `user_text` HTML from the API (CONVENTIONS §19).
            dangerouslySetInnerHTML={{ __html: gig.description }}
          />
        </section>
      </div>
    </main>
  );
}
