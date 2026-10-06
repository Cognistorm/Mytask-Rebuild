// Top card of the edit-profile screen, as the web `profile-edit/card.tsx` (legacy "Profile header" + "Quick
// stats"): avatar from the camera or the photo library, or removed (AC-16), username + verified mark, full name,
// headline edited in place (AC-17), "Unavailable" while availability is set, member since.
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { declaredType, fileExtension, uploadFile, type ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import { Card } from '../../ui';
import type { components } from '@mytask/types';
import { formatDate } from '../../lib/format';
import { Button, Input } from '../form';
import { Avatar, OutlineButton, Pill, VerifiedMark } from '../profile';
import type { ApiError } from '../reauth';
import { BlockMessage, ButtonCell, ButtonRow, EditLink, useBlockState } from './block';

type Me = components['schemas']['Me'];
type MeProfile = components['schemas']['MeProfile'];
type T = (key: string, options?: Record<string, unknown>) => string;

/** AC-16 / P-24: the avatar purpose has a fixed rule (not in the public config); the API checks it again. */
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function ProfileCard(props: {
  api: ApiClient;
  t: T;
  me: Me;
  profile: MeProfile;
  onChange: (patch: Partial<MeProfile>) => void;
}) {
  const { t, me, profile } = props;
  return (
    <Card style={s.card} testID="profile-card">
      <AvatarEditor
        api={props.api}
        t={t}
        name={me.username}
        avatar={profile.avatar}
        onChange={(avatar) => props.onChange({ avatar })}
      />
      <View style={s.identity}>
        <View style={s.nameRow}>
          <Text style={s.username}>{me.username}</Text>
          {me.kycStatus === 'verified' ? <VerifiedMark label={t('t_account_verified')} /> : null}
        </View>
        <Text style={s.muted}>{me.fullName}</Text>
      </View>
      <HeadlineEditor
        api={props.api}
        t={t}
        headline={profile.headline}
        onSaved={(headline) => props.onChange({ headline })}
      />
      <View style={s.stats}>
        {profile.availability ? (
          <View style={s.stat}>
            <Text style={s.muted}>{t('t_availability')}</Text>
            <Pill tone="danger" label={t('t_unavailable')} />
          </View>
        ) : null}
        <View style={s.stat}>
          <Text style={s.muted}>{t('t_member_since')}</Text>
          <Text style={s.value}>{formatDate(me.createdAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

function AvatarEditor(props: {
  api: ApiClient;
  t: T;
  name: string;
  avatar: MeProfile['avatar'];
  onChange: (avatar: MeProfile['avatar']) => void;
}) {
  const { api, t } = props;
  const state = useBlockState();
  const [phase, setPhase] = useState<'uploading' | 'processing'>();

  const fail = (message: string, fileId?: string) => {
    // The upload is the user's own and not attached to anything: delete it (best effort).
    if (fileId) void api.DELETE('/files/{fileId}', { params: { path: { fileId } } });
    setPhase(undefined);
    state.done({ err: { code: 'AVATAR', message } });
  };

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    // Square crop (the avatar is shown round); the system photo picker needs no library permission.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    state.start();
    // The written file's type decides the name (an edited library photo is re-encoded, its original name may
    // still say .heic). Client pre-checks only, so no upload starts for a file that cannot pass (AC-16).
    const extension =
      (asset.mimeType && TYPE_EXTENSION[asset.mimeType]) || fileExtension(asset.uri);
    if (!AVATAR_EXTENSIONS.includes(extension)) {
      return fail(t('t_selected_file_extension_is_not_allowed'));
    }
    if (!asset.fileSize) return fail(t('t_toast_something_went_wrong'));
    if (asset.fileSize > AVATAR_MAX_BYTES) return fail(t('t_validator_max_file_size_2mb'));
    const fileName = `avatar.${extension}`;
    const contentType = declaredType(asset.mimeType);
    setPhase('uploading');
    const up = await uploadFile(
      api,
      {
        purpose: 'avatar',
        fileName,
        sizeBytes: asset.fileSize,
        contentType,
        body: { uri: asset.uri, name: fileName, type: contentType },
      },
      { onScanning: () => setPhase('processing') },
    );
    if (up.error) {
      return fail(up.error.message ?? t('t_toast_something_went_wrong'), up.error.fileId);
    }
    if (up.file.status !== 'ready') {
      return fail(up.file.rejectReason ?? t('t_toast_something_went_wrong'), up.file.id);
    }
    const put = await api.PUT('/me/avatar', { body: { fileId: up.file.id } });
    if (put.error) return fail((put.error as ApiError).message, up.file.id);
    setPhase(undefined);
    props.onChange(put.data.avatar);
    state.done({ ok: t('t_avatar_updated_successfully') });
  }

  async function remove() {
    state.start();
    const res = await api.DELETE('/me/avatar');
    if (res.error) return state.done({ err: res.error as ApiError });
    props.onChange(null);
    state.done({ ok: t('t_avatar_updated_successfully') });
  }

  const busy = state.busy || phase !== undefined;

  return (
    <View style={s.avatar} testID="avatar-editor" accessibilityState={{ busy }}>
      <Avatar image={props.avatar} name={props.name} size="xl" />
      <View style={s.avatarActions}>
        <EditLink
          label={t('t_ui_take_photo')}
          onPress={() => void pick('camera')}
          disabled={busy}
          testID="avatar-camera"
        />
        <EditLink
          label={t('t_ui_choose_photo')}
          onPress={() => void pick('library')}
          disabled={busy}
          testID="avatar-library"
        />
        {props.avatar ? (
          <EditLink
            label={t('t_remove')}
            accessibilityLabel={t('t_remove_avatar')}
            onPress={() => void remove()}
            disabled={busy}
            danger
            testID="avatar-remove"
          />
        ) : null}
      </View>
      {phase ? (
        <Text style={s.muted} accessibilityLiveRegion="polite">
          {t(phase === 'uploading' ? 't_uploading' : 't_processing')}
        </Text>
      ) : null}
      <BlockMessage ok={state.ok} general={state.general} />
    </View>
  );
}

function HeadlineEditor(props: {
  api: ApiClient;
  t: T;
  headline: string | null;
  onSaved: (headline: string) => void;
}) {
  const { api, t } = props;
  const state = useBlockState();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  function open() {
    setValue(props.headline ?? '');
    state.reset();
    setEditing(true);
  }

  async function save() {
    state.start();
    const res = await api.PATCH('/me/profile', { body: { headline: value.trim() } });
    if (res.error) return state.done({ err: res.error as ApiError });
    props.onSaved(res.data.headline ?? '');
    setEditing(false);
    state.done({ ok: t('t_headline_updated_successfully') });
  }

  if (editing) {
    return (
      <View style={s.headline} testID="headline">
        <Input
          label={t('t_headline')}
          value={value}
          onChangeText={setValue}
          maxLength={100}
          error={state.fields.headline}
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
      </View>
    );
  }

  return (
    <View style={s.headline} testID="headline">
      <Text style={props.headline ? s.headlineText : s.muted}>
        {props.headline || t('t_headline')}
      </Text>
      <EditLink
        label={t('t_edit')}
        accessibilityLabel={`${t('t_edit')}: ${t('t_headline')}`}
        onPress={open}
        testID="headline-edit"
      />
      <BlockMessage ok={state.ok} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    padding: theme.space[4],
    gap: theme.space[4],
  },
  avatar: { alignItems: 'center', gap: theme.space[3] },
  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: theme.space[4],
    rowGap: theme.space[2],
  },
  identity: { alignItems: 'center', gap: theme.space[1] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
  username: { ...theme.text.h3, color: theme.colors.text.primary },
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  value: { ...theme.text.bodySm, color: theme.colors.text.primary },
  headline: { gap: theme.space[2] },
  headlineText: { ...theme.text.body, color: theme.colors.text.primary },
  stats: {
    gap: theme.space[2],
    borderTopWidth: theme.borderWidth.hairline,
    borderTopColor: theme.colors.border.default,
    paddingTop: theme.space[3],
  },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
