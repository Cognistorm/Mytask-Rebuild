// Category pages at 3 levels (spec 03 AC-3, AC-4, AC-37; url-map §3, §8): `/categories/{c}[/{s}[/{child}]]`.
// lookupCategory → 404 for an unknown slug, a lower level outside its parent or more than 3 levels; then the
// title, the breadcrumb, the staff SEO texts above and below the list (sanitised by the API, CONVENTIONS §19)
// with the Georgian-fallback note on /en when they are shown in Georgian, and the gig list of that node.
// Renamed categories answer 404 until `resolveRedirect` (4.16.6) turns old slugs into 301s.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Breadcrumb, categoryThemeProps } from '@mytask/ui/web';
import Link from 'next/link';
import { GigList } from '../../../../../components/catalog/gig-list';
import { viewerApi } from '../../../../../lib/api';
import { categoryHref } from '../../../../../lib/category-nav';
import { decodeSegment, href } from '../../../../../lib/href';
import { getT, toLocale } from '../../../../../lib/i18n';
import { parseListQuery, searchGigsQuery } from '../../../../../lib/list-query';
import { pageTitle } from '../../../../../lib/page-title';
import { alternates } from '../../../../../lib/seo';

type CategoryDetail = components['schemas']['CategoryDetail'];
type Params = {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadCategory = cache(async (locale: Locale, path: string[]): Promise<CategoryDetail> => {
  if (path.length > 3) notFound();
  const { api } = await viewerApi(locale);
  const { data, response } = await api.GET('/categories/lookup', {
    params: { query: { path: path.join('/') } },
  });
  if (response.status === 404 || response.status === 400) notFound();
  if (!data) throw new Error(`lookupCategory ${response.status}`);
  return data;
});

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { locale: raw, path } = await params;
  const locale = toLocale(raw);
  const [category, query] = await Promise.all([
    loadCategory(locale, path.map(decodeSegment)),
    searchParams.then(parseListQuery),
  ]);
  return {
    title: await pageTitle(locale, category.name),
    description: category.description ?? undefined,
    alternates: alternates(locale, `/categories/${category.path}`, query.page),
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { locale: raw, path } = await params;
  const locale = toLocale(raw);
  const [t, category, query] = await Promise.all([
    getT(locale),
    loadCategory(locale, path.map(decodeSegment)),
    searchParams.then(parseListQuery),
  ]);
  const { api } = await viewerApi(locale);
  const { data: result } = await api
    .GET('/search/gigs', { params: { query: searchGigsQuery(query, category.id) } })
    .catch(() => ({ data: undefined }));

  // AC-4: the note only where body content is shown in Georgian on the English page.
  const georgianBody =
    locale === 'en' &&
    category.contentLocale === 'ka' &&
    Boolean(category.contentTop || category.contentBottom || category.description);
  let crumbPath = '';
  const crumbs = [
    { label: t('t_home'), href: href(locale, '/') },
    ...category.breadcrumb.map((c) => {
      crumbPath = crumbPath ? `${crumbPath}/${c.slug}` : c.slug;
      return {
        label: c.name,
        href: categoryHref(locale, crumbPath),
        lang: c.contentLocale !== locale ? c.contentLocale : undefined,
      };
    }),
  ];
  const lang = category.contentLocale !== locale ? category.contentLocale : undefined;

  return (
    // The page carries its category colour (visual-refresh.md §8.5; every level has the top level's colour): the
    // title band, the breadcrumb chips and the current chips use it.
    <main
      className="mt-catalog-page"
      data-testid="category-page"
      {...categoryThemeProps(category.color)}
    >
      <Breadcrumb label={t('t_breadcrumb')} items={crumbs} Link={Link} />
      <h1 className="mt-catalog-title mt-catalog-band" lang={lang}>
        {category.name}
      </h1>
      {georgianBody && <p className="mt-catalog-note">{t('t_content_shown_in_georgian')}</p>}
      {category.contentTop && (
        <div
          className="mt-catalog-content"
          lang={lang}
          data-testid="content-top"
          dangerouslySetInnerHTML={{ __html: category.contentTop }}
        />
      )}
      <GigList
        locale={locale}
        t={t}
        basePath={categoryHref(locale, category.path)}
        query={query}
        result={result ?? null}
        keepKeyword={false}
        label={category.name}
      />
      {category.contentBottom && (
        <div
          className="mt-catalog-content mt-catalog-content-bottom"
          lang={lang}
          data-testid="content-bottom"
          dangerouslySetInnerHTML={{ __html: category.contentBottom }}
        />
      )}
    </main>
  );
}
