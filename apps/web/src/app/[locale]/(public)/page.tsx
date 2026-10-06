// Home page (ROADMAP 4.2.12; design 01-home.md; spec 03 AC-5, AC-18, AC-24…AC-26; spec 17 AC-35): hero (S-113 title
// or `t_find_best`, search, Gigs/Projects shortcuts kept on phones), featured categories (S-107), Top gigs, one row
// per visible category with "See more" on every size, best sellers (S-108). A block the API returns as null
// (setting OFF) or empty is not shown; a failed getHome leaves only the hero. The projects row joins with slice 9,
// the invite banner with slice 9 (referrals), logos and articles with slice 16.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import {
  Carousel,
  categoryThemeProps,
  FreelancerCard,
  GigCard,
  GigGrid,
  MOTION_ENTRANCE_SCRIPT,
  motionEntrance,
  SiteIcon,
} from '@mytask/ui/web';
import { viewerApi } from '../../../lib/api';
import { categoryHref } from '../../../lib/category-nav';
import { gigCardLabels, toGigCardData } from '../../../lib/gig-card';
import { href } from '../../../lib/href';
import { getT, toLocale } from '../../../lib/i18n';
import { getServerPublicConfig } from '../../../lib/site-data';
import { alternates } from '../../../lib/seo';
import { contactHref } from '../../../components/profile/parts';
import '../../../components/catalog/catalog.css';
import '../../../components/home/home.css';

export const dynamic = 'force-dynamic';

type Home = components['schemas']['Home'];
type GigCardItem = components['schemas']['GigCard'];
type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const config = await getServerPublicConfig(locale);
  return {
    description: config?.seo.defaultMetaDescription ?? undefined,
    alternates: alternates(locale, '/'),
  };
}

async function loadHome(locale: Locale): Promise<{ home: Home | null; guest: boolean }> {
  try {
    const { api, hasSession } = await viewerApi(locale);
    const { data } = await api.GET('/home', { signal: AbortSignal.timeout(4000) });
    return { home: data ?? null, guest: !hasSession };
  } catch {
    return { home: null, guest: true };
  }
}

