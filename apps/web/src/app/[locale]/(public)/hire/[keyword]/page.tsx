// `/hire/{keyword}` (spec 03 AC-28, AC-29; url-map §3): when a user skill has exactly this slug, the title
// `t_hire_the_best_skill_name_experts`, the subtitle and 42 freelancer cards per page; otherwise a temporary
// redirect to `/search?q={keyword, + for spaces}` (Next.js answers 307 from a page; url-map says 302, both
// temporary for a GET).
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { pageParam, SellerList } from '../../../../../components/catalog/seller-list';
import { viewerApi } from '../../../../../lib/api';
import { decodeSegment, href } from '../../../../../lib/href';
import { getT, toLocale } from '../../../../../lib/i18n';
import { pageTitle } from '../../../../../lib/page-title';
import { alternates } from '../../../../../lib/seo';

type SellerCard = components['schemas']['SellerCard'];
type Params = {
  params: Promise<{ locale: string; keyword: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const PAGE_SIZE = 42;

const load = cache(async (locale: Locale, keyword: string, page: number) => {
  if (keyword === '' || keyword.length > 100) notFound();
  const { api, hasSession } = await viewerApi(locale);
  const { data, response } = await api.GET('/hire/{keyword}', {
    params: { path: { keyword }, query: { page, limit: PAGE_SIZE } },
  });
  if (response.status === 404) {
    redirect(`${href(locale, '/search')}?q=${encodeURIComponent(keyword).replace(/%20/g, '+')}`);
  }
  if (!data) throw new Error(`listHireSellers ${response.status}`);
  return { data, guest: !hasSession };
});

async function resolve({ params, searchParams }: Params) {
  const { locale: raw, keyword } = await params;
  const locale = toLocale(raw);
  const page = pageParam(await searchParams);
  const decoded = decodeSegment(keyword);
  return { locale, page, keyword: decoded, ...(await load(locale, decoded, page)) };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { locale, page, keyword, data } = await resolve(props);
  const t = await getT(locale);
  return {
    title: await pageTitle(
      locale,
      t('t_hire_the_best_skill_name_experts', { skill: data.skill.name }),
    ),
    alternates: alternates(locale, `/hire/${encodeURIComponent(keyword)}`, page),
  };
}

export default async function HirePage(props: Params) {
  const { locale, page, keyword, data, guest } = await resolve(props);
  const t = await getT(locale);
  const title = t('t_hire_the_best_skill_name_experts', { skill: data.skill.name });
  return (
    <main className="mt-catalog-page" data-testid="hire-page">
      <h1 className="mt-catalog-title">{title}</h1>
      <p className="mt-catalog-subtitle">
        {t('t_hire_the_best_skill_name_experts_subtitle', { skill: data.skill.name })}
      </p>
      <SellerList
        locale={locale}
        t={t}
        sellers={data.data as SellerCard[]}
        total={data.totalCount ?? 0}
        pageSize={PAGE_SIZE}
        page={page}
        basePath={href(locale, `/hire/${encodeURIComponent(keyword)}`)}
        guest={guest}
        label={title}
      />
    </main>
  );
}
