'use client';
// Legacy auth panel furniture (spec 01 "Screens", QA BUG-01/BUG-04): "back to homepage" on small screens, the
// link list under the panel, and the terms sentence with real links (`login.blade.php`, `register.blade.php`).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { splitLegacyLinks, type Locale } from '@mytask/i18n';
import type { TFunction } from 'i18next';
import { href } from '../../lib/client';

/** CMS pages of spec 17 (url-map §2: `/page/{slug}`). */
export const PRIVACY_PATH = '/page/privacy-policy';
export const TERMS_PATH = '/page/terms-of-service';

export function BackHome({ locale, t }: { locale: Locale; t: TFunction }) {
  return (
    <Link className="auth-back-home" href={href(locale, '/')}>
      {t('t_back_to_homepage')}
    </Link>
  );
}

export function AuthLinks({ children }: { children: ReactNode }) {
  return <ul className="auth-links">{children}</ul>;
}

export function PolicyLinks({ locale, t }: { locale: Locale; t: TFunction }) {
  return (
    <>
      <li>
        <Link href={href(locale, PRIVACY_PATH)}>{t('t_privacy_policy')}</Link>
      </li>
      <li>
        <Link href={href(locale, TERMS_PATH)}>{t('t_terms_of_service')}</Link>
      </li>
    </>
  );
}

/** `t_by_signup_u_agree_to_terms_privacy` with its two links rendered as links, never as HTML. */
export function TermsSentence({ locale, t }: { locale: Locale; t: TFunction }) {
  const urls: Record<string, string> = {
    privacy_url: href(locale, PRIVACY_PATH),
    terms_url: href(locale, TERMS_PATH),
  };
  const parts = splitLegacyLinks(
    t('t_by_signup_u_agree_to_terms_privacy', {
      privacy_url: 'privacy_url',
      terms_url: 'terms_url',
    }),
  );
  return (
    <>
      {parts.map((p, i) =>
        p.link && urls[p.link] ? (
          <Link key={i} href={urls[p.link]!} target="_blank">
            {p.text}
          </Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
