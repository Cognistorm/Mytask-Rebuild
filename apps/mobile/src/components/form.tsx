// Mobile form pieces on the shared tokens (components.md TextField, Button, Alert). Texts come from i18n.
// 3X look: `Screen` on the page canvas, `Notice` on the native `Alert` (a success notice makes its card glow once,
// M-14) — 3X.17d; `Screen card` = the auth card (surface + 4 px brand strip, as the web `.auth-card`) and the text
// field in the §6.3 input frame (brand border + soft glow while focused, danger border with an error) — 3X.17e.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import {
  Alert,
  BrandStrip,
  Button as UiButton,
  Canvas,
  Card,
  InputFrame,
  useCardGlow,
} from '../ui';

export function Screen({
  title,
  subtitle,
  card,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Auth screens: the title and the form sit in one card with the brand strip (as the web auth card). */
  card?: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <Text style={s.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {children}
    </>
  );
  return (
    <Canvas>
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {card ? (
            <Card style={s.card}>
              <BrandStrip />
              {body}
            </Card>
          ) : (
            body
          )}
        </ScrollView>
      </SafeAreaView>
    </Canvas>
  );
}

export function Input(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secure?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'url';
  textContentType?:
    'emailAddress' | 'password' | 'newPassword' | 'username' | 'name' | 'oneTimeCode' | 'URL';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{props.label}</Text>
      <InputFrame focused={focused} invalid={!!props.error}>
        <TextInput
          style={[s.input, props.multiline ? s.multiline : null]}
          value={props.value}
          onChangeText={props.onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={props.secure}
          multiline={props.multiline}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.text.muted}
          autoCapitalize={props.multiline ? 'sentences' : 'none'}
          autoCorrect={!!props.multiline}
          keyboardType={props.keyboardType ?? 'default'}
          textContentType={props.textContentType}
          accessibilityLabel={props.label}
        />
      </InputFrame>
      {props.error ? (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

/** The form's main action: the 3X Primary (or Danger) button (`src/ui`). */
export function Button({
  label,
  onPress,
  busy,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Destructive action (e.g. the delete confirmation). */
  danger?: boolean;
}) {
  return (
    <UiButton
      label={label}
      onPress={onPress}
      busy={busy}
      disabled={disabled}
      variant={danger ? 'danger' : 'primary'}
    />
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      <Text style={s.link}>{label}</Text>
    </Pressable>
  );
}

/** The legacy link list under the auth panels (QA BUG-01): bulleted, muted links. */
export function LinkList({ items }: { items: { label: string; onPress: () => void }[] }) {
  return (
    <View style={s.linkList}>
      {items.map((i) => (
        <View key={i.label} style={s.linkItem}>
          <Text style={s.linkBullet}>{'•'}</Text>
          <Pressable onPress={i.onPress} accessibilityRole="link">
            <Text style={s.linkListText}>{i.label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export function Notice({ kind, text }: { kind: 'error' | 'info' | 'success'; text: string }) {
  const f = theme.colors.feedback;
  const color = { error: f.dangerText, info: f.infoText, success: f.successText }[kind];
  const glow = useCardGlow();
  // M-14: the card around a new success message glows once (a new text glows again).
  useEffect(() => {
    if (kind === 'success') glow?.();
  }, [kind, text, glow]);
  return (
    <View accessibilityLiveRegion="polite">
      <Alert tone={kind === 'error' ? 'danger' : kind}>
        <Text style={{ ...theme.text.body, color }}>{text}</Text>
      </Alert>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[4] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  field: { gap: theme.space[1] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  // The frame (border, fill, focus) is the InputFrame around it.
  input: { ...theme.text.body, color: theme.colors.text.primary, padding: theme.space[3] },
  multiline: { minHeight: theme.space[24], textAlignVertical: 'top' },
  // The top padding clears the 4 px brand strip.
  card: { padding: theme.space[4], paddingTop: theme.space[6], gap: theme.space[4] },
  error: { ...theme.text.bodySm, color: theme.colors.text.danger },
  link: { ...theme.text.body, color: theme.colors.text.link, textDecorationLine: 'underline' },
  subtitle: { ...theme.text.body, color: theme.colors.text.secondary },
  linkList: { gap: theme.space[2], marginTop: theme.space[4] },
  linkItem: { flexDirection: 'row', gap: theme.space[2] },
  linkBullet: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  linkListText: { ...theme.text.bodySm, color: theme.colors.text.secondary },
});
