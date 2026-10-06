// Server-rendered pieces shared by the profile and portfolio pages (spec 02 AC-8, AC-11, AC-13, AC-28).
// Links into private pages (edit profile, inbox, login) are plain <a>: crossing the public/private line is a
// full page load (ADR-019 §2, spec 16 AC-73).
import type { TFunction } from 'i18next';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Avatar } from '@mytask/ui/web';
import { href } from '../../lib/href';
import './profile.css';

type UserSummary = components['schemas']['UserSummary'];

/** Where "Contact me" goes (url-map §5: `/inbox/u/{username}` opens or starts the chat); guests log in first. */
export function contactHref(locale: Locale, username: string, guest: boolean): string {
  const chat = href(locale, `/inbox/u/${encodeURIComponent(username)}`);
  return guest ? `${href(locale, '/auth/login')}?next=${encodeURIComponent(chat)}` : chat;
}

/** Verified mark next to a name (Phosphor `SealCheck` fill) with its text for screen readers. */
export function VerifiedMark({ label }: { label: string }) {
  return (
    <span className="mt-profile-verified" title={label} data-testid="id-verified-mark">
      <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M225.86 102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28 23.51 138.44 16 128 16s-18.27 7.51-25.18 14.14c-3.94 3.77-8 7.67-11.57 9.14-3.25 1.36-8.69 1.44-13.94 1.52-9.76.15-20.82.31-28.51 8s-7.8 18.75-8 28.51c-.08 5.25-.16 10.67-1.52 13.94-1.47 3.56-5.37 7.63-9.14 11.57C23.51 109.72 16 117.56 16 128s7.51 18.27 14.14 25.18c3.77 3.94 7.67 8 9.14 11.57 1.36 3.27 1.44 8.69 1.52 13.94.15 9.76.31 20.82 8 28.51s18.75 7.85 28.51 8c5.25.08 10.67.16 13.94 1.52 3.56 1.47 7.63 5.37 11.57 9.14 6.9 6.63 14.74 14.14 25.18 14.14s18.27-7.51 25.18-14.14c3.94-3.77 8-7.67 11.57-9.14 3.27-1.36 8.69-1.44 13.94-1.52 9.76-.15 20.82-.31 28.51-8s7.85-18.75 8-28.51c.08-5.25.16-10.67 1.52-13.94 1.47-3.56 5.37-7.63 9.14-11.57 6.63-6.9 14.14-14.74 14.14-25.18s-7.51-18.27-14.14-25.18Zm-52.2 6.84-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z" />
      </svg>
      <span className="mt-visually-hidden">{label}</span>
    </span>
  );
}

/**
 * The owner box of the portfolio pages (legacy `portfolio.blade.php` / `project.blade.php`): avatar, username,
 * verified mark, headline, "Contact me" (not on one's own work) and "View profile".
 */
export function OwnerBox(props: {
  t: TFunction;
  locale: Locale;
  user: UserSummary;
  headline?: string | null;
  isOwn: boolean;
  guest: boolean;
}) {
  const { t, locale, user } = props;
  return (
    <aside className="mt-profile-owner" data-testid="owner-box">
      <Avatar image={user.avatar} name={user.username} size="lg" online={user.isOnline} />
      <div className="mt-profile-owner-text">
        <p className="mt-profile-owner-name">
          {user.username}
          {user.isIdVerified && <VerifiedMark label={t('t_account_verified')} />}
        </p>
        {props.headline && <p className="mt-profile-muted">{props.headline}</p>}
      </div>
      <div className="mt-profile-actions">
        {!props.isOwn && (
          <a
            className="mt-button mt-button-primary"
            href={contactHref(locale, user.username, props.guest)}
          >
            {t('t_contact_me')}
          </a>
        )}
        <a className="mt-button" href={href(locale, `/profile/${user.username}`)}>
          {t('t_view_profile')}
        </a>
      </div>
    </aside>
  );
}
