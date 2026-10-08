'use client';
// Browser parts of the public profile pages: share dialog, report dialog, local clock and the portfolio
// "Load more" grid (spec 02 AC-8, AC-14, AC-28).
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Dialog, GigCard, GigGrid, Pill, TextArea } from '@mytask/ui/web';
import { gigCardLabels, toGigCardData } from '../../lib/gig-card';
import { CardFavorite } from '../catalog/card-favorite';
import { href, splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';

type PortfolioCard = components['schemas']['PortfolioItemCard'];
type GigCardItem = components['schemas']['GigCard'];

/**
 * "Share profile" / "Share this project" (design §7.4: one button opening a dialog with Facebook, X, LinkedIn,
 * WhatsApp and Copy link, 44 px targets). The URL is the page's own address. `dialogTitle` defaults to `label`.
 */
export function ShareButton(props: {
  label: string;
  title: string;
  copiedText: string;
  dialogTitle?: string;
}) {
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
        title={props.dialogTitle ?? props.label}
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

/**
 * "Report user" (AC-14; legacy `ProfileComponent.php:275-352` and the report modal of `profile.blade.php`): a reason
 * (required, ≤ 1,500) → `createUserReport`; a second report replaces the first (200 or 201, same message). Guests
 * get the login message with a link back here. Not rendered on the own profile (AC-13).
 */
export function ReportButton(props: { username: string; signedIn: boolean }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(!props.signedIn);
  const [err, setErr] = useState<ApiErrorBody>();
  const [empty, setEmpty] = useState(false);
  const { fields, general } = splitErrors(err);
  const [here, setHere] = useState('');
  useEffect(() => setHere(window.location.pathname), []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    if (!text) return setEmpty(true);
    setEmpty(false);
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/users/{username}/reports', {
      params: { path: { username: props.username } },
      body: { reason: text },
    });
    setBusy(false);
    // The session ended since the page was rendered: as a guest.
    if (res.response.status === 401) return setNeedsLogin(true);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setDone(true);
    setReason('');
  }

  return (
    <>
      <button
        type="button"
        className="mt-button"
        data-testid="report-user"
        onClick={() => {
          setDone(false);
          setErr(undefined);
          setEmpty(false);
          setOpen(true);
        }}
      >
        {t('t_report_user')}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('t_report_user')}
        closeLabel={t('t_ui_close')}
        testId="report-dialog"
      >
        {needsLogin ? (
          <div className="mt-profile-report">
            <Alert kind="info">{t('t_u_must_login_to_report_this_profile')}</Alert>
            <a
              className="mt-button mt-button-primary"
              href={`${href(locale, '/auth/login')}?next=${encodeURIComponent(here)}`}
            >
              {t('t_login')}
            </a>
          </div>
        ) : done ? (
          <div className="mt-profile-report">
            <Alert kind="success">{t('t_profile_has_been_successfully_reported')}</Alert>
            <button type="button" className="mt-button" onClick={() => setOpen(false)}>
              {t('t_ui_close')}
            </button>
          </div>
        ) : (
          <form className="mt-profile-report" onSubmit={send} noValidate>
            {general && <Alert kind="error">{general}</Alert>}
            <TextArea
              label={t('t_reason')}
              name="reason"
              placeholder={t('t_report_user_reason_placeholder')}
              maxLength={1500}
              value={reason}
              onChange={setReason}
              error={empty ? t('t_validator_required') : fields.reason}
            />
            <div className="mt-profile-report-buttons">
              <button type="button" className="mt-button" onClick={() => setOpen(false)}>
                {t('t_cancel')}
              </button>
              <button
                type="submit"
                className="mt-button mt-button-primary"
                disabled={busy}
                aria-busy={busy}
              >
                {t('t_report')}
              </button>
            </div>
          </form>
        )}
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

/** The profile's gigs (spec 02 AC-8): newest first, 6 at a time with "Load more" (listGigs cursor). */
export function ProfileGigs(props: {
  username: string;
  initial: GigCardItem[];
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
      .GET('/gigs', {
        params: { query: { sellerUsername: props.username, cursor, limit: props.pageSize } },
      })
      .catch(() => undefined);
    setBusy(false);
    if (!res?.data) return setFailed(true);
    const seen = new Set(items.map((i) => i.id));
    const next = (res.data.data as GigCardItem[]).filter((i) => !seen.has(i.id));
    setItems([...items, ...next]);
    setCursor(res.data.nextCursor);
  };

  const labels = gigCardLabels(t);
  return (
    <>
      <GigGrid label={t('t_gigs')}>
        {items.map((g) => (
          <li key={g.id}>
            <GigCard
              gig={toGigCardData(locale, g)}
              labels={labels}
              Link={Link}
              favorite={
                <CardFavorite gigId={g.id} seller={g.seller.username} isFavorite={g.isFavorite} />
              }
            />
          </li>
        ))}
      </GigGrid>
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
