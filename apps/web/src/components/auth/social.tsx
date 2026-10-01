'use client';
// Spec 01 AC-37, AC-38: one button per provider that is ON with saved keys (`PublicConfig.auth.socialProviders`),
// under an "or" divider (audit §3.8, components.md AuthLayout). The API keeps the PKCE verifier and binds this
// browser with the `__Host-mt_oauth` cookie (SEC-09); the provider returns to `/auth/{provider}/callback`.
import { useState } from 'react';
import { href, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { usePublicConfig, type SocialProvider } from '../../lib/public-config';
import { SocialIcon } from './social-icons';
import { Alert } from './ui';

/** Legacy button order (`livewire/main/auth/login.blade.php`). */
const ORDER: SocialProvider[] = ['facebook', 'google', 'github', 'twitter', 'linkedin'];

/** Where to go after the callback: kept for this tab only, checked again with safeNext() on return. */
export const SOCIAL_NEXT_KEY = 'mt_social_next';

export function SocialButtons({
  referralCode,
  next,
}: {
  referralCode?: string | null;
  next?: string | null;
}) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const config = usePublicConfig(locale);
  const [busy, setBusy] = useState<SocialProvider>();
  const [err, setErr] = useState<string>();

  const enabled = ORDER.filter((p) => config?.auth.socialProviders.includes(p));
  if (enabled.length === 0) return null;

  async function start(provider: SocialProvider) {
    setBusy(provider);
    setErr(undefined);
    const code = referralCode?.trim().toUpperCase();
    const res = await api.POST('/auth/social/{provider}/authorize', {
      params: { path: { provider } },
      body: {
        redirectUri: `${window.location.origin}${href(locale, `/auth/${provider}/callback`)}`,
        referralCode: code || null,
        codeChallenge: null,
        codeChallengeMethod: null,
      },
    });
    if (res.error) {
      setBusy(undefined);
      const e = res.error as ApiErrorBody;
      return setErr(e.details?.fields?.[0]?.message ?? e.message);
    }
    try {
      if (next) sessionStorage.setItem(SOCIAL_NEXT_KEY, next);
      else sessionStorage.removeItem(SOCIAL_NEXT_KEY);
    } catch {
      // Storage blocked: the callback falls back to the account page.
    }
    window.location.assign(res.data.authorizationUrl);
  }

  return (
    <>
      <div className="auth-divider">
        <span>{t('t_or')}</span>
      </div>
      {err && <Alert kind="error">{err}</Alert>}
      <div className="auth-social">
        {enabled.map((p) => (
          <button
            key={p}
            type="button"
            className="auth-social-button"
            data-provider={p}
            disabled={!!busy}
            aria-busy={busy === p}
            onClick={() => void start(p)}
          >
            <SocialIcon provider={p} />
            {t('t_continue_with_provider', { provider: t(`t_${p}`) })}
          </button>
        ))}
      </div>
    </>
  );
}
