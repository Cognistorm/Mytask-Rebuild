import type { ExpoConfig } from 'expo/config';

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
  plugins: ['expo-router', 'expo-font'],
  experiments: { typedRoutes: true },
  extra: {
    // Where the app finds the API. Locally: http://<computer LAN IP>:3000/api/v1 (docs/SETUP-LOCAL.md).
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  },
};

export default config;
