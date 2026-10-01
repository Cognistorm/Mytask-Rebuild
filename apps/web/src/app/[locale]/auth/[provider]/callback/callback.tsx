'use client';
// Spec 01 AC-30, AC-37…AC-41: the provider sends the browser back here with `code` + `state` (legacy path
// kept, url-map §5). They are forwarded once to completeSocialLogin; the `__Host-mt_oauth` cookie travels
// with the request and binds the flow to this browser (SEC-09). Errors are shown here with a way back to
// login (legacy redirected to the login page with the same message).
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { SOCIAL_NEXT_KEY } from '../../../../../components/auth/social';
import { TwoFactorStep, type TwoFactorChallenge } from '../../../../../components/auth/two-factor';
import { Alert, AuthCard } from '../../../../../components/auth/ui';
import {
  href,
  safeNext,
  useApi,
  useLocale,
  useT,
  type ApiErrorBody,
} from '../../../../../lib/client';
import type { SocialProvider } from '../../../../../lib/public-config';

function takeNext(): string | null {
  try {
    const next = sessionStorage.getItem(SOCIAL_NEXT_KEY);
    sessionStorage.removeItem(SOCIAL_NEXT_KEY);
    return next;
  } catch {
    return null;
  }
}

function Callback({ provider }: { provider: SocialProvider }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const search = useSearchParams();

  const [error, setError] = useState<string>();
  const [challenge, setChallenge] = useState<TwoFactorChallenge>();
  const next = useRef<string | null>(null);
  // `state` is single-use: React's dev double effect or a re-render must never send it twice.
  const sent = useRef(false);

  const done = () => router.replace(safeNext(next.current, href(locale, '/account')));

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    next.current = takeNext();
    const code = search.get('code');
    const state = search.get('state');
    // The one-time code should not stay in the address bar or the history.
    window.history.replaceState(null, '', window.location.pathname);
    // No code: the visitor cancelled at the provider, or the provider reported an error.
    if (!code || !state) return setError(t('t_toast_something_went_wrong'));
    void api
      .POST('/auth/social/{provider}/callback', {
        params: { path: { provider } },
        body: { code, state, codeVerifier: null },
      })
      .then((res) => {
        if (res.error) return setError((res.error as ApiErrorBody).message);
        if (res.response.status === 202) {
          return setChallenge(res.data as unknown as TwoFactorChallenge);
        }
        done();
      });
    // Runs once per page load by design (see `sent`); later renders must not resend `state`.
  }, []);

  if (challenge) return <TwoFactorStep challenge={challenge} onDone={done} />;

  if (error) {
    return (
      <AuthCard title={t('t_error')}>
        <Alert kind="error">{error}</Alert>
        <p className="auth-footer">
          <Link href={href(locale, '/auth/login')}>{t('t_login')}</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('t_please_wait_dots')}>
      <p className="auth-muted" role="status" aria-live="polite">
        {t('t_loading_dots')}
      </p>
    </AuthCard>
  );
}

export function SocialCallback({ provider }: { provider: SocialProvider }) {
  return (
    <Suspense>
      <Callback provider={provider} />
    </Suspense>
  );
}
