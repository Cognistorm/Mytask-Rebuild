// One file list of the gig wizard's Gallery step in the app (spec 04 AC-14, AC-23; components.md §5.13 `gallery` +
// per-file states; legacy `GalleryValidator.php:42-54`), the same rules and texts as the web
// `components/gig-wizard/gig-files.tsx`: the thumbnail, the gallery images (camera or photo library) or the PDF
// documents (files). Each file goes straight to storage through the shared protocol (ADR-009 §3, `uploadFile` with
// upload progress) and is usable once the scan says `ready`. Per file: queued → uploading % → processing → ready,
// or the reason it cannot be used with Retry (network / scan) and Remove. At most 3 uploads at once. Images can be
// moved ("Move left / right", AC-23 order = display order). Reports the ready ids in order. In edit mode (4.3.15d)
// the list starts with the gig's stored files (`initial`): they can be moved and removed (a stored file is only
// dropped from the list, never deleted: the gig keeps it until the edit is saved).
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  declaredType,
  fileExtension,
  uploadFile,
  type ApiClient,
  type UploadInput,
} from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import { LinkButton, Notice } from '../form';

type State = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

/** A picked file as the upload needs it. */
interface Picked {
  uri: string;
  name: string;
  size: number;
  type: string;
}

interface Item {
  key: number;
  name: string;
  /** Image preview (the local file, or the CDN thumb of a stored file); documents show their name instead. */
  preview?: string;
  /** A file the gig already has (edit mode). */
  stored?: boolean;
  state: State;
  /** Share of the bytes sent (0…1) while uploading. */
  progress: number;
  fileId?: string;
  message?: string;
  /** Kept for Retry; null when the file can never pass (type or size). */
  file: Picked | null;
  abort: AbortController;
}

/** A file the gig already has, as the edit form shows it. */
export interface StoredFile {
  fileId: string;
  name: string;
  preview?: string;
}

const MB = 1024 * 1024;
const PARALLEL = 3;
/** The written file's type decides the name: a library photo's original name may still say .heic. */
const TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
let seq = 0;

