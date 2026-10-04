// Public site footer (ROADMAP 4.2.9a; design 01-home.md, spec 17 AC-37): four columns of CMS pages (legacy
// `t_footer_column_1…4`, pages from listPages; a column without pages is left out, and until slice 16 serves
// the pages no column shows), then the logo, © and the language switch. Phones: one accordion per column.
import type { Locale } from '@mytask/i18n';
import { SiteIcon } from '@mytask/ui/web';
import { href } from '../../lib/href';
import { getT } from '../../lib/i18n';
import { getFooterPages, getServerPublicConfig, type PageLink } from '../../lib/site-data';
import { FooterLanguage } from './footer-language';

const COLUMNS = [1, 2, 3, 4] as const;

export async function SiteFooter({ locale }: { locale: Locale }) {
  const [t, pages, config] = await Promise.all([
    getT(locale),
    getFooterPages(locale),
    getServerPublicConfig(locale),
  ]);
  const columns = COLUMNS.map((n) => ({
    n,
    title: t(`t_footer_column_${n}`),
    pages: pages.filter((p) => p.footerColumn === n).sort((a, b) => a.position - b.position),
  })).filter((c) => c.pages.length > 0);
  const links = (list: PageLink[]) => (
    <ul>
      {list.map((p) => (
        <li key={p.id}>
          {/* External-link pages answer 302 from their own URL (spec 17 AC-7). */}
          <a href={href(locale, `/page/${p.slug}`)} lang={p.contentLocale}>
            {p.title}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <footer className="mt-site-footer" data-testid="site-footer">
      <div className="mt-site-footer-inner">
        {columns.length > 0 && (
          <div className="mt-site-footer-columns">
            <div className="mt-site-footer-accordion">
              {columns.map((c, i) => (
                <details key={c.n} open={i === 0}>
                  <summary>
                    {c.title}
                    <SiteIcon name="caret" size={14} />
                  </summary>
                  {links(c.pages)}
                </details>
              ))}
            </div>
            <div className="mt-site-footer-grid">
              {columns.map((c) => (
                <section key={c.n}>
                  <h2>{c.title}</h2>
                  {links(c.pages)}
                </section>
              ))}
            </div>
          </div>
        )}
        <div className="mt-site-footer-bottom">
          <a href={href(locale, '/')}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" />
          </a>
          <span>© {new Date().getFullYear()} MyTask.ge</span>
          {(config?.i18n.languageSwitcherEnabled ?? true) && (
            <FooterLanguage locale={locale} label={t('t_language')} />
          )}
        </div>
      </div>
    </footer>
  );
}
