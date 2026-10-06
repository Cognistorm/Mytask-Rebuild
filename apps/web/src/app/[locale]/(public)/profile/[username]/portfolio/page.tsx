// Portfolio list `/profile/{username}/portfolio` (spec 02 AC-28, AC-42; legacy `Main/Profile/PortfolioComponent.php`,
// `livewire/main/profile/portfolio.blade.php`): owner box, then the grid of public works, newest first, with
// "Load more". The owner also sees their pending and rejected works, marked. Empty: "No work added yet."
import type { Metadata } from 'next';
import { EmptyState } from '@mytask/ui/web';
import { PortfolioGrid } from '../../../../../../components/profile/client';
import {
  isGuestView,
  loadPortfolio,
  loadProfile,
  PORTFOLIO_PAGE_SIZE,
} from '../../../../../../components/profile/data';
import { OwnerBox } from '../../../../../../components/profile/parts';
import { getT, toLocale } from '../../../../../../lib/i18n';
import { pageTitle } from '../../../../../../lib/page-title';

type Params = { params: Promise<{ locale: string; username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw, username } = await params;
  const locale = toLocale(raw);
  const [t, { profile }] = await Promise.all([getT(locale), loadProfile(locale, username)]);
  return {
    title: await pageTitle(locale, t('t_username_portfolio', { username: profile.username })),
  };
}

export default async function PortfolioPage({ params }: Params) {
  const { locale: raw, username } = await params;
  const locale = toLocale(raw);
  const [t, { profile: p }, first] = await Promise.all([
    getT(locale),
    loadProfile(locale, username),
    loadPortfolio(locale, username, PORTFOLIO_PAGE_SIZE),
  ]);
  const guest = isGuestView(p);

  return (
    <main className="mt-profile">
      <OwnerBox
        t={t}
        locale={locale}
        user={{
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          isPremium: p.isPremium,
          isIdVerified: p.isIdVerified,
          isOnline: p.isOnline,
          countryCode: p.countryCode,
          isDeleted: false,
        }}
        headline={p.headline}
        isOwn={p.isOwnProfile}
        guest={guest}
      />
      <h1 className="mt-profile-page-title">
        {t('t_username_portfolio', { username: p.username })}
      </h1>
      {first.data.length === 0 ? (
        <EmptyState title={t('t_no_portfolio_yet')} />
      ) : (
        <PortfolioGrid
          username={p.username}
          initial={first.data}
          nextCursor={first.nextCursor}
          pageSize={PORTFOLIO_PAGE_SIZE}
        />
      )}
    </main>
  );
}
