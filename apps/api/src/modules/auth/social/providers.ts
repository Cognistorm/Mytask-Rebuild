// Social login provider adapters (ADR-002 §7): authorization URL, code exchange and profile for each provider.
// `trustsEmail` = the provider marks the shared email as verified (Q-156, Owner 2026-09-30): only Google,
// LinkedIn (OIDC `email_verified`) and GitHub (`verified` on /user/emails) may create or match an account.
// Facebook and X only log in through an existing `social_accounts` link.
import type { SocialProvider } from '../../../generated/prisma/client';

export interface ProviderProfile {
  id: string;
  /** Null when the provider shares no email, or one it does not mark verified. */
  verifiedEmail: string | null;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface ProviderKeys {
  clientId: string;
  clientSecret: string;
}

type Fetch = typeof fetch;

interface Adapter {
  trustsEmail: boolean;
  authorizeUrl: string;
  scope: string;
  token(
    f: Fetch,
    keys: ProviderKeys,
    code: string,
    redirectUri: string,
    verifier: string,
  ): Promise<string>;
  profile(f: Fetch, accessToken: string): Promise<ProviderProfile>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new SocialProviderError(`provider answered ${res.status}`);
  return (await res.json()) as T;
}

export class SocialProviderError extends Error {}

/** Standard form-encoded token request (RFC 6749 §4.1.3 + PKCE RFC 7636). */
function formToken(url: string, basicAuth = false): Adapter['token'] {
  return async (f, keys, code, redirectUri, verifier) => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: keys.clientId,
      ...(basicAuth ? {} : { client_secret: keys.clientSecret }),
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };
    if (basicAuth) {
      headers.Authorization = `Basic ${Buffer.from(`${keys.clientId}:${keys.clientSecret}`).toString('base64')}`;
    }
    const data = await json<{ access_token?: string }>(
      await f(url, { method: 'POST', headers, body }),
    );
    if (!data.access_token) throw new SocialProviderError('no access token');
    return data.access_token;
  };
}

const bearer = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
});

/** OpenID Connect userinfo (Google, LinkedIn): `email` counts only with `email_verified === true`. */
function oidcProfile(url: string): Adapter['profile'] {
  return async (f, token) => {
    const u = await json<{
      sub: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      given_name?: string;
      picture?: string;
    }>(await f(url, bearer(token)));
    const verified = u.email_verified === true || u.email_verified === 'true';
    return {
      id: String(u.sub),
      verifiedEmail: u.email && verified ? u.email : null,
      name: u.name ?? null,
      nickname: u.given_name ?? null,
      avatarUrl: u.picture ?? null,
    };
  };
}

export const PROVIDERS: Record<SocialProvider, Adapter> = {
  google: {
    trustsEmail: true,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    token: formToken('https://oauth2.googleapis.com/token'),
    profile: oidcProfile('https://openidconnect.googleapis.com/v1/userinfo'),
  },
  linkedin: {
    trustsEmail: true,
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'openid profile email',
    token: formToken('https://www.linkedin.com/oauth/v2/accessToken'),
    profile: oidcProfile('https://api.linkedin.com/v2/userinfo'),
  },
  github: {
    trustsEmail: true,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    scope: 'read:user user:email',
    token: formToken('https://github.com/login/oauth/access_token'),
    async profile(f, token) {
      const u = await json<{
        id: number;
        login: string;
        name: string | null;
        avatar_url: string | null;
      }>(await f('https://api.github.com/user', bearer(token)));
      const emails = await json<{ email: string; primary: boolean; verified: boolean }[]>(
        await f('https://api.github.com/user/emails', bearer(token)),
      );
      const primary = emails.find((e) => e.primary && e.verified);
      return {
        id: String(u.id),
        verifiedEmail: primary?.email ?? null,
        name: u.name,
        nickname: u.login,
        avatarUrl: u.avatar_url,
      };
    },
  },
  facebook: {
    trustsEmail: false,
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'email public_profile',
    token: formToken('https://graph.facebook.com/v19.0/oauth/access_token'),
    async profile(f, token) {
      const u = await json<{ id: string; name?: string; picture?: { data?: { url?: string } } }>(
        await f('https://graph.facebook.com/v19.0/me?fields=id,name,picture', bearer(token)),
      );
      // Q-156: Facebook's email is never treated as verified, so it is not requested for matching.
      return {
        id: u.id,
        verifiedEmail: null,
        name: u.name ?? null,
        nickname: null,
        avatarUrl: u.picture?.data?.url ?? null,
      };
    },
  },
  twitter: {
    trustsEmail: false,
    authorizeUrl: 'https://x.com/i/oauth2/authorize',
    scope: 'users.read tweet.read',
    token: formToken('https://api.x.com/2/oauth2/token', true),
    async profile(f, token) {
      const { data } = await json<{
        data: { id: string; name?: string; username?: string; profile_image_url?: string };
      }>(await f('https://api.x.com/2/users/me?user.fields=profile_image_url', bearer(token)));
      return {
        id: data.id,
        verifiedEmail: null,
        name: data.name ?? null,
        nickname: data.username ?? null,
        avatarUrl: data.profile_image_url ?? null,
      };
    },
  },
};

export function authorizationUrl(
  provider: SocialProvider,
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const a = PROVIDERS[provider];
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: a.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${a.authorizeUrl}?${q.toString()}`;
}

/**
 * Legacy username rule (legacy/APP/app/Livewire/Main/Auth/Social/Google/CallbackComponent.php `username()`):
 * slug of the nickname, else of the name, lower-case with `_`; else `u` + 7 digits. The caller adds a
 * 4-character suffix when the name is taken.
 */
export function usernameFrom(profile: ProviderProfile, random: () => number = Math.random): string {
  const slug = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  // Contract username rule: 3–60 of [A-Za-z0-9_], not only digits; 55 leaves room for the `_xxxx` suffix.
  // Georgian-only names slug to nothing and fall back to `u` + 7 digits, as in legacy.
  let base = (slug(profile.nickname ?? '') || slug(profile.name ?? ''))
    .slice(0, 55)
    .replace(/_+$/, '');
  if (/^[0-9]+$/.test(base)) base = `u${base}`.slice(0, 55);
  return base.length >= 3 ? base : `u${1111111 + Math.floor(random() * 8888889)}`;
}
