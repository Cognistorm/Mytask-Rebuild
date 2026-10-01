import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { onUpdateRequired } from '../lib/api';
import { StatusBar } from 'expo-status-bar';
import { lightTheme } from '@mytask/tokens/native';

// FiraGO (full Mkhedruli support, CLAUDE.md) — the family names match packages/tokens `fonts`.
export default function RootLayout() {
  const [loaded] = useFonts({
    'FiraGO-Regular': require('../../../../packages/assets/fonts/ttf/FiraGO-Regular.ttf'),
    'FiraGO-Medium': require('../../../../packages/assets/fonts/ttf/FiraGO-Medium.ttf'),
    'FiraGO-SemiBold': require('../../../../packages/assets/fonts/ttf/FiraGO-SemiBold.ttf'),
    'FiraGO-Bold': require('../../../../packages/assets/fonts/ttf/FiraGO-Bold.ttf'),
  });
  useEffect(() => onUpdateRequired(() => router.replace('/update')), []);
  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: lightTheme.colors.bg.canvas },
        }}
      />
    </>
  );
}
