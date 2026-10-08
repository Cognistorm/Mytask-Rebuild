'use client';
// The gig page gallery (ROADMAP 4.3.11b; spec 04 AC-26; screen 02): the gig's images in the shared Gallery with the
// page language's labels. Legacy shows the images only (the cover stood in for a video slide, which the new platform
// does not have); a gig without images shows its cover.
import type { components } from '@mytask/types';
import { Gallery } from '@mytask/ui/web';
import { useLocale, useT } from '../../lib/client';

type ImageVariants = components['schemas']['ImageVariants'];

export function GigGallery(props: {
  images: ImageVariants[];
  cover: ImageVariants;
  title: string;
  lang?: string;
}) {
  const t = useT(useLocale());
  const list = props.images.length > 0 ? props.images : [props.cover];
  return (
    <Gallery
      images={list.map((image) => ({
        id: image.fileId,
        src: image.large,
        thumb: image.thumb,
        width: image.width,
        height: image.height,
      }))}
      alt={props.title}
      lang={props.lang}
      labels={{
        region: t('t_gallery'),
        previous: t('t_ui_previous_image'),
        next: t('t_ui_next_image'),
        thumbnails: t('t_ui_choose_image'),
        enlarge: t('t_ui_view_larger'),
        close: t('t_ui_close'),
        imageOf: (n, total) => t('t_ui_image_of', { n, total }),
      }}
      testId="gig-gallery"
    />
  );
}
