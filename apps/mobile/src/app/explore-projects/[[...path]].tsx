// Explore projects in the app (spec 03 AC-32…AC-34): root, `/{category}` and `/{category}/{skill}`. A search field,
// "Popular:" chips (project categories at the root, the category's skills inside one) and "Latest projects" (40 per
// load, newest first). Projects arrive in slice 9, so the list is empty until then; the row design comes with it.
// S-075 OFF (API 403) → the "feature disabled" state; unknown category or a skill outside it → "not found".
// 3X look (3X.17b, visual-refresh.md §8.5, Q-171): the canvas, the search field in the input frame, "Popular:" chips
// in their linked top-level category's colour (brand without a link; skills take their project category's colour).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { EmptyState } from '../../components/dashboard';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { Canvas, CategoryChip, InputFrame } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type ProjectCategory = components['schemas']['ProjectCategory'];
type SkillSummary = components['schemas']['SkillSummary'];
type SearchProjectCard = components['schemas']['SearchProjectCard'];

type Chip = { label: string; path: string[]; current: boolean; color: string | null };

type State =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      category: ProjectCategory | null;
      skill: SkillSummary | null;
      chips: Chip[];
      projects: SearchProjectCard[];
    };

async function fetchState(path: string[], q: string): Promise<State> {
  let category: ProjectCategory | null = null;
  let skill: SkillSummary | null = null;
  let chips: Chip[];
  if (path.length > 2) return { kind: 'not-found' };
  if (path.length) {
    const res = await api.GET('/project-categories/lookup', {
      params: { query: { slug: path[0]!, ...(path[1] ? { skillSlug: path[1] } : {}) } },
    });
    if (res.response.status === 403) return { kind: 'disabled' };
    if (res.response.status === 404 || res.response.status === 400) return { kind: 'not-found' };
    if (!res.data) return { kind: 'error' };
    category = res.data.projectCategory;
    skill = res.data.skill;
    chips = category.skills.map((x) => ({
      label: x.name,
      path: [category!.slug, x.slug],
      current: x.id === skill?.id,
      color: category!.color,
    }));
  } else {
    const res = await api.GET('/project-categories');
    chips = (res.data?.projectCategories ?? []).map((c) => ({
      label: c.name,
      path: [c.slug],
      current: false,
      color: c.color,
    }));
  }
  const res = await api.GET('/search/projects', {
    params: {
      query: {
        ...(q ? { q } : {}),
        ...(category ? { projectCategoryId: category.id } : {}),
        ...(skill ? { skillId: skill.id } : {}),
        limit: 40,
      },
    },
  });
  if (res.response.status === 403) return { kind: 'disabled' };
  if (!res.data) return { kind: 'error' };
  return { kind: 'ready', category, skill, chips, projects: res.data.data as SearchProjectCard[] };
}

export default function ExploreProjectsScreen() {
  const params = useLocalSearchParams<{ path?: string[] | string }>();
  const path = (Array.isArray(params.path) ? params.path : params.path ? [params.path] : []).filter(
    Boolean,
  );
  const key = path.join('/');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    setState({ kind: 'loading' });
    void fetchState(key ? key.split('/') : [], q)
      .then(setState)
      .catch(() => setState({ kind: 'error' }));
  }, [key, q]);

  const title =
    state.kind === 'ready'
      ? (state.skill?.name ?? state.category?.name ?? t('t_explore_projects'))
      : t('t_explore_projects');

  return (
    <Canvas>
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {state.kind === 'loading' ? (
            <ActivityIndicator accessibilityLabel={t('t_ui_loading')} />
          ) : null}
          {state.kind === 'disabled' ? (
            <View testID="projects-disabled">
              <EmptyState title={t('t_feature_disabled')} />
            </View>
          ) : null}
          {state.kind === 'not-found' ? <Notice kind="info" text={t('t_page_not_fount')} /> : null}
          {state.kind === 'error' ? (
            <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          ) : null}
          {state.kind === 'ready' ? (
            <>
              <InputFrame focused={focused}>
                <TextInput
                  style={s.search}
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={() => setQ(text.trim().slice(0, 100))}
                  returnKeyType="search"
                  placeholder={t('t_type_something_to_search_in_projects')}
                  placeholderTextColor={theme.colors.text.muted}
                  accessibilityLabel={t('t_search')}
                />
              </InputFrame>
              {state.chips.length > 0 ? (
                <View style={s.chips} accessibilityLabel={t('t_popular_categories')}>
                  <Text style={s.popular}>{t('t_popular_categories')}</Text>
                  {state.chips.map((c) => (
                    <CategoryChip
                      key={c.path.join('/')}
                      label={c.label}
                      color={c.color}
                      selected={c.current}
                      onPress={() =>
                        router.push({
                          pathname: '/explore-projects/[[...path]]',
                          params: { path: c.path },
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}
              <Text style={s.section} accessibilityRole="header">
                {t('t_latest_projects')}
              </Text>
              {state.projects.length === 0 ? (
                <EmptyState title={t('t_no_projects_yet')} />
              ) : (
                // The project row (ProjectCard, spec 10) is built with slice 9; until then the API lists none.
                state.projects.map((p) => (
                  <Text key={p.project.id} style={s.row}>
                    {p.project.title}
                  </Text>
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[3] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  search: {
    ...theme.text.body,
    minHeight: theme.size.control.lg,
    paddingHorizontal: theme.space[4],
    color: theme.colors.text.primary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space[2] },
  popular: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  section: { ...theme.text.h3, color: theme.colors.text.primary, marginTop: theme.space[4] },
  row: { ...theme.text.body, color: theme.colors.text.primary },
});
