// Explore projects (spec 03 AC-32…AC-34; url-map §3): `/explore/projects` (+ `?q=`), `/explore/projects/{category}`
// and `/explore/projects/{category}/{skill}`. A search bar, "Popular:" chips (project categories, or the skills of
// the open category) and "Latest projects" (40 per page, newest first). Projects arrive in slice 9, so the list
// is empty until then. S-075 OFF → the "feature disabled" state (200, noindex; spec 00 AC-11), unknown category
// or a skill outside it → 404.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Breadcrumb, categoryThemeProps, EmptyState, Pagination } from '@mytask/ui/web';
import { pageParam } from '../../../../../../components/catalog/seller-list';
import { viewerApi } from '../../../../../../lib/api';
import { decodeSegment, href } from '../../../../../../lib/href';
import { getT, toLocale } from '../../../../../../lib/i18n';
import { pageTitle } from '../../../../../../lib/page-title';
import { alternates } from '../../../../../../lib/seo';
import '../../../../../../components/catalog/catalog.css';

type ProjectCategory = components['schemas']['ProjectCategory'];
type SkillSummary = components['schemas']['SkillSummary'];
type SearchProjectCard = components['schemas']['SearchProjectCard'];
type Params = {
  params: Promise<{ locale: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const PAGE_SIZE = 40;

/** A "Popular:" chip in its linked top-level category's colour (Q-171; null → brand). */
type Chip = { label: string; href: string; current: boolean; color: string | null };

type Loaded =
  | { disabled: true }
  | {
      disabled: false;
      category: ProjectCategory | null;
      skill: SkillSummary | null;
      chips: Chip[];
      projects: SearchProjectCard[];
      total: number;
    };

const load = cache(
  async (locale: Locale, path: string[], q: string, page: number): Promise<Loaded> => {
    if (path.length > 2) notFound();
    const { api } = await viewerApi(locale);
    let category: ProjectCategory | null = null;
    let skill: SkillSummary | null = null;
    let chips: Chip[];
    if (path.length) {
      const { data, response } = await api.GET('/project-categories/lookup', {
        params: { query: { slug: path[0]!, ...(path[1] ? { skillSlug: path[1] } : {}) } },
      });
      if (response.status === 403) return { disabled: true };
      if (response.status === 404 || response.status === 400) notFound();
      if (!data) throw new Error(`lookupProjectCategory ${response.status}`);
      category = data.projectCategory;
      skill = data.skill;
      chips = category.skills.map((s) => ({
        label: s.name,
        href: href(locale, `/explore/projects/${category!.slug}/${s.slug}`),
        current: s.id === skill?.id,
        color: category!.color,
      }));
    } else {
      const { data } = await api.GET('/project-categories');
      chips = (data?.projectCategories ?? []).map((c) => ({
        label: c.name,
        href: href(locale, `/explore/projects/${c.slug}`),
        current: false,
        color: c.color,
      }));
    }
    const { data, response } = await api.GET('/search/projects', {
      params: {
        query: {
          ...(q ? { q } : {}),
          ...(category ? { projectCategoryId: category.id } : {}),
          ...(skill ? { skillId: skill.id } : {}),
          page,
          limit: PAGE_SIZE,
        },
      },
    });
    if (response.status === 403) return { disabled: true };
    if (!data) throw new Error(`searchProjects ${response.status}`);
    return {
      disabled: false,
      category,
      skill,
      chips,
      projects: data.data as SearchProjectCard[],
      total: data.totalCount ?? 0,
    };
  },
);

async function resolve({ params, searchParams }: Params) {
  const { locale: raw, path = [] } = await params;
  const locale = toLocale(raw);
  const query = await searchParams;
  const q = (Array.isArray(query.q) ? query.q[0] : query.q)?.trim().slice(0, 100) ?? '';
  const page = pageParam(query);
  const segments = path.map(decodeSegment);
  return { locale, q, page, segments, loaded: await load(locale, segments, q, page) };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { locale, page, segments, loaded } = await resolve(props);
  const t = await getT(locale);
  if (loaded.disabled) {
    return { title: await pageTitle(locale, t('t_explore_projects')), robots: { index: false } };
  }
  const name = loaded.skill?.name ?? loaded.category?.name ?? t('t_explore_projects');
  return {
    title: await pageTitle(locale, name),
    description: loaded.category?.seoDescription ?? undefined,
    alternates: alternates(
      locale,
      `/explore/projects${segments.length ? `/${segments.join('/')}` : ''}`,
      page,
    ),
  };
}

export default async function ExploreProjectsPage(props: Params) {
  const { locale, q, page, loaded } = await resolve(props);
  const t = await getT(locale);
  const root = href(locale, '/explore/projects');
  if (loaded.disabled) {
    return (
      <main className="mt-catalog-page" data-testid="explore-projects-disabled">
        <h1 className="mt-catalog-title">{t('t_explore_projects')}</h1>
        <EmptyState title={t('t_feature_disabled')} />
      </main>
    );
  }
  const { category, skill } = loaded;
  const basePath = skill
    ? `${root}/${category!.slug}/${skill.slug}`
    : category
      ? `${root}/${category.slug}`
      : root;
  const crumbs = [
    { label: t('t_home'), href: href(locale, '/') },
    { label: t('t_explore_projects'), href: root },
    ...(category ? [{ label: category.name, href: `${root}/${category.slug}` }] : []),
    ...(skill ? [{ label: skill.name }] : []),
  ];
  const pageHref = (n: number) => {
    const s = new URLSearchParams();
    if (q) s.set('q', q);
    if (n > 1) s.set('page', String(n));
    const query = s.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  };
  return (
    <main className="mt-catalog-page" data-testid="explore-projects">
      {category && <Breadcrumb label={t('t_breadcrumb')} items={crumbs} Link={Link} />}
      <h1 className="mt-catalog-title">
        {skill?.name ?? category?.name ?? t('t_explore_projects')}
      </h1>
      {!category && (
        <p className="mt-catalog-subtitle">
          {t('t_complete_ur_most_pressing_work_with_project_catatlog')}
        </p>
      )}
      <form className="mt-explore-search" role="search" action={basePath} method="get">
        <label htmlFor="explore-q" className="mt-visually-hidden">
          {t('t_search')}
        </label>
        <input
          id="explore-q"
          type="search"
          name="q"
          maxLength={100}
          defaultValue={q}
          placeholder={t('t_type_something_to_search_in_projects')}
        />
        <button type="submit" className="mt-button mt-button-primary">
          {t('t_search')}
        </button>
      </form>
      {loaded.chips.length > 0 && (
        <ul className="mt-explore-chips" aria-label={t('t_popular_categories')}>
          <li aria-hidden="true">{t('t_popular_categories')}</li>
          {loaded.chips.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="mt-chip mt-chip-category"
                aria-current={c.current ? 'page' : undefined}
                {...categoryThemeProps(c.color)}
              >
                <span className="mt-cat-dot" aria-hidden="true" />
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="latest-projects">
        <h2 id="latest-projects" className="mt-catalog-section-title">
          {t('t_latest_projects')}
        </h2>
        {loaded.projects.length === 0 ? (
          <EmptyState title={t('t_no_projects_yet')} />
        ) : (
          // The project row (ProjectCard, spec 10) is built with slice 9; until then the API lists none.
          <ul data-testid="project-list">
            {loaded.projects.map((p) => (
              <li key={p.project.id}>{p.project.title}</li>
            ))}
          </ul>
        )}
        <Pagination
          label={t('t_pagination')}
          previous={t('t_page_previous')}
          next={t('t_page_next')}
          pageLabel={(n) => t('t_page_n', { n })}
          current={page}
          total={Math.ceil(loaded.total / PAGE_SIZE)}
          href={pageHref}
          Link={Link}
        />
      </section>
    </main>
  );
}
