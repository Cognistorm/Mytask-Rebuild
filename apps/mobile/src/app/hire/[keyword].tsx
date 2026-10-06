// `/hire/{keyword}` in the app (spec 03 AC-28, AC-29): when a user skill has exactly this slug, the title and
// subtitle with the skill name and 42 freelancers per load; otherwise the Explore search for the keyword (the web
// redirects to `/search?q=`).
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { SellerResults } from '../../components/catalog';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { Canvas } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type SellerCard = components['schemas']['SellerCard'];

export default function HireScreen() {
  const { keyword } = useLocalSearchParams<{ keyword: string }>();
  const [skill, setSkill] = useState<string | null>(null);
  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const res = await api
        .GET('/hire/{keyword}', {
          params: { path: { keyword }, query: { limit: 42, ...(cursor ? { cursor } : {}) } },
        })
        .catch(() => undefined);
      if (res?.response.status === 404) {
        router.replace({ pathname: '/explore', params: { q: keyword } });
        return { data: [], nextCursor: null };
      }
      if (!res?.data) return null;
      setSkill(res.data.skill.name);
      return { data: res.data.data as SellerCard[], nextCursor: res.data.nextCursor };
    },
    [keyword],
  );
  return (
    <Canvas>
      <SafeAreaView style={s.screen} edges={['top']}>
        <SellerResults
          t={t}
          fetchPage={fetchPage}
          testID="hire"
          header={
            skill ? (
              <View style={s.head}>
                <Text style={s.title} accessibilityRole="header">
                  {t('t_hire_the_best_skill_name_experts', { skill })}
                </Text>
                <Text style={s.sub}>
                  {t('t_hire_the_best_skill_name_experts_subtitle', { skill })}
                </Text>
              </View>
            ) : undefined
          }
        />
      </SafeAreaView>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { gap: theme.space[2], marginBottom: theme.space[4] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  sub: { ...theme.text.body, color: theme.colors.text.secondary },
});
