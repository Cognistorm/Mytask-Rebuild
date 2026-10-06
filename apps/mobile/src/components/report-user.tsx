// "Report user" on the profile (spec 02 AC-13, AC-14; screens table "Report user: bottom sheet"), the same rules
// and legacy texts as the web `ReportButton` (`apps/web/src/components/profile/client.tsx`): reason trimmed,
// required, ≤ 1,500; a second report replaces the first (201 and 200 read the same); guests and a session that
// ended (401) get the login message. Not shown on one's own profile (the caller decides).
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { ApiClient } from '@mytask/api-client';
import { Button, Input, Notice } from './form';
import { BottomSheet, OutlineButton } from './profile';
import { splitError, type ApiError } from './reauth';

export function ReportUser(props: {
  api: ApiClient;
  t: (key: string) => string;
  username: string;
  signedIn: boolean;
}) {
  const { api, t } = props;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(!props.signedIn);
  const [error, setError] = useState<ApiError>();
  const [empty, setEmpty] = useState(false);
  const { field, general } = splitError(error);

  async function send() {
    const text = reason.trim();
    if (!text) return setEmpty(true);
    setEmpty(false);
    setBusy(true);
    setError(undefined);
    const res = await api.POST('/users/{username}/reports', {
      params: { path: { username: props.username } },
      body: { reason: text },
    });
    setBusy(false);
    if (res.response.status === 401) return setNeedsLogin(true);
    if (res.error) return setError(res.error as ApiError);
    setDone(true);
    setReason('');
  }

  const close = () => setOpen(false);

  return (
    <>
      <OutlineButton
        label={t('t_report_user')}
        testID="report-user"
        onPress={() => {
          setDone(false);
          setError(undefined);
          setEmpty(false);
          setOpen(true);
        }}
      />
      <BottomSheet
        open={open}
        onClose={close}
        title={t('t_report_user')}
        closeLabel={t('t_ui_close')}
        testID="report-sheet"
      >
        {needsLogin ? (
          <>
            <Notice kind="info" text={t('t_u_must_login_to_report_this_profile')} />
            <Button
              label={t('t_login')}
              onPress={() => {
                close();
                router.push('/login');
              }}
            />
          </>
        ) : done ? (
          <>
            <Notice kind="success" text={t('t_profile_has_been_successfully_reported')} />
            <OutlineButton label={t('t_ui_close')} onPress={close} />
          </>
        ) : (
          <>
            {general ? <Notice kind="error" text={general} /> : null}
            <Input
              label={t('t_reason')}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={1500}
              placeholder={t('t_report_user_reason_placeholder')}
              error={empty ? t('t_validator_required') : field('reason')}
            />
            <View style={s.buttons}>
              <View style={s.button}>
                <OutlineButton label={t('t_cancel')} onPress={close} />
              </View>
              <View style={s.button}>
                <Button label={t('t_report')} onPress={() => void send()} busy={busy} />
              </View>
            </View>
          </>
        )}
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: theme.space[3] },
  button: { flex: 1 },
});
