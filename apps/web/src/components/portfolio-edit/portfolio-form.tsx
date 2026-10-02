'use client';
// Portfolio create / edit form (spec 02 AC-24, AC-25, AC-27, AC-42; screens table "Portfolio create/edit";
// legacy `livewire/main/seller/portfolio/options/create.blade.php` and `edit.blade.php`): title, description,
// project link, video link on the left; thumbnail and gallery on the right; one submit. Edit shows the current
// thumbnail and gallery; a new thumbnail or new gallery images replace them (only what changed is sent).
// A rejected item shows the "Rejected" chip and the reason above the form, a pending one the review note.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field, Pill, TextArea } from '@mytask/ui/web';
import { href, splitErrors, useApi, useLocale, useT, type ApiErrorBody } from '../../lib/client';
import { useDashboard } from '../dashboard/shell';
import { ImageUploader } from './image-uploader';
import './portfolio.css';

type Item = components['schemas']['PortfolioItem'];

/** Legacy fixed list (`CreateValidator.php`: jpeg,jpg,png); the public config may narrow it. */
const DEFAULT_EXTENSIONS = ['jpg', 'jpeg', 'png'];

export function PortfolioForm({ item }: { item?: Item }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const router = useRouter();
  const { config } = useDashboard();
  const rule = config?.uploads.portfolioImage;
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
  const [err, setErr] = useState<ApiErrorBody>();
  const { fields, general } = splitErrors(err);
  const onThumb = useCallback((ids: string[], b: boolean) => setThumb({ ids, busy: b }), []);
  const onGallery = useCallback((ids: string[], b: boolean) => setGallery({ ids, busy: b }), []);
  const uploading = thumb.busy || gallery.busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    // A missing thumbnail/gallery is caught here so the API is not asked with an empty id.
    const missing = item
      ? []
      : (['thumbnailFileId', 'imageFileIds'] as const).filter(
          (f) => (f === 'thumbnailFileId' ? thumb : gallery).ids.length === 0,
        );
    if (missing.length) {
      const message = t('t_validator_required');
      setErr({
        code: 'VALIDATION_FAILED',
        message,
        details: { fields: missing.map((field) => ({ field, message })) },
      });
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
    const res = item
      ? await api.PATCH('/portfolio-items/{portfolioItemId}', {
          params: { path: { portfolioItemId: item.id } },
          body: {
            ...common,
            ...(thumb.ids[0] ? { thumbnailFileId: thumb.ids[0] } : {}),
            ...(gallery.ids.length ? { imageFileIds: gallery.ids } : {}),
          },
        })
      : await api.POST('/portfolio-items', {
          body: { ...common, thumbnailFileId: thumb.ids[0]!, imageFileIds: gallery.ids },
        });
    if (res.error) {
      setBusy(false);
      setErr(res.error as ApiErrorBody);
      return;
    }
    // Back to Selling → Portfolio with the legacy success message (+ the review note while pending).
    const query = new URLSearchParams({ saved: item ? 'updated' : 'created' });
    if (res.data.status === 'pending') query.set('pending', '1');
    router.push(`${href(locale, '/seller/portfolio')}?${query}`);
  }

  return (
    <div className="mt-pf">
      <div className="mt-pf-heading">
        <h1 className="mt-pf-title">{t(item ? 't_edit_my_work' : 't_add_new_work')}</h1>
        <Link className="mt-button" href={href(locale, '/seller/portfolio')}>
          {t('t_back_to_my_works')}
        </Link>
      </div>

      {item?.status === 'rejected' && (
        <div className="mt-pf-status" data-testid="rejected-note">
          <Pill tone="danger">{t('t_portfolio_status_rejected')}</Pill>
          {item.rejectionReason && (
            <Alert kind="error">
              {t('t_portfolio_rejected_reason', { reason: item.rejectionReason })}
            </Alert>
          )}
        </div>
      )}
      {item?.status === 'pending' && (
        <div className="mt-pf-status" data-testid="pending-note">
          <Pill tone="warning">{t('t_pending')}</Pill>
          <Alert kind="info">{t('t_portfolio_pending_review')}</Alert>
        </div>
      )}

      <form className="mt-pf-layout" onSubmit={submit} noValidate>
        <div className="mt-pf-card mt-pf-fields">
          <Field
            label={t('t_project_title')}
            name="title"
            placeholder={t('t_enter_project_title')}
            maxLength={100}
            value={title}
            onChange={setTitle}
            error={fields.title}
          />
          <TextArea
            label={t('t_project_description')}
            name="description"
            placeholder={t('t_enter_project_description')}
            rows={10}
            value={description}
            onChange={setDescription}
            error={fields.description}
          />
          <Field
            label={t('t_project_link_optional')}
            name="projectUrl"
            type="url"
            placeholder={t('t_https_example_com')}
            maxLength={120}
            value={projectUrl}
            onChange={setProjectUrl}
            error={fields.projectUrl}
          />
          <Field
            label={t('t_project_video_optional')}
            name="videoUrl"
            type="url"
            placeholder={t('t_youtube_placeholder')}
            maxLength={120}
            value={videoUrl}
            onChange={setVideoUrl}
            error={fields.videoUrl}
          />
        </div>

        <div className="mt-pf-side">
          <div className="mt-pf-card">
            <ImageUploader
              locale={locale}
              label={t('t_project_thumbnail')}
              max={1}
              maxSizeMb={rule?.maxSizeMb ?? null}
              extensions={extensions}
              error={fields.thumbnailFileId}
              testId="thumbnail-uploader"
              onChange={onThumb}
            />
            {item && thumb.ids.length === 0 && (
              // eslint-disable-next-line @next/next/no-img-element -- media CDN variant
              <img
                className="mt-pf-current-thumb"
                src={item.thumbnail.medium}
                alt={item.title}
                data-testid="current-thumbnail"
              />
            )}
            <hr className="mt-pf-divider" />
            <ImageUploader
              locale={locale}
              label={t('t_project_images')}
              max={rule?.maxFiles ?? Number.POSITIVE_INFINITY}
              maxSizeMb={rule?.maxSizeMb ?? null}
              extensions={extensions}
              error={fields.imageFileIds}
              note={item ? t('t_portfolio_new_images_replace_gallery') : undefined}
              testId="gallery-uploader"
              onChange={onGallery}
            />
            {item && gallery.ids.length === 0 && (
              <ul className="mt-pf-current-gallery" data-testid="current-gallery">
                {item.images.map((img) => (
                  <li key={img.fileId}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- media CDN variant */}
                    <img src={img.thumb} alt={item.title} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {general && <Alert kind="error">{general}</Alert>}
          <button
            type="submit"
            className="mt-button mt-button-primary mt-pf-submit"
            disabled={busy || uploading}
            aria-busy={busy}
          >
            {t(item ? 't_update_project' : 't_create_project')}
          </button>
          {uploading && (
            <p className="mt-pf-muted" role="status">
              {t('t_uploading')}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
