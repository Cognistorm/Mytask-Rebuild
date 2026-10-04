// Freelancers list `/sellers` (spec 03 AC-27, R-S6; legacy `sellers.blade.php`): title `t_top_sellers`, subtitle
// `t_hire_our_best_sellers`, 40 freelancer cards per page in the daily mix order of listSellers, numbered pages.
import type { Metadata } from 'next';
import type { components } from '@mytask/types';
import { pageParam, SellerList } from '../../../../components/catalog/seller-list';
import { viewerApi } from '../../../../lib/api';
import { href } from '../../../../lib/href';
import { getT, toLocale } from '../../../../lib/i18n';
import { pageTitle } from '../../../../lib/page-title';
import { alternates } from '../../../../lib/seo';

type SellerCard = components['schemas']['SellerCard'];
type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const PAGE_SIZE = 40;

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const [t, page] = await Promise.all([getT(locale), searchParams.then(pageParam)]);
  return {
    title: await pageTitle(locale, t('t_top_sellers')),
    alternates: alternates(locale, '/sellers', page),
  };
}

export default async function SellersPage({ params, searchParams }: Params) {
  const locale = toLocale((await params).locale);
  const [t, page] = await Promise.all([getT(locale), searchParams.then(pageParam)]);
  const { api, hasSession } = await viewerApi(locale);
  const { data } = await api
    .GET('/sellers', { params: { query: { page, limit: PAGE_SIZE } } })
    .catch(() => ({ data: undefined }));
  if (!data) throw new Error('listSellers failed');
  return (
    <main className="mt-catalog-page" data-testid="sellers-page">
      <h1 className="mt-catalog-title">{t('t_top_sellers')}</h1>
      <p className="mt-catalog-subtitle">{t('t_hire_our_best_sellers')}</p>
      <SellerList
        locale={locale}
        t={t}
        sellers={data.data as SellerCard[]}
        total={data.totalCount ?? 0}
        pageSize={PAGE_SIZE}
        page={page}
        basePath={href(locale, '/sellers')}
        guest={!hasSession}
        label={t('t_top_sellers')}
      />
    </main>
  );
}
