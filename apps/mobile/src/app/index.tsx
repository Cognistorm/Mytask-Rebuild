// Phase 3 placeholder home: proves tokens, fonts, i18n and the generated API client on a device.
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import { mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

export default function Home() {
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .GET('/health', { signal: AbortSignal.timeout(3000) })
      .then(({ data }) => setApiUp(data?.status === 'ok'))
      .catch(() => setApiUp(false));
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Image
          source={require('../../../../packages/assets/logo/mytask-logo-wordmark-trimmed.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="MyTask.ge"
        />
        <Text style={styles.title} accessibilityRole="header">
          {t('t_home')}
        </Text>
        {apiUp !== null && (
          <Text testID="api-status" style={apiUp ? styles.ok : styles.down}>
            {t(apiUp ? 't_platform_api_status_ok' : 't_platform_api_status_unreachable')}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[4] },
  logo: { height: 40, width: 160 },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  ok: { ...theme.text.body, color: theme.colors.text.success },
  down: { ...theme.text.body, color: theme.colors.text.danger },
});
