// Incoming links (App Links, `mytask://`, Expo dev URLs) before Expo Router matches them. Emails carry the
// recipient's language prefix (url-map §7.2: claims are "with and without /en"), the app's routes have none,
// so `/en` is dropped. The app's language does not come from the link.
const HTTP_LIKE = /^((?:https?|exps?):\/\/[^/?#]+(?:\/--)?)\/en(?=[/?#]|$)/i;
const APP_SCHEME = /^(mytask:\/\/)en(?:\/|(?=[?#])|$)/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return path.replace(HTTP_LIKE, '$1').replace(APP_SCHEME, '$1');
  } catch {
    return path;
  }
}
