// `https://…/app-return/auth/{provider}` (url-map §7). On Android the App Link also reaches the router, but
// the code is handled by the auth session that the login screen is waiting on (lib/social.ts), so this
// screen only steps back. Opened on its own (no waiting login screen, e.g. the app was restarted) the
// one-time code is useless without the in-memory PKCE verifier: go to login. It never sends the code.
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function SocialReturn() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  }, []);
  return null;
}
