'use client';
// Browser parts of the public profile pages: share dialog, local clock, the session refresh and the portfolio
// "Load more" grid (spec 02 AC-8, AC-28).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { components } from '@mytask/types';
import { Dialog, Pill } from '@mytask/ui/web';
import { href, useApi, useLocale, useT } from '../../lib/client';

type PortfolioCard = components['schemas']['PortfolioItemCard'];

/**
 * "Share profile" / "Share this project" (design §7.4: one button opening a dialog with Facebook, X, LinkedIn,
 * WhatsApp and Copy link, 44 px targets). The URL is the page's own address.
 */
export function ShareButton(props: { label: string; title: string; copiedText: string }) {
  const locale = useLocale();
  const t = useT(locale);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(props.title);
  const targets = [
    ['t_share_on_facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['t_share_on_twitter', `https://twitter.com/intent/tweet?text=${text}&url=${u}`],
    ['t_share_on_linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['t_share_on_whatsapp', `https://api.whatsapp.com/send?text=${text}%20${u}`],
  ] as const;
  return (
    <>
      <button
        type="button"
        className="mt-button"
        onClick={() => {
          setCopied(false);
          setOpen(true);
        }}
      >
        {props.label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={props.label}
        closeLabel={t('t_ui_close')}
        testId="share-dialog"
      >
        <ul className="mt-profile-share">
          {targets.map(([key, link]) => (
            <li key={key}>
              <a
                className="mt-button"
                href={link}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {t(key)}
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="mt-button mt-button-primary"
              onClick={() => {
                void navigator.clipboard?.writeText(url).then(() => setCopied(true));
              }}
            >
              {t('t_copy_link')}
            </button>
          </li>
        </ul>
        <p role="status" className="mt-profile-share-status">
          {copied ? props.copiedText : ''}
        </p>
      </Dialog>
    </>
  );
}

/** The user's clock (AC-8 "local time"), from the API's IANA zone; refreshed every minute. */
export function LocalTime({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<string>();
  useEffect(() => {
    const format = () => {
      try {
        return new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: timezone,
        }).format(new Date());
      } catch {
        return undefined; // an unknown zone: no clock
      }
    };
    setNow(format());
    const timer = setInterval(() => setNow(format()), 60_000);
    return () => clearInterval(timer);
  }, [timezone]);
  return <span data-testid="local-time">{now ?? '—'}</span>;
}

/**
 * The page was rendered without an access cookie, but this browser has signed in before: the access token may
 * just have expired. One `getMe` lets the API client refresh the session; when that works, the server renders
 * the page again as the signed-in visitor (owner buttons, own pending work). Guests cost one 401.
 */
export function SessionRefresh() {
  const locale = useLocale();
  const api = useApi(locale);
  const router = useRouter();
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void api.GET('/me').then(
      (res) => {
        if (res.data) router.refresh();
      },
      () => undefined,
    );
  }, [api, router]);
  return null;
}

const STATUS_PILL = {
  pending: { tone: 'warning', key: 't_pending' },
  rejected: { tone: 'danger', key: 't_portfolio_status_rejected' },
} as const;

/** One work in a portfolio grid; the owner also sees "Pending" / "Rejected" (AC-28, AC-42). */
export function PortfolioCardView({ item, username }: { item: PortfolioCard; username: string }) {
  const locale = useLocale();
  const t = useT(locale);
  const pill = item.status === 'active' ? null : STATUS_PILL[item.status];
  return (
    <li className="mt-portfolio-card">
      <Link
        href={href(locale, `/profile/${username}/portfolio/${item.slug}`)}
        className="mt-portfolio-card-link"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- CDN variants are already sized (ADR-009 §2) */}
        <img src={item.thumbnail.medium} alt="" loading="lazy" />
        <span className="mt-portfolio-card-title">{item.title}</span>
      </Link>
      {pill && (
        <Pill tone={pill.tone} testId={`status-${item.status}`}>
          {t(pill.key)}
        </Pill>
      )}
    </li>
  );
}

/** The portfolio grid with "Load more" (cursor pages of `listPortfolioItems`). */
export function PortfolioGrid(props: {
  username: string;
  initial: PortfolioCard[];
  nextCursor: string | null;
  pageSize: number;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [items, setItems] = useState(props.initial);
  const [cursor, setCursor] = useState(props.nextCursor);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const more = async () => {
    if (!cursor) return;
    setBusy(true);
    setFailed(false);
    const res = await api
      .GET('/portfolio-items', {
        params: { query: { username: props.username, cursor, limit: props.pageSize } },
      })
      .catch(() => undefined);
    setBusy(false);
    if (!res?.data) return setFailed(true);
    const seen = new Set(items.map((i) => i.id));
    setItems([...items, ...res.data.data.filter((i) => !seen.has(i.id))]);
    setCursor(res.data.nextCursor);
  };

  return (
    <>
      <ul className="mt-portfolio-grid" data-testid="portfolio-grid">
        {items.map((item) => (
          <PortfolioCardView key={item.id} item={item} username={props.username} />
        ))}
      </ul>
      {failed && (
        <p role="alert" className="mt-profile-error">
          {t('t_toast_something_went_wrong')}
        </p>
      )}
      {cursor && (
        <div className="mt-profile-more">
          <button type="button" className="mt-button" disabled={busy} onClick={() => void more()}>
            {t('t_load_more')}
          </button>
        </div>
      )}
    </>
  );
}