export function GigFiles(props: {
  api: ApiClient;
  t: TFunction;
  label: string;
  /** Help text: what to upload, types and size. */
  info: string;
  purpose: Extract<UploadInput['purpose'], 'gig_thumbnail' | 'gig_image' | 'gig_document'>;
  /** 1 = one file; a new pick replaces it. */
  max: number;
  maxSizeMb: number | null;
  extensions: string[];
  /** Images: camera / photo library with previews; documents: the files app, listed by name. */
  kind: 'image' | 'document';
  reorder?: boolean;
  error?: string;
  testID?: string;
  /** Stored files to start with (edit mode). */
  initial?: StoredFile[];
  /** Ready file ids in display order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const { api, t, onChange } = props;
  const [items, setItems] = useState<Item[]>(() =>
    (props.initial ?? []).map((f) => ({
      key: (seq += 1),
      name: f.name,
      preview: f.preview,
      stored: true,
      state: 'ready',
      progress: 1,
      fileId: f.fileId,
      file: null,
      abort: new AbortController(),
    })),
  );
  const [notice, setNotice] = useState<string>();
  const live = useRef(new Set<Item>());
  const started = useRef(new Set<number>());

  const busy = items.some((i) => ['queued', 'uploading', 'processing'].includes(i.state));
  useEffect(() => {
    onChange(
      items.filter((i) => i.state === 'ready').map((i) => i.fileId!),
      busy,
    );
  }, [items, busy, onChange]);

  // Leaving the screen stops the uploads and the polling.
  useEffect(() => {
    const all = live.current;
    return () => all.forEach((i) => i.abort.abort());
  }, []);

  const update = (key: number, patch: Partial<Item>) =>
    setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // The queue: start waiting files while fewer than PARALLEL are on their way.
  useEffect(() => {
    const running = items.filter((i) => i.state === 'uploading').length;
    items
      .filter((i) => i.state === 'queued' && !started.current.has(i.key))
      .slice(0, Math.max(0, PARALLEL - running))
      .forEach((i) => {
        started.current.add(i.key);
        update(i.key, { state: 'uploading', progress: 0 });
        void start(i);
      });
  });

  async function start(item: Item) {
    const file = item.file!;
    const res = await uploadFile(
      api,
      {
        purpose: props.purpose,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type,
        body: { uri: file.uri, name: file.name, type: file.type },
      },
      {
        signal: item.abort.signal,
        onProgress: (progress) => update(item.key, { progress }),
        onScanning: () => update(item.key, { state: 'processing', progress: 1 }),
      },
    );
    if (item.abort.signal.aborted) return;
    if (res.error) {
      return update(item.key, {
        state: 'failed',
        fileId: res.error.fileId,
        message:
          res.error.code === 'UPLOAD_FAILED'
            ? t('t_error_while_uploading_your_file')
            : (res.error.message ?? t('t_toast_something_went_wrong')),
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

  function add(chosen: (Omit<Picked, 'size'> & { size: number | null | undefined })[]) {
    setNotice(undefined);
    if (chosen.length === 0) return;
    let kept = items;
    if (props.max === 1) {
      // One file: the new pick replaces the current one.
      items.forEach(discard);
      kept = [];
      chosen = chosen.slice(0, 1);
    } else {
      const used = items.filter((i) => i.state !== 'failed').length;
      if (used + chosen.length > props.max) {
        setNotice(t('t_validator_max_array', { max: props.max }));
        chosen = chosen.slice(0, Math.max(0, props.max - used));
      }
    }
    const added = chosen.map((file) => {
      const item: Item = {
        key: (seq += 1),
        name: file.name,
        preview: props.kind === 'image' ? file.uri : undefined,
        state: 'queued',
        progress: 0,
        file: file.size ? { ...file, size: file.size } : null,
        abort: new AbortController(),
      };
      live.current.add(item);
      // AC-14: wrong type or size is refused per file with its own message, before any request (the API
      // re-checks). The size must be known: it is part of the upload policy.
      const message = !props.extensions.includes(fileExtension(file.name))
        ? t('t_selected_file_extension_is_not_allowed')
        : !file.size
          ? t('t_toast_something_went_wrong')
          : props.maxSizeMb !== null && file.size > props.maxSizeMb * MB
            ? t('t_selected_file_size_big')
            : undefined;
      if (message) Object.assign(item, { state: 'failed', file: null, message });
      return item;
    });
    setItems([...kept, ...added]);
  }

  const left = () =>
    props.max === 1 ? 1 : props.max - items.filter((i) => i.state !== 'failed').length;

  async function pickImage(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const room = left();
    // "Compatible" makes iOS hand over a JPEG instead of HEIC; the system photo picker needs no permission.
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      ...(source === 'library' && room > 1
        ? { allowsMultipleSelection: true, selectionLimit: Number.isFinite(room) ? room : 0 }
        : {}),
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled) return;
    add(
      res.assets.map((a) => {
        const extension = (a.mimeType && TYPE_EXTENSION[a.mimeType]) || fileExtension(a.uri);
        const base = a.fileName?.replace(/\.[^.]*$/, '') || `image-${(seq += 1)}`;
        return {
          uri: a.uri,
          name: `${base}.${extension}`,
          size: a.fileSize,
          type: declaredType(a.mimeType),
        };
      }),
    );
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: left() > 1,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    add(
      res.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size,
        type: declaredType(a.mimeType),
      })),
    );
  }

  /**
   * Stops the upload and deletes the unattached file (best effort; the API also cleans up after 24 h). A stored file
   * stays attached to the gig until the edit is saved, so it is only taken off the list.
   */
  function discard(item: Item) {
    item.abort.abort();
    live.current.delete(item);
    if (item.stored) return;
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  }

  function remove(item: Item) {
    discard(item);
    setItems((l) => l.filter((i) => i.key !== item.key));
  }

  function retry(item: Item) {
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
    started.current.delete(item.key);
    const next: Item = {
      ...item,
      state: 'queued',
      progress: 0,
      fileId: undefined,
      message: undefined,
      abort: new AbortController(),
    };
    live.current.delete(item);
    live.current.add(next);
    setItems((l) => l.map((i) => (i.key === item.key ? next : i)));
  }

  function move(index: number, dir: -1 | 1) {
    setItems((l) => {
      const next = [...l];
      [next[index], next[index + dir]] = [next[index + dir]!, next[index]!];
      return next;
    });
  }

  const stateText = (i: Item) => {
    switch (i.state) {
      case 'queued':
        return t('t_ui_upload_queued');
      case 'uploading':
        return `${t('t_uploading')} ${Math.round(i.progress * 100)}%`;
      case 'processing':
        return t('t_processing');
      case 'failed':
        return i.message;
      default:
        return undefined;
    }
  };

  const full = props.max > 1 && left() <= 0;
  const ready = items.filter((i) => i.state === 'ready').length;

  return (
    <View style={s.box} testID={props.testID}>
      <Text style={s.label} accessibilityRole="header">
        {props.label}
      </Text>
      <Text style={s.muted}>{props.info}</Text>
      {full ? null : props.kind === 'image' ? (
        <View style={s.actions}>
          <LinkButton label={t('t_ui_take_photo')} onPress={() => void pickImage('camera')} />
          <LinkButton label={t('t_ui_choose_photo')} onPress={() => void pickImage('library')} />
        </View>
      ) : (
        <View style={s.actions}>
          <LinkButton label={t('t_browse_files')} onPress={() => void pickDocument()} />
        </View>
      )}
      {notice ? <Notice kind="error" text={notice} /> : null}
      {props.error ? <Notice kind="error" text={props.error} /> : null}
      {items.length > 0 ? (
        <>
          <View style={props.kind === 'image' ? s.grid : s.list}>
            {items.map((i, index) => (
              <View
                key={i.key}
                style={props.kind === 'image' ? s.tile : s.row}
                testID={props.testID ? `${props.testID}-file` : undefined}
              >
                {i.preview ? (
                  <Image
                    source={{ uri: i.preview }}
                    style={s.preview}
                    accessibilityLabel={i.name}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Text style={s.name} numberOfLines={2}>
                    {i.name}
                  </Text>
                )}
                {i.state === 'uploading' ? (
                  <View style={s.track} importantForAccessibility="no" accessibilityElementsHidden>
                    <View style={[s.fill, { width: `${Math.round(i.progress * 100)}%` }]} />
                  </View>
                ) : null}
                {stateText(i) ? (
                  <Text
                    style={[s.muted, i.state === 'failed' ? s.failed : null]}
                    accessibilityLiveRegion={i.state === 'failed' ? 'assertive' : 'polite'}
                  >
                    {stateText(i)}
                  </Text>
                ) : null}
                <View style={s.fileActions}>
                  {props.reorder && items.length > 1 ? (
                    <>
                      <FileAction
                        glyph="←"
                        label={`${t('t_ui_move_left')}: ${i.name}`}
                        disabled={index === 0}
                        onPress={() => move(index, -1)}
                      />
                      <FileAction
                        glyph="→"
                        label={`${t('t_ui_move_right')}: ${i.name}`}
                        disabled={index === items.length - 1}
                        onPress={() => move(index, 1)}
                      />
                    </>
                  ) : null}
                  {i.state === 'failed' && i.file ? (
                    <FileAction
                      glyph={t('t_ui_retry')}
                      label={`${t('t_ui_retry')}: ${i.name}`}
                      onPress={() => retry(i)}
                    />
                  ) : null}
                  <FileAction
                    glyph={t('t_remove')}
                    label={`${t('t_remove')}: ${i.name}`}
                    onPress={() => remove(i)}
                  />
                </View>
              </View>
            ))}
          </View>
          {/* "3 of 5 uploaded" (§5.13). */}
          <Text style={s.muted} accessibilityLiveRegion="polite">
            {t('t_ui_upload_count', { done: ready, total: items.length })}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function FileAction(props: {
  glyph: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={s.fileAction}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
    >
      <Text style={[s.link, props.disabled ? s.disabled : null]}>{props.glyph}</Text>
    </Pressable>
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
  list: { gap: theme.space[3] },
  tile: { width: '48%', gap: theme.space[1] },
  row: {
    gap: theme.space[1],
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
  },
  preview: {
    width: '100%',
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  name: { ...theme.text.body, color: theme.colors.text.primary },
  track: {
    height: theme.space[1],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.skeleton,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: theme.colors.action.primary },
  fileActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.space[1] },
  fileAction: {
    minHeight: theme.size.touchTarget.min,
    minWidth: theme.size.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space[1],
  },
  link: { ...theme.text.bodySm, color: theme.colors.text.link },
  disabled: { color: theme.colors.text.muted },
});
