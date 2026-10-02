// Portfolio create / edit form in the app (spec 02 AC-24, AC-25, AC-27, AC-42; screens table "Portfolio
// create/edit"), the same fields, texts, rules and ops as the web `components/portfolio-edit/portfolio-form.tsx`
// (legacy `options/create.blade.php`, `edit.blade.php`): title, description, project link, video link, thumbnail and
// gallery, one submit. Edit shows the current thumbnail and gallery; a new thumbnail or new gallery images replace
// them (only what changed is sent). A rejected item shows the "Rejected" chip and the reason above the form, a
// pending one the review note. After saving: back to Selling → Portfolio with the legacy success message.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import { setFlash } from '../../lib/flash';
import type { PortfolioItem } from '../../lib/profile';
import type { PublicConfig } from '../../lib/public-config';
import { Button, Input, LinkButton, Notice } from '../form';
import { StatusNote } from '../portfolio';
import type { ApiError } from '../reauth';
import { ImagePickerField } from './image-picker';

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Legacy fixed list (`CreateValidator.php`: jpeg,jpg,png); the public config may narrow it. */
const DEFAULT_EXTENSIONS = ['jpg', 'jpeg', 'png'];

export const MY_PORTFOLIO = '/seller/portfolio';

export function PortfolioForm(props: {
  api: ApiClient;
  t: T;
  config: PublicConfig | undefined;
  item?: PortfolioItem;
}) {
  const { api, t, item } = props;
  const rule = props.config?.uploads.portfolioImage;
  const extensions = rule?.allowedExtensions.length
    ? rule.allowedExtensions.map((e) => e.toLowerCase())
    : DEFAULT_EXTENSIONS;

  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [projectUrl, setProjectUrl] = useState(item?.projectUrl ?? '');
  const [videoUrl, setVideoUrl] = useState(item?.videoUrl ?? '');
  const [thumb, setThumb] = useState<{ ids: string[]; busy: boolean }>({ ids: [], busy: false });
  const [gallery, setGallery] = useState<{ ids: string[]; busy: boolean }>({
    ids: [],
    busy: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError>();
  const onThumb = useCallback((ids: string[], b: boolean) => setThumb({ ids, busy: b }), []);
  const onGallery = useCallback((ids: string[], b: boolean) => setGallery({ ids, busy: b }), []);
  const uploading = thumb.busy || gallery.busy;

  const fields: Record<string, string> = {};
  for (const f of err?.details?.fields ?? []) fields[f.field] ??= f.message;
  const general = err && Object.keys(fields).length === 0 ? err.message : undefined;

  async function submit() {
    if (uploading) return;
    // A missing thumbnail/gallery is caught here so the API is not asked with an empty id.
    const missing = item
      ? []
      : (['thumbnailFileId', 'imageFileIds'] as const).filter(
          (f) => (f === 'thumbnailFileId' ? thumb : gallery).ids.length === 0,
        );
    if (missing.length) {
      const message = t('t_validator_required');
      setErr({ message, details: { fields: missing.map((field) => ({ field, message })) } });
      return;
    }
    setBusy(true);
    setErr(undefined);
    const common = {
      title: title.trim(),
      description: description.trim(),
      projectUrl: projectUrl.trim() || null,
      videoUrl: videoUrl.trim() || null,
    };
    const res = await (
      item
        ? api.PATCH('/portfolio-items/{portfolioItemId}', {
            params: { path: { portfolioItemId: item.id } },
            body: {
              ...common,
              ...(thumb.ids[0] ? { thumbnailFileId: thumb.ids[0] } : {}),
              ...(gallery.ids.length ? { imageFileIds: gallery.ids } : {}),
            },
          })
        : api.POST('/portfolio-items', {
            body: { ...common, thumbnailFileId: thumb.ids[0]!, imageFileIds: gallery.ids },
          })
    ).catch(() => undefined);
    if (!res?.data) {
      setBusy(false);
      setErr(
        (res?.error as ApiError | undefined) ?? { message: t('t_toast_something_went_wrong') },
      );
      return;
    }
    // Back to Selling → Portfolio with the legacy success message (+ the review note while pending, AC-25).
    const texts = [
      t(item ? 't_ur_project_updated_successfully' : 't_ur_project_created_successfully'),
    ];
    if (res.data.status === 'pending') texts.push(t('t_portfolio_pending_review'));
    setFlash(texts);
    router.dismissTo(MY_PORTFOLIO);
  }

  return (
    <>
      {item && item.status !== 'active' ? (
        <StatusNote status={item.status} reason={item.rejectionReason} t={t} />
      ) : null}

      <Input
        label={t('t_project_title')}
        placeholder={t('t_enter_project_title')}
        maxLength={100}
        value={title}
        onChangeText={setTitle}
        error={fields.title}
      />
      <Input
        label={t('t_project_description')}
        placeholder={t('t_enter_project_description')}
        multiline
        value={description}
        onChangeText={setDescription}
        error={fields.description}
      />
      <Input
        label={t('t_project_link_optional')}
        placeholder={t('t_https_example_com')}
        keyboardType="url"
        textContentType="URL"
        maxLength={120}
        value={projectUrl}
        onChangeText={setProjectUrl}
        error={fields.projectUrl}
      />
      <Input
        label={t('t_project_video_optional')}
        placeholder={t('t_youtube_placeholder')}
        keyboardType="url"
        textContentType="URL"
        maxLength={120}
        value={videoUrl}
        onChangeText={setVideoUrl}
        error={fields.videoUrl}
      />

      <View style={s.card}>
        <ImagePickerField
          api={api}
          t={t}
          label={t('t_project_thumbnail')}
          max={1}
          maxSizeMb={rule?.maxSizeMb ?? null}
          extensions={extensions}
          error={fields.thumbnailFileId}
          testID="thumbnail-picker"
          onChange={onThumb}
        />
        {item && thumb.ids.length === 0 ? (
          <Image
            source={{ uri: item.thumbnail.medium }}
            style={s.currentThumb}
            accessibilityLabel={item.title}
            accessibilityIgnoresInvertColors
            testID="current-thumbnail"
          />
        ) : null}
        <View style={s.divider} />
        <ImagePickerField
          api={api}
          t={t}
          label={t('t_project_images')}
          max={rule?.maxFiles ?? Number.POSITIVE_INFINITY}
          maxSizeMb={rule?.maxSizeMb ?? null}
          extensions={extensions}
          error={fields.imageFileIds}
          note={item ? t('t_portfolio_new_images_replace_gallery') : undefined}
          testID="gallery-picker"
          onChange={onGallery}
        />
        {item && gallery.ids.length === 0 ? (
          <View style={s.currentGallery} testID="current-gallery">
            {item.images.map((image) => (
              <Image
                key={image.fileId}
                source={{ uri: image.thumb }}
                style={s.currentImage}
                accessibilityLabel={item.title}
                accessibilityIgnoresInvertColors
              />
            ))}
          </View>
        ) : null}
      </View>

      {general ? <Notice kind="error" text={general} /> : null}
      <Button
        label={t(item ? 't_update_project' : 't_create_project')}
        busy={busy}
        disabled={uploading}
        onPress={() => void submit()}
      />
      {uploading ? (
        <Text style={s.muted} accessibilityLiveRegion="polite">
          {t('t_uploading')}
        </Text>
      ) : null}
      <LinkButton label={t('t_back_to_my_works')} onPress={() => router.dismissTo(MY_PORTFOLIO)} />
    </>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.card,
    padding: theme.space[4],
    gap: theme.space[3],
  },
  divider: { height: theme.borderWidth.hairline, backgroundColor: theme.colors.border.default },
  currentThumb: {
    width: '100%',
    aspectRatio: theme.size.layout.cardImageRatio,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  currentGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  currentImage: {
    width: theme.size.avatar.xl,
    height: theme.size.avatar.xl,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.skeleton,
  },
  muted: { ...theme.text.bodySm, color: theme.colors.text.secondary },
});
