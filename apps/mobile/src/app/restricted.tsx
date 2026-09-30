// Restrictions removal center (spec 01 AC-19, AC-46…AC-49), same content as the web /restricted page:
// each restriction with status, date and reason, and the appeal form while it is pending.
// Appeal files wait for the files foundation (F0) and Q-154.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { Button, Input, LinkButton, Notice, Screen } from '../components/form';
import { clearSession, mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';

type Restriction = components['schemas']['Restriction'];
interface ApiError {
  message: string;
  details?: { fields?: { field: string; message: string }[] };
}

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

const STATUS: Record<Restriction['status'], { key: string; color: string }> = {
  pending: { key: 't_pending', color: theme.colors.feedback.warningText },
  submitted: { key: 't_restriction_submitted', color: theme.colors.feedback.warningText },
  approved: { key: 't_restriction_resolved', color: theme.colors.feedback.successText },
  rejected: { key: 't_restriction_rejected', color: theme.colors.feedback.dangerText },
};

function Appeal({ restriction, onDone }: { restriction: Restriction; onDone: () => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError>();
  const fieldError = err?.details?.fields?.find(
    (f) => f.field === 'message' || f.field === 'fileIds',
  );

  async function submit() {
    setBusy(true);
    setErr(undefined);
    const res = await api.POST('/restriction-appeals', {
      body: { restrictionId: restriction.id, message },
    });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiError);
    onDone();
  }

  return (
    <View style={s.gap}>
      {err && !fieldError ? <Notice kind="error" text={err.message} /> : null}
      <Input
        label={t('t_type_ur_response_here')}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={1500}
        error={fieldError?.message}
      />
      <Button label={t('t_appeal_the_closure')} onPress={submit} busy={busy} />
    </View>
  );
}

export default function Restricted() {
  const [items, setItems] = useState<Restriction[]>();

  const load = useCallback(async () => {
    const res = await api.GET('/me/restrictions', { params: { query: {} } });
    if (res.error) return router.replace('/login');
    setItems(res.data.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await api.POST('/auth/logout', { body: {} });
    await clearSession();
    router.replace('/login');
  }

  const open = items?.some((r) => r.status !== 'approved');
  return (
    <Screen title={t('t_restrictions_removal_center')}>
      {items === undefined ? (
        <Text accessibilityRole="progressbar">{t('t_ui_loading')}</Text>
      ) : (
        <>
          {open ? <Notice kind="info" text={t('t_account_restricted_notice')} /> : null}
          {items.map((r) => (
            <View key={r.id} style={s.card}>
              <Text style={[s.status, { color: STATUS[r.status].color }]}>
                {t(STATUS[r.status].key)}
              </Text>
              <Text style={s.muted}>
                {new Date(r.createdAt).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
              </Text>
              <Text style={s.label}>{t('t_reason')}</Text>
              <Text style={s.body}>{r.message}</Text>
              {r.canAppeal ? <Appeal restriction={r} onDone={load} /> : null}
            </View>
          ))}
          {!open ? <LinkButton label={t('t_home')} onPress={() => router.replace('/')} /> : null}
          <LinkButton label={t('t_logout')} onPress={logout} />
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { gap: theme.space[3] },
  card: {
    gap: theme.space[2],
    padding: theme.space[3],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.surface,
  },
  status: { ...theme.text.label },
  muted: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  body: { ...theme.text.body, color: theme.colors.text.primary },
});
