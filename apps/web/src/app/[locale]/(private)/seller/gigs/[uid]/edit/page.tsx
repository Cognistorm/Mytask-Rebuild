// Edit an own gig `/seller/gigs/{uid}/edit` (spec 04 AC-18, AC-21…AC-25; url-map §5: login required, `noindex`;
// screen 03 "Edit mode uses the same page"): the wizard page of `/create` with the site header and footer, loaded
// with the stored gig.
import type { Metadata } from 'next';
import { GigEditor } from '../../../../../../../components/gig-wizard/gig-wizard';
import { SiteFooter } from '../../../../../../../components/site/site-footer';
import { SiteHeader } from '../../../../../../../components/site/site-header';
import { getT, toLocale } from '../../../../../../../lib/i18n';
import { pageTitle } from '../../../../../../../lib/page-title';
import { getCategoryTree } from '../../../../../../../lib/site-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getT(locale);
  return {
    title: await pageTitle(locale, t('t_edit_gig')),
    robots: { index: false, follow: false },
  };
}

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ locale: string; uid: string }>;
}) {
  const { locale: raw, uid } = await params;
  const locale = toLocale(raw);
  const [t, categories] = await Promise.all([getT(locale), getCategoryTree(locale)]);
  return (
    <>
      <a className="mt-skip-link" href="#mt-content">
        {t('t_skip_to_content')}
      </a>
      <SiteHeader locale={locale} />
      <main id="mt-content" tabIndex={-1}>
        <GigEditor categories={categories} uid={uid} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
