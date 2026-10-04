// The gig list of `/search` and every category level (spec 03 AC-3, AC-8…AC-21): filter column, sort menu,
// result count, 42 cards per page with numbered pages (the page stays in the URL), the empty state with
// "Reset filter" and an error state with retry. Server-rendered; filters and sort are links/GET forms.
import Link from 'next/link';
import type { TFunction } from 'i18next';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Alert, EmptyState, GigCard, GigGrid, Pagination } from '@mytask/ui/web';
import { gigCardLabels, toGigCardData } from '../../lib/gig-card';
import { hasFilters, listSearch, PAGE_SIZE, type ListQuery } from '../../lib/list-query';
import { FilterPanel } from './filter-panel';
import { SortMenu } from './sort-menu';
import './catalog.css';

type GigCardPage = components['schemas']['GigCardPage'];
type GigCardItem = components['schemas']['GigCard'];

export function GigList(props: {
  locale: Locale;
  t: TFunction;
  /** The list URL without query, in the page language (`/en/categories/design`). */
  basePath: string;
  query: ListQuery;
  /** null = the API call failed. */
  result: GigCardPage | null;
  /** Search keeps the keyword through filters and "Reset filter". */
  keepKeyword: boolean;
  label: string;
}) {
  const { t, query, result, basePath } = props;
  const keyword = props.keepKeyword && query.q ? `?q=${encodeURIComponent(query.q)}` : '';
  const resetHref = hasFilters(query) ? `${basePath}${keyword}` : null;
  const total = result?.totalCount ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const labels = gigCardLabels(t);
  return (
    <div className="mt-list-layout">
      <FilterPanel
        locale={props.locale}
        action={basePath}
        query={query}
        keepKeyword={props.keepKeyword}
        resetHref={resetHref}
      />
      <section className="mt-list-results" aria-label={props.label}>
        <div className="mt-list-toolbar">
          <p className="mt-list-count" data-testid="result-count">
            {result ? t('t_n_results', { count: total }) : ''}
          </p>
          <SortMenu locale={props.locale} basePath={basePath} query={query} />
        </div>
        {query.priceError && <Alert kind="error">{t('t_min_price_greater_than_max')}</Alert>}
        {result === null ? (
          <div className="mt-list-error" data-testid="list-error">
            <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
            <a className="mt-button mt-button-secondary" href={`${basePath}${listSearch(query)}`}>
              {t('t_retry')}
            </a>
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            title={t('t_we_couldnt_find_anthing_search_term')}
            action={
              resetHref ? (
                <a className="mt-button mt-button-secondary" href={resetHref}>
                  {t('t_reset_filter')}
                </a>
              ) : undefined
            }
          />
        ) : (
          <GigGrid label={props.label}>
            {(result.data as GigCardItem[]).map((gig) => (
              <li key={gig.id}>
                <GigCard gig={toGigCardData(props.locale, gig)} labels={labels} Link={Link} />
              </li>
            ))}
          </GigGrid>
        )}
        <Pagination
          label={t('t_pagination')}
          previous={t('t_page_previous')}
          next={t('t_page_next')}
          pageLabel={(n) => t('t_page_n', { n })}
          current={query.page}
          total={pages}
          href={(n) => `${basePath}${listSearch(query, { page: n })}`}
          Link={Link}
        />
      </section>
    </div>
  );
}
