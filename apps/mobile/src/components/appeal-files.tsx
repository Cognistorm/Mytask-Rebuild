// File picker of the restriction appeal in the app (spec 01 AC-47; screens table: "mobile: camera or files").
// Same flow as the web picker: client pre-checks against the public config (S-091…S-093), direct upload through
// the shared protocol (ADR-009 §3), usable once the scan says `ready`. No download for the user (R-A8).
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { declaredType, fileExtension, uploadFile, type Locale } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { mobileApi } from '../lib/api';
import { createT } from '../lib/i18n';
import { LinkButton, Notice } from './form';

type Rule = components['schemas']['PublicConfigUploadRule'];
type State = 'uploading' | 'processing' | 'ready' | 'failed';

interface Item {
  key: number;
  name: string;
  sizeBytes: number;
  state: State;
  fileId?: string;
  message?: string;
  abort: AbortController;
}

interface Picked {
  uri: string;
  name: string;
  size: number | null | undefined;
  type: string | null | undefined;
}

const MB = 1024 * 1024;
let seq = 0;

export function AppealFiles({
  locale,
  rule,
  required,
  error,
  onChange,
}: {
  locale: Locale;
  rule: Rule;
  required: boolean;
  error?: string;
  /** Ready file ids in the chosen order, and whether an upload is still running. */
  onChange: (fileIds: string[], busy: boolean) => void;
}) {
  const t = createT(locale);
  const api = mobileApi(locale);
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string>();
  const running = useRef(new Set<AbortController>());
  const maxFiles = rule.maxFiles ?? Infinity;
  const extensions = rule.allowedExtensions.map((e) => e.toLowerCase());
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

  async function start(item: Item, file: Picked & { size: number }) {
    const contentType = declaredType(file.type);
    const res = await uploadFile(
      api,
      {
        purpose: 'appeal_file',
        fileName: file.name,
        sizeBytes: file.size,
        contentType,
        body: { uri: file.uri, name: file.name, type: contentType },
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
        : { state: 'failed', fileId: res.file.id, message: res.file.rejectReason ?? undefined },
    );
  }

  function add(chosen: Picked[]) {
    setNotice(undefined);
    if (used + chosen.length > maxFiles) {
      setNotice(t('t_validator_max_array', { max: maxFiles }));
      chosen = chosen.slice(0, Math.max(0, maxFiles - used));
    }
    const added = chosen.map((file) => {
      const item: Item = {
        key: (seq += 1),
        name: file.name,
        sizeBytes: file.size ?? 0,
        state: 'uploading',
        abort: new AbortController(),
      };
      // Client pre-checks only (the API re-checks). The size must be known: it is part of the upload policy.
      if (!extensions.includes(fileExtension(file.name))) {
        Object.assign(item, {
          state: 'failed',
          message: t('t_selected_file_extension_is_not_allowed'),
        });
      } else if (!file.size) {
        Object.assign(item, { state: 'failed', message: t('t_toast_something_went_wrong') });
      } else if (rule.maxSizeMb !== null && file.size > rule.maxSizeMb * MB) {
        Object.assign(item, { state: 'failed', message: t('t_selected_file_size_big') });
      } else {
        running.current.add(item.abort);
        void start(item, { ...file, size: file.size });
      }
      return item;
    });
    setItems((current) => [...current, ...added]);
  }

  async function browse() {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: maxFiles - used > 1,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    add(res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size, type: a.mimeType })));
  }

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    add(
      res.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `photo-${Date.now()}.jpg`,
        size: a.fileSize,
        type: a.mimeType ?? 'image/jpeg',
      })),
    );
  }

  function remove(item: Item) {
    item.abort.abort();
    running.current.delete(item.abort);
    setItems((list) => list.filter((i) => i.key !== item.key));
    if (item.fileId) {
      void api.DELETE('/files/{fileId}', { params: { path: { fileId: item.fileId } } });
    }
  }

  const stateText = (i: Item) =>
    i.state === 'uploading'
      ? t('t_uploading')
      : i.state === 'processing'
        ? t('t_processing')
        : i.state === 'ready'
          ? '✓'
          : i.message;
  const canPhoto = extensions.some((e) => e === 'jpg' || e === 'jpeg');

  return (
    <View style={s.box}>
      <Text style={s.label}>
        {t('t_attach_a_file')}
        {required ? <Text style={s.required}> *</Text> : null}
      </Text>
      <Text style={s.muted}>
        {t('t_restrictions_files_allowed_info_explain', {
          size: rule.maxSizeMb,
          extensions: extensions.join(', '),
        })}
      </Text>
      {used < maxFiles ? (
        <View style={s.actions}>
          {canPhoto ? <LinkButton label={t('t_ui_take_photo')} onPress={camera} /> : null}
          <LinkButton label={t('t_browse_files')} onPress={browse} />
        </View>
      ) : null}
      {notice ? <Notice kind="error" text={notice} /> : null}
      {error ? <Notice kind="error" text={error} /> : null}
      {items.map((i) => (
        <View key={i.key} style={s.item} accessibilityLiveRegion="polite">
          <Text style={s.name}>{i.name}</Text>
          <Text style={s.muted}>
            {t('t_ui_file_size_mb', { size: (i.sizeBytes / MB).toFixed(1) })}
          </Text>
          <Text
            style={[
              s.muted,
              i.state === 'ready' && { color: theme.colors.feedback.successText },
              i.state === 'failed' && { color: theme.colors.feedback.dangerText },
            ]}
          >
            {stateText(i)}
          </Text>
          <Pressable onPress={() => remove(i)} accessibilityRole="button">
            <Text style={s.link}>{t('t_remove')}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  box: { gap: theme.space[2] },
  label: { ...theme.text.label, color: theme.colors.text.primary },
  required: { color: theme.colors.feedback.dangerText },
  muted: { ...theme.text.bodySm, color: theme.colors.text.secondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[4] },
  item: {
    gap: theme.space[1],
    padding: theme.space[2],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
  },
  name: { ...theme.text.body, color: theme.colors.text.primary },
  link: { ...theme.text.bodySm, color: theme.colors.text.link },
});
