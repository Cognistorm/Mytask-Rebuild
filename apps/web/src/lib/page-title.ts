// Per-page `<title>` as on the live site (QA BUG-03): "<page> <separator> <site title>", e.g. "Login | MyTask",
// from S-111 branding (`siteTitle`, `titleSeparator`) of getPublicConfig; the register defaults when the API
// cannot be reached (e.g. at build time).
import 'server-only';
import type { Metadata } from 'next';
import { serverApi } from './api';
import { getT, toLocale } from './i18n';

export function titleMetadata(key: string) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const locale = toLocale((await params).locale);
    const t = await getT(locale);
    let site = 'MyTask';
    let separator = '|';
    try {
      const { data } = await serverApi(locale).GET('/config/public', {
        signal: AbortSignal.timeout(1500),
      });
      site = data?.branding?.siteTitle || site;
      separator = data?.branding?.titleSeparator || separator;
    } catch {
      // keep the defaults
    }
    return { title: `${t(key)} ${separator} ${site}` };
  };
}
