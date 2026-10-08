// Mobile API access (ADR-002 §2): Bearer tokens kept in SecureStore (Keychain / Keystore), refreshed by
// @mytask/api-client, and a device token that makes this installation a "trusted device" after 2FA.
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient, type ApiClient, type Locale } from '@mytask/api-client';
import type { components } from '@mytask/types';

type AuthSession = components['schemas']['AuthSession'];

const baseUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000/api/v1';

const KEYS = { access: 'mt_access', refresh: 'mt_refresh', device: 'mt_device' } as const;
let accessToken: string | null = null;

export async function loadSession(): Promise<boolean> {
  accessToken = await SecureStore.getItemAsync(KEYS.access);
  return !!(accessToken || (await SecureStore.getItemAsync(KEYS.refresh)));
}

export async function saveSession(session: AuthSession): Promise<void> {
  accessToken = session.accessToken;
  viewerName = null;
  if (session.accessToken) await SecureStore.setItemAsync(KEYS.access, session.accessToken);
  if (session.refreshToken) await SecureStore.setItemAsync(KEYS.refresh, session.refreshToken);
  if (session.deviceToken) await SecureStore.setItemAsync(KEYS.device, session.deviceToken);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  viewerName = null;
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
  // The device token stays: it is what keeps this phone "trusted" for 2FA (spec 01 AC-24).
}

let viewerName: Promise<string | null> | null = null;

/**
 * The signed-in username, null for a guest (gig card hearts, ROADMAP 4.3.20b: login message, none on own gigs). One
 * getMe per session; a new login or a logout asks again, and so does the next card after a network error.
 */
export function getViewerName(api: ApiClient): Promise<string | null> {
  viewerName ??= (async () => {
    if (!(await loadSession())) return null;
    const res = await api.GET('/me').catch(() => undefined);
    if (res?.data) return res.data.username;
    if (res?.response.status !== 401) viewerName = null;
    return null;
  })();
  return viewerName;
}

export const getDeviceToken = () => SecureStore.getItemAsync(KEYS.device);

/** The app shows its update screen when the API answers 426 (ADR-018). */
const updateListeners = new Set<() => void>();
export function onUpdateRequired(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

export function mobileApi(locale: Locale) {
  return createApiClient({
    baseUrl,
    client: Platform.OS === 'ios' ? 'ios' : 'android',
    locale,
    appVersion: Constants.expoConfig?.version,
    onUpdateRequired: () => updateListeners.forEach((l) => l()),
    getAccessToken: () => accessToken,
    refresh: {
      getRefreshToken: () => SecureStore.getItemAsync(KEYS.refresh),
      onSession: saveSession,
      onSignedOut: () => void clearSession(),
    },
  });
}
