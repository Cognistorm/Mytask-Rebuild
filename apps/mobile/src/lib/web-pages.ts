// Web pages the app opens in the browser: the CMS pages of spec 17 (url-map §2 `/page/{slug}`), on APP_URL.
import Constants from 'expo-constants';
import { Linking } from 'react-native';

const appUrl = (
  (Constants.expoConfig?.extra as { appUrl?: string } | undefined)?.appUrl ?? 'https://mytask.ge'
).replace(/\/+$/, '');

export const PRIVACY_URL = `${appUrl}/page/privacy-policy`;
export const TERMS_URL = `${appUrl}/page/terms-of-service`;

export function openWebPage(url: string): void {
  void Linking.openURL(url);
}
