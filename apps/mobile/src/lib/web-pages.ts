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

/** The public web address of a profile (shared through the native share sheet, spec 02 screens table). */
export const profileUrl = (username: string) => `${appUrl}/profile/${encodeURIComponent(username)}`;

/** The public web address of a portfolio item (url-map §4.3), shared through the native share sheet. */
export const portfolioItemUrl = (username: string, slug: string) =>
  `${profileUrl(username)}/portfolio/${encodeURIComponent(slug)}`;

/** The website's gig page (url-map §4.1); the app opens it until the gig screen exists (slice 3). */
export const gigUrl = (slug: string) => `${appUrl}/service/${encodeURIComponent(slug)}`;
