// Explore tab (ROADMAP 4.2.14; spec 03 AC-8…AC-23 mobile; screens table "results list; filter button opens a
// full-screen sheet with a sticky Show results bar; sort as a bottom sheet"): a search field, then the gig results
// (42 per load, infinite scroll, pull to refresh). Opened from Home's search field (`focus=1`) or with a keyword
// (`q`). "Categories" opens the category menu (4.2.15). 3X look (3X.17a): the page canvas and the search field in the
// §6.3 input look (brand border + soft glow while focused).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { GigResults } from '../../components/catalog';
import { Canvas, InputFrame } from '../../ui';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; focus?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [q, setQ] = useState(params.q ?? '');
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  // A new keyword or "focus" from Home replaces the current search.
  useEffect(() => {
    if (params.q !== undefined) {
      setText(params.q);
      setQ(params.q);
    }
    if (params.focus) input.current?.focus();
  }, [params.q, params.focus]);

  return (
    <Canvas>
      <SafeAreaView style={s.screen} edges={['top']}>
        <GigResults
          api={api}
          t={t}
          q={q}
          testID="explore-results"
          header={
            <View style={s.head}>
              <Text style={s.title} accessibilityRole="header">
                {q ? t('t_search_results_for_q', { q }) : t('t_explore')}
              </Text>
              <InputFrame focused={focused}>
                <TextInput
                  ref={input}
                  style={s.search}
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={() => setQ(text.trim())}
                  returnKeyType="search"
                  maxLength={100}
                  placeholder={t('t_what_service_are_u_looking_for_today')}
                  placeholderTextColor={theme.colors.text.muted}
                  accessibilityLabel={t('t_search')}
                  testID="explore-search"
                />
              </InputFrame>
              <Pressable
                onPress={() => router.push('/categories')}
                accessibilityRole="link"
                testID="open-categories"
              >
                <Text style={s.link}>{t('t_browse_categories')}</Text>
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { gap: theme.space[3], marginBottom: theme.space[4] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  link: { ...theme.text.label, color: theme.colors.text.link },
  search: {
    ...theme.text.body,
    minHeight: theme.size.control.lg,
    paddingHorizontal: theme.space[4],
    color: theme.colors.text.primary,
  },
});
