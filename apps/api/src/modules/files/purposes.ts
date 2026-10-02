// Upload purposes (ADR-009 §2–§3, §5; contract FilePurpose). Deny by default: a purpose without a policy
// here is refused with 403 FORBIDDEN before any storage URL exists. Each slice adds its purposes together
// with the permission/context rule it needs (e.g. delivery → freelancer of `context.escrowId`, spec 06).
import type { FileBucket, FilePurpose } from '../../generated/prisma/client';
import type { SettingId } from '../../platform/settings/registry';
import type { SettingsService } from '../../platform/settings/settings.service';

/** Allowed MIME types per extension; the declared `contentType` must match the file name's extension. */
export const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
};

export interface PurposeLimits {
  extensions: readonly string[];
  maxMb: number;
  /** Register row behind the size limit, reported in `details.settingId`; null for fixed spec rules. */
  sizeSettingId: SettingId | null;
}

/**
 * What the worker does with a clean upload (ADR-009 §3.5): `public_image` = re-encoded WebP variants in
 * `public_media`; `private_image` = re-encoded in place of the original (EXIF/GPS removed), still private;
 * `none` = copied unchanged (documents, videos).
 */
export type Processing = 'public_image' | 'private_image' | 'none';

export interface PurposePolicy {
  /** Bucket of the ready file (ADR-009 §2). */
  finalBucket: FileBucket;
  processing: Processing;
  /** Bucket of the `quarantine/` upload: KYC never leaves the `kyc` bucket, everything else waits in `private`. */
  quarantineBucket: FileBucket;
  limits(settings: SettingsService): Promise<PurposeLimits>;
}

const IMAGES_JPG_PNG = ['jpg', 'jpeg', 'png'] as const;

export const PURPOSE_POLICIES: Partial<Record<FilePurpose, PurposePolicy>> = {
  // Spec 02 AC-16, P-24: JPG, JPEG, PNG, WEBP ≤ 2 MB; SVG refused.
  avatar: {
    finalBucket: 'public_media',
    processing: 'public_image',
    quarantineBucket: 'private',
    limits: () =>
      Promise.resolve({ extensions: [...IMAGES_JPG_PNG, 'webp'], maxMb: 2, sizeSettingId: null }),
  },
  // Spec 02 AC-24: JPG/PNG, each ≤ S-090 MB (thumbnail and gallery images).
  portfolio_image: {
    finalBucket: 'public_media',
    processing: 'public_image',
    quarantineBucket: 'private',
    limits: async (settings) => ({
      extensions: IMAGES_JPG_PNG,
      maxMb: await settings.get('S-090'),
      sizeSettingId: 'S-090',
    }),
  },
  // Spec 02 AC-36: document photos and selfie, JPG/JPEG/PNG ≤ 5 MB (legacy Account/Verification validators).
  kyc_document: {
    finalBucket: 'kyc',
    processing: 'private_image',
    quarantineBucket: 'kyc',
    limits: () => Promise.resolve({ extensions: IMAGES_JPG_PNG, maxMb: 5, sizeSettingId: null }),
  },
};

export const MB = 1024 * 1024;

/** Lower-case extension of a file name, without the dot; '' when there is none. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}
