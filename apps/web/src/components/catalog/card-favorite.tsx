'use client';
// The favourite heart of a gig card (ROADMAP 4.3.20b, QA BUG-03; spec 04 AC-35 "on the gig page or a gig card";
// legacy `livewire/main/cards/gig.blade.php:78-107`; components.md §7.2 favourite IconButton top-right over the
// image): `putFavorite` / `deleteFavorite` with the gig page's legacy messages, shown in a status bubble (the legacy
// toasts). Guests and an ended session get the login message with a link back (as the gig page, N-10). Not shown
// on the visitor's own gigs (the API refuses them, R-G10).
import { useEffect, useState } from 'react';
import { Alert, Dialog } from '@mytask/ui/web';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { useViewer } from '../site/viewer-context';
import './card-favorite.css';

/** Where a guest logs in from here and comes back. */
export function useLoginHref() {
  const locale = useLocale();
  const [here, setHere] = useState('');
  useEffect(() => setHere(window.location.pathname + window.location.search), []);
  return `${href(locale, '/auth/login')}?next=${encodeURIComponent(here)}`;
}

/** Phosphor `Heart` (regular / fill). */
export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path
        d={
          filled
            ? 'M240 102c0 70-103.79 126.66-108.21 129a8 8 0 0 1-7.58 0C119.79 228.66 16 172 16 102a62.07 62.07 0 0 1 62-62c20.65 0 38.73 8.88 50 23.89C139.27 48.88 157.35 40 178 40a62.07 62.07 0 0 1 62 62Z'
            : 'M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62Zm-50 174.8C109.74 204.16 32 155.69 32 102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8Z'
        }
      />
    </svg>
  );
}

/** How long the added / removed message stays (the legacy toast). */
const NOTE_MS = 4000;

export function CardFavorite(props: {
  gigId: string;
  seller: string;
  /** `GigCard.isFavorite`: null for guests. */
  isFavorite: boolean | null;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { username } = useViewer();
  const login = useLoginHref();
  const [favorite, setFavorite] = useState(props.isFavorite ?? false);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(undefined), NOTE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  if (username !== null && username.toLowerCase() === props.seller.toLowerCase()) return null;

  async function toggle() {
    if (username === null) return setLoginOpen(true);
    setBusy(true);
    const path = { params: { path: { gigId: props.gigId } } };
    const res = await (
      favorite ? api.DELETE('/favorites/{gigId}', path) : api.PUT('/favorites/{gigId}', path)
    ).catch(() => undefined);
    setBusy(false);
    if (res?.response.status === 401) return setLoginOpen(true);
    if (!res || res.error) {
      const message = (res?.error as ApiErrorBody | undefined)?.message;
      return setNote({ text: message || t('t_toast_something_went_wrong'), error: true });
    }
    setFavorite(!favorite);
    setNote({
      text: t(
        favorite ? 't_gig_removed_from_ur_favorite_list' : 't_gig_has_been_added_to_favorite_list',
      ),
    });
  }

  const label = t(favorite ? 't_remove_from_favorite' : 't_add_to_favorite');
  return (
    <>
      <button
        type="button"
        className={`mt-icon-button mt-card-favorite${favorite ? ' mt-card-favorite-on' : ''}`}
        aria-label={label}
        aria-pressed={favorite}
        title={label}
        disabled={busy}
        aria-busy={busy}
        onClick={() => void toggle()}
        data-testid="card-favorite"
      >
        <HeartIcon filled={favorite} />
      </button>
      <p
        className={`mt-card-favorite-note${note?.error ? ' mt-card-favorite-note-error' : ''}`}
        role="status"
        data-testid="card-favorite-note"
      >
        {note?.text}
      </p>
      <Dialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title={t('t_add_to_favorite')}
        closeLabel={t('t_ui_close')}
        testId="card-favorite-login"
      >
        <div className="mt-card-favorite-dialog">
          <Alert kind="info">{t('t_pls_login_or_register_to_add_to_favovorite')}</Alert>
          <div className="mt-card-favorite-dialog-buttons">
            <a className="mt-button mt-button-primary" href={login}>
              {t('t_login')}
            </a>
            <button type="button" className="mt-button" onClick={() => setLoginOpen(false)}>
              {t('t_ui_close')}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
