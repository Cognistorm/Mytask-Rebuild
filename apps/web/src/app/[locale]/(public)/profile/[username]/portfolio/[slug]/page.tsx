// Portfolio item `/profile/{username}/portfolio/{slug}` (spec 02 AC-28, AC-42; legacy `Main/Profile/ProjectComponent.php`,
// `livewire/main/profile/project.blade.php`): thumbnail, title, video and live-preview links, gallery,
// description, share, owner box. Pending and rejected works answer 404 to everyone but the owner, who sees
// the review note or the rejection reason. A slug with an old title (the uid is its suffix) → permanent
// redirect to the current one (url-map §4.3); a username that is not the owner's → 404 (EC-4).
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Pill } from '@mytask/ui/web';
import { SessionRefresh, ShareButton } from '../../../../../../../components/profile/client';
import {
  loadPortfolioItem,
  type PortfolioItem,
} from '../../../../../../../components/profile/data';
import { OwnerBox } from '../../../../../../../components/profile/parts';
import { href } from '../../../../../../../lib/href';
import { getT, toLocale } from '../../../../../../../lib/i18n';
import { pageTitle } from '../../../../../../../lib/page-title';

type Params = { params: Promise<{ locale: string; username: string; slug: string }> };

const sameUser = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The item for this URL: 404 for another user's path, a permanent redirect for an old slug. */
async function resolve(params: Params['params']) {
  const { locale: raw, username, slug } = await params;
  const locale = toLocale(raw);
  const { item, mayHaveSession, hasSession } = await loadPortfolioItem(locale, slug);
  if (!sameUser(item.owner.username, username)) notFound();
  if (item.slug !== slug || item.owner.username !== username) {
    permanentRedirect(href(locale, `/profile/${item.owner.username}/portfolio/${item.slug}`));
  }
  return { locale, item, mayHaveSession, hasSession };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, item } = await resolve(params);
  return {
    title: await pageTitle(locale, item.title),
    ...(item.status === 'active' ? {} : { robots: { index: false, follow: false } }),
  };
}

function Image({ image, alt }: { image: PortfolioItem['thumbnail']; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- CDN variants are already sized (ADR-009 §2)
    <img
      className="mt-portfolio-image"
      src={image.large}
      alt={alt}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
    />
  );
}

export default async function PortfolioItemPage({ params }: Params) {
  const { locale, item, mayHaveSession, hasSession } = await resolve(params);
  const t = await getT(locale);
  const external = { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } as const;

  return (
    <main className="mt-profile mt-profile-narrow">
      {mayHaveSession && !item.isOwn && <SessionRefresh />}
      {item.status === 'pending' && (
        <div className="mt-profile-notice" role="note" data-testid="pending-note">
          <Pill tone="warning">{t('t_pending')}</Pill>
          <p className="mt-profile-notice-text">{t('t_portfolio_pending_review')}</p>
        </div>
      )}
      {item.status === 'rejected' && (
        <div className="mt-profile-notice" role="note" data-testid="rejected-note">
          <Pill tone="danger">{t('t_portfolio_status_rejected')}</Pill>
          <p className="mt-profile-notice-text">
            {t('t_portfolio_rejected_reason', { reason: item.rejectionReason ?? '' })}
          </p>
        </div>
      )}

      <article className="mt-portfolio-item">
        <Image image={item.thumbnail} alt={item.title} />
        <h1 className="mt-profile-page-title">{item.title}</h1>
        {(item.videoUrl || item.projectUrl) && (
          <div className="mt-profile-actions">
            {item.videoUrl && (
              <a className="mt-button" href={item.videoUrl} {...external}>
                {t('t_watch_video')}
              </a>
            )}
            {item.projectUrl && (
              <a className="mt-button" href={item.projectUrl} {...external}>
                {t('t_live_preview')}
              </a>
            )}
          </div>
        )}
        {item.images.length > 0 && (
          <ul className="mt-portfolio-gallery" data-testid="gallery">
            {item.images.map((image, i) => (
              <li key={image.fileId}>
                <Image image={image} alt={`${item.title} (${i + 1}/${item.images.length})`} />
              </li>
            ))}
          </ul>
        )}
        <section className="mt-profile-section" aria-labelledby="portfolio-description">
          <h2 id="portfolio-description" className="mt-profile-section-title">
            {t('t_description')}
          </h2>
          <p className="mt-portfolio-description">{item.description}</p>
        </section>
        {item.status === 'active' && (
          <div className="mt-profile-actions">
            <ShareButton
              label={t('t_share_this_project')}
              title={item.title}
              copiedText={t('t_copied')}
            />
          </div>
        )}
      </article>

      <OwnerBox t={t} locale={locale} user={item.owner} isOwn={item.isOwn} guest={!hasSession} />
    </main>
  );
}
