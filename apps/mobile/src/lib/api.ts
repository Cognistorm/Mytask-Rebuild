// Mobile API access (ADR-002 §2): Bearer tokens kept in SecureStore (Keychain / Keystore), refreshed by
// @mytask/api-client, and a device token that makes this installation a "trusted device" after 2FA.
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient, type Locale } from '@mytask/api-client';
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
  if (session.accessToken) await SecureStore.setItemAsync(KEYS.access, session.accessToken);
  if (session.refreshToken) await SecureStore.setItemAsync(KEYS.refresh, session.refreshToken);
  if (session.deviceToken) await SecureStore.setItemAsync(KEYS.device, session.deviceToken);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
  // The device token stays: it is what keeps this phone "trusted" for 2FA (spec 01 AC-24).
}

export const getDeviceToken = () => SecureStore.getItemAsync(KEYS.device);

export function mobileApi(locale: Locale) {
  return createApiClient({
    baseUrl,
    client: Platform.OS === 'ios' ? 'ios' : 'android',
    locale,
    getAccessToken: () => accessToken,
    refresh: {
      getRefreshToken: () => SecureStore.getItemAsync(KEYS.refresh),
      onSession: saveSession,
      onSignedOut: () => void clearSession(),
    },
  });
}
