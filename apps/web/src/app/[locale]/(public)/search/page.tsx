// Search results (spec 03 AC-19…AC-23, AC-12; url-map §3, §8): `/search?q=…` with the filters and sort of the
// shared gig list. The keyword stays through filters, sort, pages and "Reset filter"; an empty keyword lists every
// listed gig (AC-20). `noindex, follow` with `/search` as canonical (internal search results).
import type { Metadata } from 'next';
import { GigList } from '../../../../components/catalog/gig-list';
import { viewerApi } from '../../../../lib/api';
import { href } from '../../../../lib/href';
import { getT, toLocale } from '../../../../lib/i18n';
import { parseListQuery, searchGigsQuery } from '../../../../lib/list-query';
import { pageTitle } from '../../../../lib/page-title';
import { alternates } from '../../../../lib/seo';

type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const [t, query] = await Promise.all([getT(locale), searchParams.then(parseListQuery)]);
  const heading = query.q ? t('t_search_results_for_q', { q: query.q }) : t('t_search');
  return {
    title: await pageTitle(locale, heading),
    robots: { index: false, follow: true },
    alternates: alternates(locale, '/search'),
  };
}

export default async function SearchPage({ params, searchParams }: Params) {
  const locale = toLocale((await params).locale);
  const [t, query] = await Promise.all([getT(locale), searchParams.then(parseListQuery)]);
  const { api } = await viewerApi(locale);
  const { data: result } = await api
    .GET('/search/gigs', { params: { query: searchGigsQuery(query) } })
    .catch(() => ({ data: undefined }));
  const heading = query.q ? t('t_search_results_for_q', { q: query.q }) : t('t_search');
  return (
    <main className="mt-catalog-page" data-testid="search-page">
      <h1 className="mt-catalog-title">{heading}</h1>
      <GigList
        locale={locale}
        t={t}
        basePath={href(locale, '/search')}
        query={query}
        result={result ?? null}
        keepKeyword
        label={heading}
      />
    </main>
  );
}