export default async function HomePage({ params }: Params) {
  const locale = toLocale((await params).locale);
  const [t, config, { home, guest }, head] = await Promise.all([
    getT(locale),
    getServerPublicConfig(locale),
    loadHome(locale),
    headers(),
  ]);
  const hero = config?.content.hero;
  const projectsOn = config?.projects.enabled ?? false;
  const labels = gigCardLabels(t);
  const gigs = (list: GigCardItem[], label: string) => (
    <GigGrid label={label}>
      {list.map((g, i) => (
        <li key={g.id} {...motionEntrance(i)}>
          <GigCard gig={toGigCardData(locale, g)} labels={labels} Link={Link} />
        </li>
      ))}
    </GigGrid>
  );
  const seeMore = (to: string, testId?: string) => (
    <Link href={to} className="mt-home-see-more" data-testid={testId}>
      {t('t_see_more')} →
    </Link>
  );

  return (
    // The entrance script marks <main> once it runs (3X.11, M-10); React does not own that attribute.
    <main className="mt-home" suppressHydrationWarning>
      <script
        nonce={head.get('x-nonce') ?? ''}
        dangerouslySetInnerHTML={{ __html: MOTION_ENTRANCE_SCRIPT }}
      />
      <section className="mt-home-hero" aria-labelledby="home-title">
        <div className="mt-home-hero-inner">
          <div className="mt-home-hero-text">
            <h1 id="home-title" lang={hero?.title ? hero.contentLocale : undefined}>
              {hero?.title || t('t_find_best')}
            </h1>
            {hero?.subtitle && <p lang={hero.contentLocale}>{hero.subtitle}</p>}
            <form
              className="mt-home-search"
              role="search"
              action={href(locale, '/search')}
              method="get"
            >
              <label htmlFor="home-q" className="mt-visually-hidden">
                {t('t_search')}
              </label>
              <input
                id="home-q"
                type="search"
                name="q"
                maxLength={100}
                placeholder={t('t_what_service_are_u_looking_for_today')}
              />
              <button type="submit" className="mt-button mt-button-primary">
                {t('t_search')}
              </button>
            </form>
          </div>
          <nav className="mt-home-shortcuts" aria-label={t('t_explore')}>
            <a href={href(locale, '/search')}>
              <SiteIcon name="images" size={32} />
              <span>{t('t_gigs')}</span>
            </a>
            {projectsOn && (
              <a href={href(locale, '/explore/projects')}>
                <SiteIcon name="briefcase" size={32} />
                <span>{t('t_projects')}</span>
              </a>
            )}
          </nav>
        </div>
      </section>

      <div className="mt-home-rows">
        {home?.featuredCategories && home.featuredCategories.length > 0 && (
          <section className="mt-home-row" aria-labelledby="home-featured">
            <div className="mt-home-row-head">
              <h2 id="home-featured">{t('t_featured_categories')}</h2>
            </div>
            <Carousel
              label={t('t_featured_categories')}
              previous={t('t_page_previous')}
              next={t('t_page_next')}
              testId="featured-categories"
            >
              {home.featuredCategories.map((f, i) => (
                <li key={f.category.id} {...motionEntrance(i)}>
                  <Link
                    href={categoryHref(locale, f.category.slug)}
                    className="mt-category-tile"
                    {...categoryThemeProps(f.category.color)}
                  >
                    {f.image && (
                      // eslint-disable-next-line @next/next/no-img-element -- media host artwork
                      <img src={f.image.medium} alt="" loading="lazy" />
                    )}
                    <span
                      lang={
                        f.category.contentLocale !== locale ? f.category.contentLocale : undefined
                      }
                    >
                      {f.category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </Carousel>
          </section>
        )}

        {home && home.topGigs.length > 0 && (
          <section className="mt-home-row" aria-labelledby="home-top" data-testid="top-gigs">
            <div className="mt-home-row-head">
              <h2 id="home-top">{t('t_selected_gigs_for_u')}</h2>
              {seeMore(href(locale, '/search'))}
            </div>
            {gigs(home.topGigs, t('t_selected_gigs_for_u'))}
          </section>
        )}

        {home?.categoryRows
          .filter((row) => row.gigs.length > 0)
          .map((row) => (
            <section
              key={row.category.id}
              className="mt-home-row"
              aria-labelledby={`home-row-${row.category.id}`}
              data-testid="category-row"
              {...categoryThemeProps(row.category.color)}
            >
              <div className="mt-home-row-head">
                <h2
                  id={`home-row-${row.category.id}`}
                  lang={
                    row.category.contentLocale !== locale ? row.category.contentLocale : undefined
                  }
                >
                  {row.category.name}
                </h2>
                {seeMore(categoryHref(locale, row.category.slug))}
              </div>
              {gigs(row.gigs, row.category.name)}
            </section>
          ))}

        {home?.bestSellers && home.bestSellers.length > 0 && (
          <section
            className="mt-home-row"
            aria-labelledby="home-sellers"
            data-testid="best-sellers"
          >
            <div className="mt-home-row-head">
              <h2 id="home-sellers">{t('t_top_sellers')}</h2>
              {seeMore(href(locale, '/sellers'))}
            </div>
            <ul className="mt-seller-grid" aria-label={t('t_top_sellers')}>
              {home.bestSellers.map(({ user, skills }, i) => (
                <li key={user.id} {...motionEntrance(i)}>
                  <FreelancerCard
                    seller={{
                      username: user.username,
                      href: href(locale, `/profile/${user.username}`),
                      avatar: user.avatar,
                      isOnline: user.isOnline,
                      isIdVerified: user.isIdVerified,
                      skills: skills.map((s) => ({
                        name: s.name,
                        href: href(locale, `/hire/${encodeURIComponent(s.slug)}`),
                      })),
                      contactHref: contactHref(locale, user.username, guest),
                    }}
                    labels={{
                      verified: t('t_account_verified'),
                      contact: t('t_contact_me'),
                      view: t('t_view_profile'),
                    }}
                    Link={Link}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
