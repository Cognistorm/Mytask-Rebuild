// Category screen at 3 levels (spec 03 AC-3, AC-4; screens table "same as search + title + breadcrumb"):
// lookupCategory (unknown or misplaced slug → "not found"), the path as a breadcrumb line, the title, the
// description and the Georgian-fallback note, then the gig results of that node (filters, sort, infinite scroll).
// The staff SEO texts are HTML for the website; the app shows the plain description only.
// 3X look (3X.17b, visual-refresh.md §8.5, as the web 3X.12): the canvas, the breadcrumb as tint chips in the
// category ink (earlier steps open their page), the title on a band of the category gradient, the description on the
// plain surface below.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { GigResults, openCategoryPath } from '../../components/catalog';
import { SecondaryButton } from '../../components/dashboard';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { Breadcrumb, Canvas, CategoryBand } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type CategoryDetail = components['schemas']['CategoryDetail'];

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ path: string[] | string }>();
  const path = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean).join('/');
  const [category, setCategory] = useState<CategoryDetail | 'not-found' | 'error' | null>(null);

  useEffect(() => {
    setCategory(null);
    void api
      .GET('/categories/lookup', { params: { query: { path } } })
      .then((res) => {
        if (res.data) return setCategory(res.data);
        const missing = res.response.status === 404 || res.response.status === 400;
        setCategory(missing ? 'not-found' : 'error');
      })
      .catch(() => setCategory('error'));
  }, [path]);

  if (category === null) {
    return (
      <Canvas>
        <SafeAreaView style={s.screen}>
          <ActivityIndicator style={s.pad} accessibilityLabel={t('t_ui_loading')} />
        </SafeAreaView>
      </Canvas>
    );
  }
  if (category === 'not-found' || category === 'error') {
    return (
      <Canvas>
        <SafeAreaView style={[s.screen, s.pad]} testID="category-not-found">
          <Notice
            kind={category === 'error' ? 'error' : 'info'}
            text={t(category === 'error' ? 't_toast_something_went_wrong' : 't_page_not_fount')}
          />
          <SecondaryButton
            label={t('t_go_back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </SafeAreaView>
      </Canvas>
    );
  }

  // AC-4: Georgian text on an English screen gets the note (the app UI is Georgian today, ADR-006).
  const georgian = locale !== 'ka' && category.contentLocale === 'ka' && !!category.description;
  const crumbs = [
    { label: t('t_home'), onPress: () => router.navigate('/') },
    ...category.breadcrumb.map((c, i, all) => ({
      label: c.name,
      onPress:
        i < all.length - 1
          ? () =>
              openCategoryPath(
                all
                  .slice(0, i + 1)
                  .map((x) => x.slug)
                  .join('/'),
              )
          : undefined,
    })),
  ];
  return (
    <Canvas>
      <SafeAreaView style={s.screen} edges={['top']}>
        <GigResults
          api={api}
          t={t}
          q=""
          categoryId={category.id}
          testID="category-results"
          header={
            <View style={s.head}>
              <Breadcrumb label={t('t_breadcrumb')} color={category.color} items={crumbs} />
              <CategoryBand title={category.name} color={category.color} />
              {category.description ? <Text style={s.desc}>{category.description}</Text> : null}
              {georgian ? <Text style={s.note}>{t('t_content_shown_in_georgian')}</Text> : null}
            </View>
          }
        />
      </SafeAreaView>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: theme.space[4], gap: theme.space[3] },
  head: { gap: theme.space[3], marginBottom: theme.space[4] },
  desc: { ...theme.text.body, color: theme.colors.text.secondary },
  note: { ...theme.text.caption, color: theme.colors.text.muted },
});
