// Image picker of the portfolio form in the app (spec 02 AC-24, AC-27; screens table "upload progress per image;
// error per file (type/size)"; design components.md §5.13 "gallery" variant), the same rules as the web
// `ImageUploader`: camera or photo library, client pre-checks of type and size (S-090) and count (S-089) before any
// upload, each image straight to storage through the shared protocol (ADR-009 §3), usable once the scan says
// `ready`. Per image: preview, "Uploading / Processing", or the reason it cannot be used; Remove deletes the
// unattached file. `max` 1 = one image, a new pick replaces it.
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { declaredType, fileExtension, uploadFile, type ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import { LinkButton, Notice } from '../form';

type T = (key: string, vars?: Record<string, string | number>) => string;
type State = 'uploading' | 'processing' | 'ready' | 'failed';

interface Item {
  key: number;
  uri: string;
  state: State;
  fileId?: string;
  message?: string;
  abort: AbortController;
}

const MB = 1024 * 1024;
/** The written file's type decides the name: a library photo's original name may still say .heic. */
const TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
let seq = 0;

export function ImagePickerField(props: {
  api: ApiClient;
  t: T;
  label: string;
  max: number;
  maxSizeMb: number | null;
  extensions: string[];
  /** The API's message for this field. */
  error?: string;
  /** Under the field, e.g. "new images replace the current gallery". */
  note?: string;
  testID?: string;
  /** Ready file ids in the chosen order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const { api, t, onChange } = props;
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string>();
  const running = useRef(new Set<AbortController>());
  const used = items.filter((i) => i.state !== 'failed').length;

  useEffect(() => {
    onChange(
      items.filter((i) => i.state === 'ready').map((i) => i.fileId!),
      items.some((i) => i.state === 'uploading' || i.state === 'processing'),
    );
  }, [items, onChange]);

  // Leaving the screen stops the polling of unfinished uploads.
  useEffect(() => {
    const all = running.current;
    return () => all.forEach((a) => a.abort());
  }, []);

  const update = useCallback(
    (key: number, patch: Partial<Item>) =>
      setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    [],
  );

  const discard = (item: Item) => {
    item.abort.abort();
    running.current.delete(item.abort);
    // The upload is the user's own and not attached to anything yet: delete it (best effort).
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  };

  async function start(
    item: Item,
    asset: { uri: string; size: number; type: string; name: string },
  ) {
    const res = await uploadFile(
      api,
      {
        purpose: 'portfolio_image',
        fileName: asset.name,
        sizeBytes: asset.size,
        contentType: asset.type,
        body: { uri: asset.uri, name: asset.name, type: asset.type },
      },
      { signal: item.abort.signal, onScanning: () => update(item.key, { state: 'processing' }) },
    );
    running.current.delete(item.abort);
    if (item.abort.signal.aborted) return;
    if (res.error) {
      return update(item.key, {
        state: 'failed',
        fileId: res.error.fileId,
        message: res.error.message ?? t('t_toast_something_went_wrong'),
      });
    }
    update(
      item.key,
      res.file.status === 'ready'
        ? { state: 'ready', fileId: res.file.id }
        : {
            state: 'failed',
            fileId: res.file.id,
            message: res.file.rejectReason ?? t('t_toast_something_went_wrong'),
          },
    );
  }

  function add(assets: ImagePicker.ImagePickerAsset[]) {
    setNotice(undefined);
    let kept = items;
    if (props.max === 1) {
      items.forEach(discard);
      kept = [];
      assets = assets.slice(0, 1);
    } else if (used + assets.length > props.max) {
      setNotice(t('t_validator_max_array', { max: props.max }));
      assets = assets.slice(0, Math.max(0, props.max - used));
    }
    const added = assets.map((asset) => {
      const item: Item = {
        key: (seq += 1),
        uri: asset.uri,
        state: 'uploading',
        abort: new AbortController(),
      };
      // Client pre-checks only (the API re-checks), so no upload starts for a file that cannot pass. The size must
      // be known: it is part of the upload policy.
      const extension =
        (asset.mimeType && TYPE_EXTENSION[asset.mimeType]) || fileExtension(asset.uri);
      if (!props.extensions.includes(extension)) {
        Object.assign(item, {
          state: 'failed',
          message: t('t_selected_file_extension_is_not_allowed'),
        });
      } else if (!asset.fileSize) {
        Object.assign(item, { state: 'failed', message: t('t_toast_something_went_wrong') });
      } else if (props.maxSizeMb !== null && asset.fileSize > props.maxSizeMb * MB) {
        Object.assign(item, { state: 'failed', message: t('t_selected_file_size_big') });
      } else {
        running.current.add(item.abort);
        void start(item, {
          uri: asset.uri,
          size: asset.fileSize,
          type: declaredType(asset.mimeType),
          name: `image-${item.key}.${extension}`,
        });
      }
      return item;
    });
    setItems([...kept, ...added]);
  }

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const left = props.max === 1 ? 1 : props.max - used;
    // "Compatible" makes iOS hand over a JPEG instead of HEIC; the system photo picker needs no permission.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      ...(source === 'library' && left > 1
        ? { allowsMultipleSelection: true, selectionLimit: Number.isFinite(left) ? left : 0 }
        : {}),
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!res.canceled) add(res.assets);
  }

  function remove(item: Item) {
    discard(item);
    setItems((list) => list.filter((i) => i.key !== item.key));
  }

  const stateText = (i: Item) =>
    i.state === 'uploading'
      ? t('t_uploading')
      : i.state === 'processing'
        ? t('t_processing')
        : i.state === 'failed'
          ? i.message
          : undefined;
  const canAdd = props.max === 1 || used < props.max;

  return (
    <View style={s.box} testID={props.testID}>
      <Text style={s.label}>{props.label}</Text>
      <Text style={s.muted}>
        {t('t_restrictions_files_allowed_info_explain', {
          size: props.maxSizeMb ?? '',
          extensions: props.extensions.join(', '),
        })}
      </Text>
      {props.note ? <Text style={s.muted}>{props.note}</Text> : null}
      {canAdd ? (
        <View style={s.actions}>
          <LinkButton label={t('t_ui_take_photo')} onPress={() => void pick('camera')} />
          <LinkButton label={t('t_ui_choose_photo')} onPress={() => void pick('library')} />
        </View>
      ) : null}
      {notice ? <Notice kind="error" text={notice} /> : null}
      {props.error ? <Notice kind="error" text={props.error} /> : null}
      {items.length > 0 ? (
        <View style={s.grid}>
          {items.map((i) => (
            <View key={i.key} style={s.item} accessibilityLiveRegion="polite">
              <Image source={{ uri: i.uri }} style={s.preview} accessibilityIgnoresInvertColors />
              {stateText(i) ? (
                <Text style={[s.muted, i.state === 'failed' && s.failed]}>{stateText(i)}</Text>
              ) : null}
              <Pressable
                onPress={() => remove(i)}
                accessibilityRole="button"
                hitSlop={theme.space[2]}
              >
                <Text style={s.link}>{t('t_remove')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { gap: theme.space[2] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  muted: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  failed: { color: theme.colors.feedback.dangerText },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[4] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.space[3],
  },
  item: { width: '48%', gap: theme.space[1] },
  preview: {
    width: '100%',
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  link: { ...theme.text.bodySm, color: theme.colors.text.link },
});
