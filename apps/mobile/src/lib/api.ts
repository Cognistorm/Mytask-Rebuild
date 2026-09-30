import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createApiClient, type Locale } from '@mytask/api-client';

const baseUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000/api/v1';

/** Mobile uses Bearer tokens from SecureStore (added with slice 01), never cookies (ADR-002). */
export function mobileApi(locale: Locale) {
  return createApiClient({
    baseUrl,
    client: Platform.OS === 'ios' ? 'ios' : 'android',
    locale,
  });
}
