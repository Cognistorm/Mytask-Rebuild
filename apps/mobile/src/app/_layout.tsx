import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
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
