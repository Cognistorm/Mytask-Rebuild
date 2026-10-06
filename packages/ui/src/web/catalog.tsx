// Catalogue display pieces (docs/05-design/components.md §7.2 GigCard + Featured badge, Breadcrumb, Pagination;
// spec 03 AC-8, AC-18, "Gig card"). Presentational only: texts arrive translated, links use the app's link
// component. No state, so server pages render them directly. Styles use design tokens only (catalog.css).
import type { ReactNode } from 'react';
import type { LinkComponent } from './dashboard';
import { Avatar, RatingStars, type AvatarImage } from './profile';
// Buttons (.mt-button) and chips come from the dashboard and profile styles.
import './dashboard.css';
import './catalog.css';

const PlainLink: LinkComponent = ({ children, ...props }) => <a {...props}>{children}</a>;

/** Phosphor `Crown` (fill), the Featured badge icon (components.md §7.2). */
function CrownIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M248 80a28 28 0 1 0-51.12 15.77l-26.79 33L146 73.4a28 28 0 1 0-36.06 0l-24.03 55.34-26.79-33a28 28 0 1 0-26.6 12L47 194.63A16 16 0 0 0 62.78 208h130.44A16 16 0 0 0 209 194.63l14.47-86.85A28 28 0 0 0 248 80Z" />
    </svg>
  );
}

/** Phosphor `SealCheck` (fill): ID verified. */
function VerifiedIcon({ label }: { label: string }) {
  return (
    <svg
      className="mt-gig-card-verified"
      width={16}
      height={16}
      viewBox="0 0 256 256"
      fill="currentColor"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path d="M225.86 102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28 23.51 138.44 16 128 16s-18.27 7.51-25.18 14.14c-3.94 3.77-8 7.67-11.57 9.14-3.25 1.36-8.69 1.44-13.94 1.52-9.76.15-20.82.31-28.51 8s-7.8 18.75-8 28.51c-.08 5.25-.16 10.67-1.52 13.94-1.47 3.56-5.37 7.63-9.14 11.57C23.51 109.72 16 117.56 16 128s7.51 18.27 14.14 25.18c3.77 3.94 7.67 8 9.14 11.57 1.36 3.27 1.44 8.69 1.52 13.94.15 9.76.31 20.82 8 28.51s18.75 7.85 28.51 8c5.25.08 10.67.16 13.94 1.52 3.56 1.47 7.63 5.37 11.57 9.14 6.9 6.63 14.74 14.14 25.18 14.14s18.27-7.51 25.18-14.14c3.94-3.77 8-7.67 11.57-9.14 3.27-1.36 8.69-1.44 13.94-1.52 9.76-.15 20.82-.31 28.51-8s7.85-18.75 8-28.51c.08-5.25.16-10.67 1.52-13.94 1.47-3.56 5.37-7.63 9.14-11.57 6.63-6.9 14.14-14.74 14.14-25.18s-7.51-18.27-14.14-25.18Zm-52.2 6.84-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z" />
    </svg>
  );
}

export interface GigCardData {
  href: string;
  title: string;
  /** The title's language when it fell back (`contentLocale`), for `lang`. */
  titleLang?: string;
  imageUrl: string | null;
  seller: {
    username: string;
    href: string;
    avatar: AvatarImage | null;
    isOnline: boolean;
    isIdVerified: boolean;
  };
  rating: { count: number; averageTenths: number | null };
  price: string;
  featured: boolean;
}

export interface GigCardLabels {
  featured: string;
  featuredHint: string;
  noReviews: string;
  startingAt: string;
  verified: string;
  /** "Rating 4.8 out of 5, 12 reviews" for the stars image. */
  ratingLabel: (average: string, count: number) => string;
}

/**
 * One gig in a list (§7.2): image 3:2, Featured frame + badge for Premium owners (AC-18, text + icon, not colour
 * only), seller mini-row, 2-line title (the card's one link), rating or a quiet "No reviews yet", starting price.
 * The favourite button joins with spec 04 (slice 3).
 */
