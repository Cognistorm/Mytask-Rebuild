// Social login in the app (spec 01 AC-30, AC-37…AC-41; ADR-002 §7, SEC-09). The app creates the PKCE pair
// itself and keeps the verifier in memory only; the API gets the S256 challenge at start and the verifier at
// the callback, so another app that catches the redirect (code + state) still cannot log in. The provider
// returns to the verified https App Link `{APP_URL}/app-return/auth/{provider}` (url-map §7), caught by the
// system auth session (ASWebAuthenticationSession / Custom Tabs) before any page loads.
import { buildCodeAsync } from 'expo-auth-session/build/PKCE';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import type { Locale } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { getDeviceToken, mobileApi, saveSession } from './api';
import { createT } from './i18n';
import type { SocialProvider } from './public-config';

export type TwoFactorChallenge = components['schemas']['TwoFactorChallenge'];

export type SocialResult =
  | { kind: 'signed-in' }
  | { kind: 'challenge'; challenge: TwoFactorChallenge }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/** Must equal the API's APP_URL: the API accepts only `{APP_URL}/app-return/auth/{provider}` from the apps. */
const appUrl =
  (Constants.expoConfig?.extra as { appUrl?: string } | undefined)?.appUrl ?? 'https://mytask.ge';

export const socialRedirectUri = (provider: SocialProvider) =>
  `${appUrl.replace(/\/+$/, '')}/app-return/auth/${provider}`;

export async function socialLogin(
  locale: Locale,
  provider: SocialProvider,
  referralCode?: string | null,
): Promise<SocialResult> {
  const api = mobileApi(locale);
  const t = createT(locale);
  const failed = (message?: string): SocialResult => ({
    kind: 'error',
    message: message ?? t('t_toast_something_went_wrong'),
  });

  const { codeVerifier, codeChallenge } = await buildCodeAsync();
  const redirectUri = socialRedirectUri(provider);
  const code = referralCode?.trim().toUpperCase();
  const start = await api.POST('/auth/social/{provider}/authorize', {
    params: { path: { provider } },
    body: {
      redirectUri,
      referralCode: code || null,
      codeChallenge,
      codeChallengeMethod: 'S256',
    },
  });
  if (start.error) {
    const e = start.error as { message: string; details?: { fields?: { message: string }[] } };
    return failed(e.details?.fields?.[0]?.message ?? e.message);
  }

  // iOS 17.4+ matches the https return by host + path (needs the associated domain); Android waits for the
  // App Link to reach the app. Closing the browser is a plain cancel: nothing to show.
  const result = await WebBrowser.openAuthSessionAsync(start.data.authorizationUrl, redirectUri, {
    preferUniversalLinks: true,
  });
  if (result.type !== 'success') return { kind: 'cancelled' };

  let back: URL;
  try {
    back = new URL(result.url);
  } catch {
    return failed();
  }
  const returned = back.searchParams;
  // Only our own return page, for the flow this button started; a provider error has no code.
  if (`${back.origin}${back.pathname}` !== redirectUri) return failed();
  const authCode = returned.get('code');
  const state = returned.get('state');
  if (!authCode || !state || state !== start.data.state) return failed();

  const res = await api.POST('/auth/social/{provider}/callback', {
    params: { path: { provider } },
    body: { code: authCode, state, codeVerifier, deviceToken: await getDeviceToken() },
  });
  if (res.error) return failed((res.error as { message: string }).message);
  if (res.response.status === 202) {
    return { kind: 'challenge', challenge: res.data as unknown as TwoFactorChallenge };
  }
  await saveSession(res.data as components['schemas']['AuthSession']);
  return { kind: 'signed-in' };
}
