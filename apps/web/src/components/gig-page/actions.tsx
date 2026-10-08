'use client';
// The Actions row of the gig page purchase box (ROADMAP 4.3.11d; spec 04 AC-30, AC-35, AC-37; screen 02; legacy
// `ServiceComponent.php:212-303` report, `:444-525` favourites, the share and report modals of `service.blade.php`):
// Share (dialog), Report (dialog → `createGigReport`), and "Add to / Remove from favourite" (`putFavorite` /
// `deleteFavorite`), which the owner sees as "Edit gig". Guests get the legacy login messages with a link back here.
import { useState } from 'react';
import { Alert, Dialog, TextArea } from '@mytask/ui/web';
import { splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { HeartIcon, useLoginHref } from '../catalog/card-favorite';
import { ShareButton } from '../profile/client';

/** Spec 04 AC-37: the reason is 6…500 characters (contract `GigReportCreateRequest`). */
const REASON_MIN = 6;
const REASON_MAX = 500;

export function GigActions(props: {
  gigId: string;
  title: string;
  /** False for guests (`Gig.viewer` null). */
  signedIn: boolean;
  isOwner: boolean;
  isFavorite: boolean;
  hasReported: boolean;
  editHref: string;
}) {
  const locale = useLocale();
  const t = useT(locale);
  return (
    <div className="mt-gig-box-section" data-testid="gig-actions">
      <p className="mt-gig-box-title">{t('t_actions')}</p>
      <div className="mt-gig-actions">
        <ShareButton
          label={t('t_share')}
          dialogTitle={t('t_share_this_gig')}
          title={props.title}
          copiedText={t('t_copied')}
        />
        <ReportButton {...props} />
        {props.isOwner ? (
          // A private page: a full page load (ADR-019 §2).
          <a className="mt-button" href={props.editHref}>
            {t('t_edit_gig')}
          </a>
        ) : (
          <FavoriteButton {...props} />
        )}
      </div>
    </div>
  );
}

function ReportButton(props: {
  gigId: string;
  signedIn: boolean;
  isOwner: boolean;
  hasReported: boolean;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const login = useLoginHref();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [check, setCheck] = useState<string>();
  const [busy, setBusy] = useState(false);
  // What the dialog shows instead of the form: a refusal, the login message, or the thank-you.
  const [state, setState] = useState<'form' | 'login' | 'owner' | 'reported' | 'done'>(
    !props.signedIn ? 'login' : props.isOwner ? 'owner' : props.hasReported ? 'reported' : 'form',
  );
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = reason.trim();
    // Pre-check with the API's rule; the API checks again.
    if (!text) return setCheck(t('t_validator_required'));
    if (text.length < REASON_MIN) return setCheck(t('t_validator_min', { min: REASON_MIN }));
    setCheck(undefined);
    setBusy(true);
    setErr(undefined);
    const res = await api
      .POST('/gigs/{gigId}/reports', {
        params: { path: { gigId: props.gigId } },
        body: { reason: text },
      })
      .catch(() => undefined);
    setBusy(false);
    if (!res) return setErr({ code: 'NETWORK', message: t('t_toast_something_went_wrong') });
    // The session ended since the page was rendered: as a guest.
    if (res.response.status === 401) return setState('login');
    if (res.response.status === 409) return setState('reported');
    if (res.error) return setErr(res.error as ApiErrorBody);
    setReason('');
    setState('done');
  }

  const message = {
    login: t('t_pls_login_or_register_to_report_this_gig'),
    owner: t('t_gig_owner_cant_report_his_gig'),
    reported: t('t_looks_like_alrdy_reported_this_gig'),
  };

  return (
    <>
      <button
        type="button"
        className="mt-button"
        data-testid="report-gig"
        onClick={() => {
          setErr(undefined);
          setCheck(undefined);
          if (state === 'done') setState('reported');
          setOpen(true);
        }}
      >
        {t('t_report')}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('t_report_this_gig')}
        closeLabel={t('t_ui_close')}
        testId="report-dialog"
      >
        {state === 'form' ? (
          <form className="mt-gig-dialog" onSubmit={send} noValidate>
            {general && <Alert kind="error">{general}</Alert>}
            <TextArea
              label={t('t_reason')}
              name="reason"
              placeholder={t('t_let_us_know_why_u_report_this_gig')}
              maxLength={REASON_MAX}
              value={reason}
              onChange={setReason}
              error={check ?? fields.reason}
            />
            <div className="mt-gig-dialog-buttons">
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
        ) : (
          <div className="mt-gig-dialog">
            <Alert kind={state === 'done' ? 'success' : 'info'}>
              {state === 'done' ? t('t_gig_reported_successfully') : message[state]}
            </Alert>
            <div className="mt-gig-dialog-buttons">
              {state === 'login' && (
                <a className="mt-button mt-button-primary" href={login}>
                  {t('t_login')}
                </a>
              )}
              <button type="button" className="mt-button" onClick={() => setOpen(false)}>
                {t('t_ui_close')}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function FavoriteButton(props: { gigId: string; signedIn: boolean; isFavorite: boolean }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const login = useLoginHref();
  const [favorite, setFavorite] = useState(props.isFavorite);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; login?: boolean; error?: boolean }>();

  async function toggle() {
    if (!props.signedIn)
      return setNote({ text: t('t_pls_login_or_register_to_add_to_favovorite'), login: true });
    setBusy(true);
    const path = { params: { path: { gigId: props.gigId } } };
    const res = await (
      favorite ? api.DELETE('/favorites/{gigId}', path) : api.PUT('/favorites/{gigId}', path)
    ).catch(() => undefined);
    setBusy(false);
    if (res?.response.status === 401)
      return setNote({ text: t('t_pls_login_or_register_to_add_to_favovorite'), login: true });
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

  return (
    <>
      <button
        type="button"
        className="mt-button mt-gig-favorite"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void toggle()}
        data-testid="favorite-gig"
      >
        <HeartIcon filled={favorite} />
        {t(favorite ? 't_remove_from_favorite' : 't_add_to_favorite')}
      </button>
      <p
        className={`mt-gig-action-note${note?.error ? ' mt-gig-action-note-error' : ''}`}
        role="status"
        data-testid="favorite-note"
      >
        {note?.text}
        {note?.login && (
          <>
            {' '}
            <a href={login}>{t('t_login')}</a>
          </>
        )}
      </p>
    </>
  );
}
