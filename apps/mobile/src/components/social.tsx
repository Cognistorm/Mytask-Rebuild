// Spec 01 AC-37, AC-38: one button per provider that is ON with saved keys (`PublicConfig.auth.socialProviders`),
// under an "or" divider, in the legacy order — the same entry point as the web (components.md AuthLayout).
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { Locale } from '@mytask/api-client';
import { createT } from '../lib/i18n';
import { usePublicConfig, type SocialProvider } from '../lib/public-config';
import { socialLogin, type TwoFactorChallenge } from '../lib/social';
import { Notice } from './form';
import { Gradient, usePressLayer } from '../ui';
import { SocialIcon } from './social-icons';

/** Legacy button order (`livewire/main/auth/login.blade.php`). */
const ORDER: SocialProvider[] = ['facebook', 'google', 'github', 'twitter', 'linkedin'];

export function SocialButtons({
  locale,
  referralCode,
  onSignedIn,
  onChallenge,
}: {
  locale: Locale;
  referralCode?: string | null;
  onSignedIn: () => void;
  onChallenge: (challenge: TwoFactorChallenge) => void;
}) {
  const t = createT(locale);
  const config = usePublicConfig(locale);
  const [busy, setBusy] = useState<SocialProvider>();
  const [error, setError] = useState<string>();

  const enabled = ORDER.filter((p) => config?.auth.socialProviders.includes(p));
  if (enabled.length === 0) return null;

  async function start(provider: SocialProvider) {
    setBusy(provider);
    setError(undefined);
    const result = await socialLogin(locale, provider, referralCode).catch(() => ({
      kind: 'error' as const,
      message: t('t_toast_something_went_wrong'),
    }));
    setBusy(undefined);
    if (result.kind === 'signed-in') onSignedIn();
    else if (result.kind === 'challenge') onChallenge(result.challenge);
    else if (result.kind === 'error') setError(result.message);
  }

  return (
    <>
      <View style={s.divider}>
        <View style={s.rule} />
        <Text style={s.or}>{t('t_or')}</Text>
        <View style={s.rule} />
      </View>
      {error ? <Notice kind="error" text={error} /> : null}
      {enabled.map((p) => {
        const label = t('t_continue_with_provider', { provider: t(`t_${p}`) });
        return (
          <SocialButton
            key={p}
            testID={`social-${p}`}
            off={!!busy}
            onPress={() => void start(p)}
            accessibilityLabel={label}
            accessibilityState={{ busy: busy === p, disabled: !!busy }}
          >
            {busy === p ? (
              <ActivityIndicator color={theme.colors.action.onDisabled} />
            ) : (
              <SocialIcon provider={p} />
            )}
            <Text style={[s.label, busy ? s.labelDisabled : null]}>{label}</Text>
          </SocialButton>
        );
      })}
    </>
  );
}

/**
 * The Secondary button look (3X, as the web `.auth-social-button`): a border, the Secondary gradient and the pressed
 * gradient fading in; flat while another sign-in is on its way.
 */
function SocialButton(props: {
  off: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState: { busy: boolean; disabled: boolean };
  testID: string;
  children: React.ReactNode;
}) {
  const layer = usePressLayer();
  return (
    <Pressable
      testID={props.testID}
      style={[s.button, props.off ? s.disabled : theme.shadow.control]}
      onPress={props.onPress}
      onPressIn={layer.pressIn}
      onPressOut={layer.pressOut}
      disabled={props.off}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={props.accessibilityState}
    >
      {props.off ? null : (
        <>
          <Gradient token={theme.gradient.action.secondary} fill style={s.fill} />
          <Animated.View style={[StyleSheet.absoluteFill, layer.style]} pointerEvents="none">
            <Gradient token={theme.gradient.action.secondaryHover} fill style={s.fill} />
          </Animated.View>
        </>
      )}
      {props.children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  rule: {
    flex: 1,
    borderTopWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
  },
  or: { ...theme.text.bodySm, color: theme.colors.text.muted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[2],
    minHeight: theme.size.touchTarget.min,
    paddingVertical: theme.space[2],
    paddingHorizontal: theme.space[3],
    borderRadius: theme.radius.control,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.action.secondary,
  },
  fill: { borderRadius: theme.radius.control - theme.borderWidth.hairline },
  disabled: {
    backgroundColor: theme.colors.action.disabled,
    borderColor: theme.colors.border.default,
  },
  label: { ...theme.text.label, color: theme.colors.action.onSecondary },
  labelDisabled: { color: theme.colors.action.onDisabled },
});
