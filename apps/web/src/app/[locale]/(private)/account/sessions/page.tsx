'use client';
// Account → Browser sessions (spec 01 AC-43, AC-44, AC-55; legacy `Account/Sessions/SessionsComponent.php:97-210`
// and `sessions.blade.php`). Lists every active session ("This device" or last activity); "Log out other browser
// sessions" asks for the current password, or for an emailed `revoke_sessions` code on accounts without one.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, CodeInput, Field, Submit } from '@mytask/ui/web';
import { AuthCard } from '../../../../../components/auth/ui';
import {
  href,
  splitErrors,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../../lib/client';

type Me = components['schemas']['Me'];
type Session = components['schemas']['SessionSummary'];
type Challenge = components['schemas']['TwoFactorChallenge'];

const MOBILE_OS = /android|ios|iphone|ipad/i;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "5 minutes ago" in the page language (legacy Carbon `diffForHumans`). */
function ago(iso: string, locale: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return fmt.format(Math.round(seconds / size), unit);
  }
  return fmt.format(seconds, 'second');
}

function DeviceIcon({ mobile }: { mobile: boolean }) {
  return (
    <svg className="session-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {mobile ? (
        <path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h8V4H8zm3 13h2v2h-2v-2z" />
      ) : (
        <path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6H4z" />
      )}
    </svg>
  );
}

export default function SessionsPage() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const [me, setMe] = useState<Me>();
  const [sessions, setSessions] = useState<Session[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [challenge, setChallenge] = useState<Challenge>();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const { fields, general } = splitErrors(err);

  const loadSessions = useCallback(async () => {
    setLoadFailed(false);
    const res = await api.GET('/me/sessions');
    if (res.error) return setLoadFailed(true);
    setSessions(res.data.data);
    setNow(Date.now());
  }, [api]);

  useEffect(() => {
    void api.GET('/me').then((res) => {
      if (res.error) {
        router.replace(`${href(locale, '/auth/login')}?next=${href(locale, '/account/sessions')}`);
        return;
      }
      if (res.data.isRestricted) {
        router.replace(href(locale, '/restricted'));
        return;
      }
      setMe(res.data);
      void loadSessions();
    });
  }, [api, router, locale, loadSessions]);

  // The resend countdown of an emailed code (AC-27 limits apply, AC-44).
  useEffect(() => {
    if (!challenge) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [challenge]);

  /** Accounts without a password get a `revoke_sessions` code by email (SEC-05, Q-144). */
  async function sendCode() {
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/me/two-factor/challenges', {
      body: { purpose: 'revoke_sessions' },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setChallenge(res.data);
    setCode('');
    setNow(Date.now());
  }

  async function start() {
    setNotice(undefined);
    setErr(undefined);
    setAsking(true);
    if (me && !me.hasPassword) await sendCode();
  }

  function cancel() {
    setAsking(false);
    setChallenge(undefined);
    setPassword('');
    setCode('');
    setErr(undefined);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/me/sessions/revoke-others', {
      body: challenge
        ? { challengeId: challenge.challengeId, code }
        : { currentPassword: password },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    cancel();
    setNotice(t('t_toast_operation_success'));
    void loadSessions();
  }

  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000))
    : 0;

  return (
    <AuthCard title={t('t_browser_sessions')} subtitle={t('t_browser_sessions_subtitle')}>
      {!sessions && !loadFailed && (
        <p className="auth-muted" role="status">
          {t('t_ui_loading')}
        </p>
      )}
      {loadFailed && (
        <Alert kind="error">
          {t('t_toast_something_went_wrong')}{' '}
          <button type="button" className="auth-link-button" onClick={() => void loadSessions()}>
            {t('t_ui_retry')}
          </button>
        </Alert>
      )}
      {sessions && (
        <ul className="session-list" aria-label={t('t_browser_sessions')}>
          {sessions.map((s) => {
            const mobile = s.client !== 'web' || MOBILE_OS.test(s.os ?? '');
            return (
              <li key={s.id} className="session-item" data-testid="session">
                <DeviceIcon mobile={mobile} />
                <div className="session-details">
                  <p className="session-name">
                    {s.os || t('t_unknown')} - {s.browser || s.deviceLabel || t('t_unknown')}
                  </p>
                  <p className="auth-muted">{s.ip}</p>
                  {s.isCurrent ? (
                    <p className="session-current">{t('t_this_device')}</p>
                  ) : (
                    <p className="auth-muted">
                      {t('t_last_activity')} {ago(s.lastActiveAt, locale, now)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {notice && <Alert kind="success">{notice}</Alert>}
      {sessions && !asking && (
        <button type="button" className="auth-button" onClick={() => void start()}>
          {t('t_logout_other_browser_sessions')}
        </button>
      )}
      {asking && (
        <form onSubmit={onSubmit} noValidate>
          {general && <Alert kind="error">{general}</Alert>}
          {me?.hasPassword ? (
            <>
              <p className="auth-muted">
                {t('t_to_help_make_ur_account_secure_enter_current_pass')}
              </p>
              <Field
                label={t('t_current_password')}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={setPassword}
                error={fields.currentPassword}
                showLabel={t('t_ui_show_password')}
                hideLabel={t('t_ui_hide_password')}
              />
            </>
          ) : (
            challenge && (
              <>
                <Alert kind="info">{challenge.notice.message}</Alert>
                <CodeInput label={t('t_ui_verification_code')} value={code} onChange={setCode} />
                {fields.code && <p className="auth-error">{fields.code}</p>}
              </>
            )
          )}
          {(me?.hasPassword || challenge) && (
            <Submit busy={busy} ready={!challenge || code.length === 6}>
              {t('t_logout_other_browser_sessions')}
            </Submit>
          )}
          <div className="auth-row">
            {challenge && (
              <button
                type="button"
                className="auth-link-button"
                disabled={wait > 0 || busy}
                onClick={() => void sendCode()}
              >
                {wait > 0 ? t('t_2fa_resend_wait', { seconds: wait }) : t('t_2fa_resend_code')}
              </button>
            )}
            <button type="button" className="auth-link-button" onClick={cancel}>
              {t('t_cancel')}
            </button>
          </div>
        </form>
      )}
      <Link href={href(locale, '/account/settings')}>{t('t_account_settings')}</Link>
    </AuthCard>
  );
}
