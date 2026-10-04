// Server half of the public header (ROADMAP 4.2.9a): loads the category tree, the public config and the visitor,
// then hands plain data to the client header. Rendered by the `(public)` root layout on every public page.
import { cookies } from 'next/headers';
import type { Locale } from '@mytask/i18n';
import { toNavNodes } from '../../lib/category-nav';
import { getCategoryTree, getServerPublicConfig, getViewer } from '../../lib/site-data';
import { effectiveChoice, getAppearance, THEME_COOKIE } from '../../lib/theme';
import { SiteHeaderClient } from './header-client';

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [tree, config, { viewer, mayHaveSession }, jar, appearance] = await Promise.all([
    getCategoryTree(locale),
    getServerPublicConfig(locale),
    getViewer(locale),
    cookies(),
    getAppearance(),
  ]);
  return (
    <SiteHeaderClient
      locale={locale}
      categories={toNavNodes(locale, tree)}
      viewer={viewer}
      mayHaveSession={mayHaveSession}
      config={config}
      theme={effectiveChoice(jar.get(THEME_COOKIE)?.value, appearance)}
    />
  );
}
