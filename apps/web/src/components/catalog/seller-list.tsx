// Freelancer grid of `/sellers` (40 per page) and `/hire/{keyword}` (42 per page) (spec 03 AC-27, AC-28, R-S6):
// FreelancerCards, numbered pages in the URL, the empty state. "Contact me" opens the chat, or login first for a
// guest (as on the profile, spec 02 AC-8).
import Link from 'next/link';
import type { TFunction } from 'i18next';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { EmptyState, FreelancerCard, Pagination } from '@mytask/ui/web';
import { href } from '../../lib/href';
import { contactHref } from '../profile/parts';
import './catalog.css';

type SellerCard = components['schemas']['SellerCard'];

export function SellerList(props: {
  locale: Locale;
  t: TFunction;
  sellers: SellerCard[];
  total: number;
  pageSize: number;
  page: number;
  basePath: string;
  guest: boolean;
  label: string;
}) {
  const { locale, t } = props;
  const pages = Math.ceil(props.total / props.pageSize);
  if (props.sellers.length === 0) return <EmptyState title={t('no_results_found')} />;
  return (
    <>
      <ul className="mt-seller-grid" aria-label={props.label}>
        {props.sellers.map(({ user, skills }) => (
          <li key={user.id}>
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
                contactHref: contactHref(locale, user.username, props.guest),
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
      <Pagination
        label={t('t_pagination')}
        previous={t('t_page_previous')}
        next={t('t_page_next')}
        pageLabel={(n) => t('t_page_n', { n })}
        current={props.page}
        total={pages}
        href={(n) => `${props.basePath}${n > 1 ? `?page=${n}` : ''}`}
        Link={Link}
      />
    </>
  );
}

/** `?page=N` of a list URL (1 when missing or invalid; the API caps at 1000). */
export function pageParam(params: Record<string, string | string[] | undefined>): number {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}
