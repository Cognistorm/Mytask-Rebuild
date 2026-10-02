// CDN variants of a ready public image (ADR-009 §2): used by FilesService and every view that embeds an
// image (avatars in Me and profiles, later portfolio and gig galleries).
import type { components } from '@mytask/types';
import type { File as FileRow } from '../../generated/prisma/client';

/** Null unless the file is a ready `public_media` image with all three variants and a media base URL is set. */
export function imageVariants(
  row: FileRow,
  baseUrl: string | undefined,
): components['schemas']['ImageVariants'] | null {
  const v = row.variants as { thumb?: string; medium?: string; large?: string } | null;
  const base = baseUrl?.replace(/\/+$/, '');
  if (row.status !== 'ready' || row.bucket !== 'public_media' || !base) return null;
  if (!v?.thumb || !v.medium || !v.large) return null;
  return {
    fileId: row.id,
    thumb: `${base}/${v.thumb}`,
    medium: `${base}/${v.medium}`,
    large: `${base}/${v.large}`,
    width: row.width,
    height: row.height,
  };
}
