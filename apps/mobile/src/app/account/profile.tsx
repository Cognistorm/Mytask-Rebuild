// Edit profile on mobile, Account → Profile (spec 02 AC-15…AC-23, P-23; screens table "per-block saving spinner;
// inline errors; success"), the same blocks, order, texts and ops as the web `/account/profile`
// (`apps/web/src/components/profile-edit/`). Reads `getMe` + `getMyProfile` once; every block saves on its own.
// The legacy "Update profile" links list only the app screens that exist (account settings since 4.1.24c; the
// verification centre joins with 4.1.24d).
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { Skeleton, SecondaryButton } from '../../components/dashboard';
import { Button, Input, LinkButton, Notice, Screen } from '../../components/form';
import { OutlineButton } from '../../components/profile';
import { AvailabilityBlock } from '../../components/profile-edit/availability';
import {
  Block,
  BlockMessage,
  ButtonCell,
  ButtonRow,
  EditLink,
  useBlockState,
} from '../../components/profile-edit/block';
import { ProfileCard } from '../../components/profile-edit/card';
import { LanguagesBlock, SkillsBlock } from '../../components/profile-edit/entries';
import type { ApiError } from '../../components/reauth';
import { loadSession, mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { LINKED } from '../../lib/profile';

type Me = components['schemas']['Me'];
type MeProfile = components['schemas']['MeProfile'];
type LinkedAccounts = components['schemas']['ProfileLinkedAccounts'];

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'error' }
  | { kind: 'ready'; me: Me; profile: MeProfile };

export default function EditProfileScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    if (!(await loadSession())) return setState({ kind: 'signed-out' });
    const me = await api.GET('/me');
    if (!me.data) {
      return setState(me.response.status === 401 ? { kind: 'signed-out' } : { kind: 'error' });
    }
    const profile = await api.GET('/me/profile');
    if (!profile.data) return setState({ kind: 'error' });
    setState({ kind: 'ready', me: me.data, profile: profile.data });
  }, []);

  useEffect(() => void load(), [load]);

  const patch = useCallback(
    (p: Partial<MeProfile>) =>
      setState((s) => (s.kind === 'ready' ? { ...s, profile: { ...s.profile, ...p } } : s)),
    [],
  );

  if (state.kind === 'signed-out') return <Redirect href="/login" />;
  if (state.kind === 'ready' && state.me.isRestricted) return <Redirect href="/restricted" />;

  return (
    <Screen title={t('t_edit_profile')}>
      {state.kind === 'loading' ? <Skeleton label={t('t_ui_loading')} tiles={0} rows={6} /> : null}
      {state.kind === 'error' ? (
        <>
          <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <>
          <ProfileCard api={api} t={t} me={state.me} profile={state.profile} onChange={patch} />
          <AvailabilityBlock
            api={api}
            t={t}
            availability={state.profile.availability}
            onChange={(availability) => patch({ availability })}
          />
          <AboutBlock about={state.profile.about} onSaved={(about) => patch({ about })} />
          {state.profile.linkedAccountsEnabled ? (
            <LinkedAccountsBlock
              accounts={state.profile.linkedAccounts}
              onSaved={(linkedAccounts) => patch({ linkedAccounts })}
            />
          ) : null}
          <SkillsBlock api={api} t={t} skills={state.profile.skills} />
          <LanguagesBlock api={api} t={t} languages={state.profile.languages} />
          <Block
            title={t('t_update_profile')}
            hint={t('t_these_info_will_appear_on_ur_public_profile')}
          >
            <LinkButton
              label={t('t_account_settings')}
              onPress={() => router.push('/account/settings')}
            />
            <LinkButton
              label={t('t_change_password')}
              onPress={() => router.push('/account/security/password')}
            />
            <LinkButton
              label={t('t_view_profile')}
              onPress={() =>
                router.push({
                  pathname: '/profile/[username]',
                  params: { username: state.me.username },
                })
              }
            />
          </Block>
        </>
      ) : null}
    </Screen>
  );
}

/** About me (AC-18): 1–1,500 characters; legacy "Description" block with Edit → text → Cancel / Update. */
function AboutBlock(props: { about: string | null; onSaved: (about: string) => void }) {
  const state = useBlockState();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function open() {
    setValue(props.about ?? '');
    state.reset();
    setEditing(true);
  }

  async function save() {
    state.start();
    const res = await api.PATCH('/me/profile', { body: { about: value.trim() } });
    if (res.error) return state.done({ err: res.error as ApiError });
    props.onSaved(res.data.about ?? '');
    setEditing(false);
    state.done({ ok: t('t_profile_description_updated') });
  }

  return (
    <Block
      title={t('t_about_me')}
      hint={t('t_tell_us_more_about_ur_self')}
      testID="about-block"
      action={
        editing ? null : (
          <EditLink
            label={t('t_edit')}
            accessibilityLabel={`${t('t_edit')}: ${t('t_about_me')}`}
            onPress={open}
            testID="about-edit"
          />
        )
      }
    >
      {editing ? (
        <>
          <Input
            label={t('t_about_me')}
            value={value}
            onChangeText={setValue}
            multiline
            maxLength={1500}
            placeholder={t('t_pls_tell_us_about_ur_hobbies_etc')}
            error={state.fields.about}
          />
          <BlockMessage general={state.general} />
          <ButtonRow>
            <ButtonCell>
              <OutlineButton label={t('t_cancel')} onPress={() => setEditing(false)} />
            </ButtonCell>
            <ButtonCell>
              <Button label={t('t_update')} onPress={() => void save()} busy={state.busy} />
            </ButtonCell>
          </ButtonRow>
        </>
      ) : (
        <>
          <BlockMessage ok={state.ok} />
          {props.about ? <Text style={s.about}>{props.about}</Text> : null}
        </>
      )}
    </Block>
  );
}

/** Linked accounts (AC-21, S-123): seven optional URLs saved together; an empty field clears that one. */
function LinkedAccountsBlock(props: {
  accounts: LinkedAccounts;
  onSaved: (accounts: LinkedAccounts) => void;
}) {
  const state = useBlockState();
  const [values, setValues] = useState(() =>
    Object.fromEntries(LINKED.map(([key]) => [key, props.accounts[key] ?? ''])),
  );

  async function save() {
    state.start();
    const body = Object.fromEntries(
      LINKED.map(([key]) => [key, values[key]?.trim() || null]),
    ) as LinkedAccounts;
    const res = await api.PUT('/me/linked-accounts', { body });
    if (res.error) return state.done({ err: res.error as ApiError });
    props.onSaved(res.data);
    setValues(Object.fromEntries(LINKED.map(([key]) => [key, res.data[key] ?? ''])));
    state.done({ ok: t('t_linked_accounts_has_been_updated') });
  }

  return (
    <Block
      title={t('t_linked_accounts')}
      hint={t('t_connect_ur_social_media_accounts')}
      testID="linked-accounts-block"
    >
      <View style={s.fields}>
        {LINKED.map(([key, label]) => (
          <Input
            key={key}
            label={t(label)}
            value={values[key] ?? ''}
            onChangeText={(v) => setValues((current) => ({ ...current, [key]: v }))}
            keyboardType="url"
            textContentType="URL"
            placeholder="https://"
            maxLength={160}
            error={state.fields[key]}
          />
        ))}
      </View>
      <BlockMessage ok={state.ok} general={state.general} />
      <Button label={t('t_update')} onPress={() => void save()} busy={state.busy} />
    </Block>
  );
}

const s = StyleSheet.create({
  about: { ...theme.text.body, color: theme.colors.text.primary },
  fields: { gap: theme.space[3] },
});
