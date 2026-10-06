// Freelancers list (spec 03 AC-27, R-S6; legacy `/sellers`): title `t_top_sellers`, subtitle, 40 per load in the
// daily mix order (listSellers, `cursor`), infinite scroll; a skill chip opens `/hire/{slug}` (AC-30).
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { SellerResults } from '../components/catalog';
import { mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';
import { Canvas } from '../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type SellerCard = components['schemas']['SellerCard'];

export default function SellersScreen() {
  const fetchPage = useCallback(async (cursor: string | null) => {
    const res = await api
      .GET('/sellers', { params: { query: { limit: 40, ...(cursor ? { cursor } : {}) } } })
      .catch(() => undefined);
    return res?.data
      ? { data: res.data.data as SellerCard[], nextCursor: res.data.nextCursor }
      : null;
  }, []);
  return (
    <Canvas>
      <SafeAreaView style={s.screen} edges={['top']}>
        <SellerResults
          t={t}
          fetchPage={fetchPage}
          testID="sellers"
          header={
            <View style={s.head}>
              <Text style={s.title} accessibilityRole="header">
                {t('t_top_sellers')}
              </Text>
              <Text style={s.sub}>{t('t_hire_our_best_sellers')}</Text>
            </View>
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
