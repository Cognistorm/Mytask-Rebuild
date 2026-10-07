// Create a new gig `/create` (spec 04 AC-1…AC-19; url-map: login required, `noindex`; screen 03). A private page
// (strict CSP, no custom code) that still carries the site header and footer, as the legacy main-site page did.
// The category tree comes from the same cached call as the header (listCategories).
import type { Metadata } from 'next';
import { GigWizard } from '../../../../components/gig-wizard/gig-wizard';
import { SiteFooter } from '../../../../components/site/site-footer';
import { SiteHeader } from '../../../../components/site/site-header';
import { getT, toLocale } from '../../../../lib/i18n';
import { pageTitle } from '../../../../lib/page-title';
import { getCategoryTree } from '../../../../lib/site-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getT(locale);
  return {
    title: await pageTitle(locale, t('t_create_new_gig')),
    robots: { index: false, follow: false },
  };
}

export default async function CreateGigPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const [t, categories] = await Promise.all([getT(locale), getCategoryTree(locale)]);
  return (
    <>
      <a className="mt-skip-link" href="#mt-content">
        {t('t_skip_to_content')}
      </a>
      <SiteHeader locale={locale} />
      <main id="mt-content" tabIndex={-1}>
        <GigWizard categories={categories} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
