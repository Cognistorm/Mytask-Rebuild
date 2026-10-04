// Explore tab (ROADMAP 4.2.14; spec 03 AC-8…AC-23 mobile; screens table "results list; filter button opens a
// full-screen sheet with a sticky Show results bar; sort as a bottom sheet"): a search field, then the gig results
// (42 per load, infinite scroll, pull to refresh). Opened from Home's search field (`focus=1`) or with a keyword
// (`q`). Until the category screen exists (4.2.15), Home opens a category here (`categoryId`, `title`).
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { GigResults } from '../../components/catalog';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    focus?: string;
    categoryId?: string;
    title?: string;
  }>();
  const [text, setText] = useState(params.q ?? '');
  const [q, setQ] = useState(params.q ?? '');
  const input = useRef<TextInput>(null);

  // A new keyword or "focus" from Home replaces the current search.
  useEffect(() => {
    if (params.q !== undefined) {
      setText(params.q);
      setQ(params.q);
    }
    if (params.focus) input.current?.focus();
  }, [params.q, params.focus]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <GigResults
        api={api}
        t={t}
        q={q}
        categoryId={params.categoryId}
        testID="explore-results"
        header={
          <View style={s.head}>
            <Text style={s.title} accessibilityRole="header">
              {q ? t('t_search_results_for_q', { q }) : (params.title ?? t('t_explore'))}
            </Text>
            <TextInput
              ref={input}
              style={s.search}
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              returnKeyType="search"
              maxLength={100}
              placeholder={t('t_what_service_are_u_looking_for_today')}
              placeholderTextColor={theme.colors.text.muted}
              accessibilityLabel={t('t_search')}
              testID="explore-search"
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  head: { gap: theme.space[3], marginBottom: theme.space[4] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  search: {
    ...theme.text.body,
    minHeight: theme.size.control.lg,
    paddingHorizontal: theme.space[4],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.surface,
    color: theme.colors.text.primary,
  },
});