export function GigCard(props: { gig: GigCardData; labels: GigCardLabels; Link?: LinkComponent }) {
  const { gig, labels } = props;
  const Link = props.Link ?? PlainLink;
  const average =
    gig.rating.averageTenths === null ? null : (gig.rating.averageTenths / 10).toFixed(1);
  return (
    <article
      className={`mt-gig-card${gig.featured ? ' mt-gig-card-featured' : ''}`}
      data-testid="gig-card"
    >
      <div className="mt-gig-card-media">
        {gig.imageUrl ? (
          <img src={gig.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="mt-gig-card-placeholder" aria-hidden="true" />
        )}
        {gig.featured && (
          <span className="mt-featured-badge" title={labels.featuredHint}>
            <CrownIcon />
            {labels.featured}
          </span>
        )}
      </div>
      <div className="mt-gig-card-body">
        <a className="mt-gig-card-seller" href={gig.seller.href}>
          <Avatar
            image={gig.seller.avatar}
            name={gig.seller.username}
            size="md"
            online={gig.seller.isOnline}
          />
          <span>{gig.seller.username}</span>
          {gig.seller.isIdVerified && <VerifiedIcon label={labels.verified} />}
        </a>
        <h3 className="mt-gig-card-title" lang={gig.titleLang}>
          <Link href={gig.href}>{gig.title}</Link>
        </h3>
        {average === null ? (
          <p className="mt-gig-card-no-reviews">{labels.noReviews}</p>
        ) : (
          <p className="mt-gig-card-rating">
            <RatingStars
              tenths={gig.rating.averageTenths!}
              label={labels.ratingLabel(average, gig.rating.count)}
            />
            <strong>{average}</strong>
            <span>({gig.rating.count})</span>
          </p>
        )}
      </div>
      <p className="mt-gig-card-price">
        <span>{labels.startingAt}</span>
        <strong>{gig.price}</strong>
      </p>
    </article>
  );
}

/** The result grid (1/2/3/4 columns, §7.2 layouts); each child is one `<li>`. */
export function GigGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul className="mt-gig-grid" aria-label={label}>
      {children}
    </ul>
  );
}

export function Breadcrumb(props: {
  label: string;
  items: { label: string; href?: string; lang?: string }[];
  Link?: LinkComponent;
}) {
  const Link = props.Link ?? PlainLink;
  return (
    <nav className="mt-breadcrumb" aria-label={props.label}>
      <ol>
        {props.items.map((item, i) => {
          const last = i === props.items.length - 1;
          return (
            <li key={`${i}-${item.label}`} lang={item.lang}>
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Page numbers 1 … n with the current page ±2 and the ends (AC-8: the page is kept in the URL). */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total]);
  for (let p = current - 2; p <= current + 2; p += 1) if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === 'number' && p - prev > 1) out.push('gap');
    out.push(p);
  }
  return out;
}

export function Pagination(props: {
  label: string;
  previous: string;
  next: string;
  pageLabel: (page: number) => string;
  current: number;
  total: number;
  href: (page: number) => string;
  Link?: LinkComponent;
}) {
  const Link = props.Link ?? PlainLink;
  if (props.total <= 1) return null;
  const { current, total } = props;
  return (
    <nav className="mt-pagination" aria-label={props.label} data-testid="pagination">
      {current > 1 && (
        <Link href={props.href(current - 1)} className="mt-pagination-step">
          {props.previous}
        </Link>
      )}
      <ol>
        {pageWindow(current, total).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              {p === current ? (
                <span aria-current="page" aria-label={props.pageLabel(p)}>
                  {p}
                </span>
              ) : (
                <Link href={props.href(p)}>{String(p)}</Link>
              )}
            </li>
          ),
        )}
      </ol>
      {current < total && (
        <Link href={props.href(current + 1)} className="mt-pagination-step">
          {props.next}
        </Link>
      )}
    </nav>
  );
}

export interface FreelancerCardData {
  username: string;
  href: string;
  avatar: AvatarImage | null;
  isOnline: boolean;
  isIdVerified: boolean;
  skills: { name: string; href: string }[];
  contactHref: string;
}

/**
 * One freelancer on `/sellers` and `/hire/{keyword}` (spec 03 AC-27, AC-28; components.md FreelancerCard): avatar,
 * username, "Account verified" when KYC is approved, up to 3 skill chips (each opens `/hire/{slug}`, AC-30),
 * "Contact me" and "View profile". Links into the private zone (chat, login) are plain anchors.
 */
export function FreelancerCard(props: {
  seller: FreelancerCardData;
  labels: { verified: string; contact: string; view: string };
  Link?: LinkComponent;
}) {
  const { seller, labels } = props;
  const Link = props.Link ?? PlainLink;
  return (
    <article className="mt-freelancer-card" data-testid="freelancer-card">
      <Avatar image={seller.avatar} name={seller.username} size="lg" online={seller.isOnline} />
      <h3 className="mt-freelancer-card-name">
        <Link href={seller.href}>{seller.username}</Link>
      </h3>
      {seller.isIdVerified && (
        <p className="mt-freelancer-card-verified">
          <VerifiedIcon label="" />
          {labels.verified}
        </p>
      )}
      {seller.skills.length > 0 && (
        <ul className="mt-freelancer-card-skills">
          {seller.skills.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="mt-chip">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-freelancer-card-actions">
        <a className="mt-button mt-button-primary" href={seller.contactHref}>
          {labels.contact}
        </a>
        <Link href={seller.href} className="mt-button mt-button-secondary">
          {labels.view}
        </Link>
      </div>
    </article>
  );
}
