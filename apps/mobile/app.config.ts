import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExpoConfig } from 'expo/config';

// The monorepo keeps ONE .env at the root (docs/SETUP-LOCAL.md); Expo only reads apps/mobile/.env by itself.
const rootEnv = resolve(__dirname, '../../.env');
if ((!process.env.EXPO_PUBLIC_API_URL || !process.env.APP_URL) && existsSync(rootEnv))
  process.loadEnvFile(rootEnv);

// The web app's public URL. Social login returns to `{APP_URL}/app-return/auth/{provider}` (ADR-002 §7), which
// must be exactly what the API allows, so the app uses the same APP_URL as the API.
const appUrl = process.env.APP_URL || 'https://mytask.ge';
const appHost = new URL(appUrl).host;
// App Links / Universal Links for `/app-return/*` (url-map §7.2) and the reset and verification links, only over
// https. The verification files (`.well-known/apple-app-site-association`, `assetlinks.json`) need the store
// identifiers: Phase 6.
const appLinks = appUrl.startsWith('https://');

// Store identifiers (ios.bundleIdentifier, android.package) are set in Phase 6 with the Owner: they cannot
// be changed after the first store release.
const config: ExpoConfig = {
  name: 'MyTask.ge',
  slug: 'mytask',
  // Custom scheme for BOG returns and push (url-map.md §7).
  scheme: 'mytask',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android'],
  plugins: [
    'expo-router',
    'expo-font',
    'expo-web-browser',
    // Availability date (spec 02 screens table: bottom sheet with date picker).
    '@react-native-community/datetimepicker',
    // Appeal files (spec 01: "camera or files") and the avatar (spec 02 AC-16: camera or photo library). The
    // library opens the system photo picker, which needs no photo-library permission; no microphone.
    // Store-language texts for the prompt: Phase 6.
    [
      'expo-image-picker',
      {
        cameraPermission:
          'MyTask uses the camera for your profile photo and to photograph documents you attach.',
        photosPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  ios: appLinks ? { associatedDomains: [`applinks:${appHost}`] } : undefined,
  android: appLinks
    ? {
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            // The reset and verification emails' links open the app (spec 01 screens table).
            data: [
              '/app-return/',
              '/auth/password/update',
              '/en/auth/password/update',
              '/auth/verify',
              '/en/auth/verify',
            ].map((pathPrefix) => ({ scheme: 'https', host: appHost, pathPrefix })),
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      }
    : undefined,
  extra: {
    // Where the app finds the API. Locally: http://<computer LAN IP>:3000/api/v1 (docs/SETUP-LOCAL.md).
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    appUrl,
  },
};

export default config;
