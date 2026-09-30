// Mobile form pieces on the shared tokens (components.md TextField, Button, Alert). Texts come from i18n.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Input(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  textContentType?:
    'emailAddress' | 'password' | 'newPassword' | 'username' | 'name' | 'oneTimeCode';
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{props.label}</Text>
      <TextInput
        style={[s.input, props.error ? s.inputError : null]}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={props.keyboardType ?? 'default'}
        textContentType={props.textContentType}
        accessibilityLabel={props.label}
      />
      {props.error ? (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      style={[s.button, busy ? s.buttonBusy : null]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.action.onPrimary} />
      ) : (
        <Text style={s.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      <Text style={s.link}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ kind, text }: { kind: 'error' | 'info' | 'success'; text: string }) {
  const f = theme.colors.feedback;
  const c = {
    error: { bg: f.dangerBg, border: f.dangerBorder, text: f.dangerText },
    info: { bg: f.infoBg, border: f.infoBorder, text: f.infoText },
    success: { bg: f.successBg, border: f.successBorder, text: f.successText },
  }[kind];
  return (
    <View
      style={[s.notice, { backgroundColor: c.bg, borderColor: c.border }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={{ ...theme.text.body, color: c.text }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[4] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  field: { gap: theme.space[1] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  input: {
    ...theme.text.body,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.bg.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radius.control,
    padding: theme.space[3],
  },
  inputError: { borderColor: theme.colors.border.danger },
  error: { ...theme.text.bodySm, color: theme.colors.text.danger },
  button: {
    backgroundColor: theme.colors.action.primary,
    borderRadius: theme.radius.control,
    padding: theme.space[3],
    alignItems: 'center',
  },
  buttonBusy: { backgroundColor: theme.colors.action.disabled },
  buttonText: { ...theme.text.label, color: theme.colors.action.onPrimary },
  link: { ...theme.text.body, color: theme.colors.text.link, textDecorationLine: 'underline' },
  notice: {
    borderWidth: theme.borderWidth.hairline,
    borderRadius: theme.radius.control,
    padding: theme.space[3],
  },
});
