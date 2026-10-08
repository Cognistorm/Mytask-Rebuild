// Upload purposes (ADR-009 §2–§3, §5; contract FilePurpose). Deny by default: a purpose without a policy
// here is refused with 403 FORBIDDEN before any storage URL exists. Each slice adds its purposes together
// with the permission/context rule it needs (e.g. delivery → freelancer of `context.escrowId`, spec 06).
import type { FileBucket, FilePurpose } from '../../generated/prisma/client';
import type { SettingId } from '../../platform/settings/registry';
import type { PermissionCode } from '../auth/auth.guard';
import type { SettingsService } from '../../platform/settings/settings.service';

/**
 * Allowed MIME types per extension; the declared `contentType` must match the file name's extension. Several
 * names per type are what browsers and phones really send; for documents and videos many systems know no type
 * and send `application/octet-stream`. The worker's magic-byte check decides the real type (scan/magic.ts).
 */
const UNKNOWN = 'application/octet-stream';
export const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  doc: ['application/msword', UNKNOWN],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', UNKNOWN],
  txt: ['text/plain'],
  mp4: ['video/mp4'],
  mov: ['video/quicktime', UNKNOWN],
  avi: ['video/x-msvideo', 'video/avi', 'video/msvideo', UNKNOWN],
  mkv: ['video/x-matroska', UNKNOWN],
  webm: ['video/webm', 'audio/webm'],
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
  /**
   * Who uploads this purpose: users through `createFileUpload`, staff through `adminCreateFileUpload` with
   * the given permission (contract `x-permission.permissionBy`). Each side refuses the other's purposes.
   */
  uploader: { kind: 'user' } | { kind: 'staff'; permission: PermissionCode };
  /** Bucket of the ready file (ADR-009 §2). */
  finalBucket: FileBucket;
  processing: Processing;
  /** Bucket of the `quarantine/` upload: KYC never leaves the `kyc` bucket, everything else waits in `private`. */
  quarantineBucket: FileBucket;
  /** Register switch that must be ON for new uploads (403 FEATURE_DISABLED, spec 00 EC-1 pattern). */
  enabledBy?: SettingId;
  limits(settings: SettingsService): Promise<PurposeLimits>;
}

const IMAGES_JPG_PNG = ['jpg', 'jpeg', 'png'] as const;
const USER = { kind: 'user' } as const;

/** Spec 04 AC-13: gig thumbnail and gallery images, JPG/PNG ≤ S-078 MB (the count 1…S-077 is checked on save). */
const gigImage: PurposePolicy = {
  uploader: USER,
  finalBucket: 'public_media',
  processing: 'public_image',
  quarantineBucket: 'private',
  limits: async (settings) => ({
    extensions: IMAGES_JPG_PNG,
    maxMb: await settings.get('S-078'),
    sizeSettingId: 'S-078',
  }),
};

/**
 * Staff images (Owner 2026-10-02, Q-161): the legacy admin types without SVG (ADR-009 §5, script risk),
 * at most 5 MB like the platform's other images (S-078). Fixed rules, no setting.
 */
function staffImage(permission: PermissionCode, extensions: readonly string[]): PurposePolicy {
  return {
    uploader: { kind: 'staff', permission },
    finalBucket: 'public_media',
    processing: 'public_image',
    quarantineBucket: 'private',
    limits: () => Promise.resolve({ extensions, maxMb: 5, sizeSettingId: null }),
  };
}

export const PURPOSE_POLICIES: Partial<Record<FilePurpose, PurposePolicy>> = {
  // Spec 02 AC-16, P-24: JPG, JPEG, PNG, WEBP ≤ 2 MB; SVG refused.
  avatar: {
    uploader: USER,
    finalBucket: 'public_media',
    processing: 'public_image',
    quarantineBucket: 'private',
    limits: () =>
      Promise.resolve({ extensions: [...IMAGES_JPG_PNG, 'webp'], maxMb: 2, sizeSettingId: null }),
  },
  // Spec 02 AC-24: JPG/PNG, each ≤ S-090 MB (thumbnail and gallery images).
  portfolio_image: {
    uploader: USER,
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
    uploader: USER,
    finalBucket: 'kyc',
    processing: 'private_image',
    quarantineBucket: 'kyc',
    limits: () => Promise.resolve({ extensions: IMAGES_JPG_PNG, maxMb: 5, sizeSettingId: null }),
  },
  gig_thumbnail: gigImage,
  gig_image: gigImage,
  // Spec 04 AC-14, EC-8: PDF ≤ S-082 MB, only while S-080 is ON. Public downloads as legacy (R-G11,
  // data-model §3.D): kept as uploaded (after the virus scan) in `public_media`.
  gig_document: {
    uploader: USER,
    finalBucket: 'public_media',
    processing: 'none',
    quarantineBucket: 'private',
    enabledBy: 'S-080',
    limits: async (settings) => ({
      extensions: ['pdf'],
      maxMb: await settings.get('S-082'),
      sizeSettingId: 'S-082',
    }),
  },
  // Spec 01 AC-47: restriction appeal files, ≤ S-092 MB of the S-093 types (Q-154). Documents and videos are
  // kept as uploaded (after the virus scan) in `private`; only staff download them (R-A8).
  appeal_file: {
    uploader: USER,
    finalBucket: 'private',
    processing: 'none',
    quarantineBucket: 'private',
    limits: async (settings) => ({
      extensions: (await settings.get('S-093')).map((e) => e.toLowerCase()),
      maxMb: await settings.get('S-092'),
      sizeSettingId: 'S-092',
    }),
  },
  // Spec 16 AC-60: category icon/image (legacy `Admin/Categories/CreateValidator.php:44-46`).
  category_image: staffImage('catalog.write', IMAGES_JPG_PNG),
  // Spec 17 blog article image (legacy `Admin/Blog/CreateValidator.php:42`, SVG dropped).
  blog_image: staffImage('content.write', [...IMAGES_JPG_PNG, 'gif']),
  // Spec 17 AC-35 logo cloud (S-109); legacy had no upload screen, site-logo types `Settings/GeneralValidator.php:32`.
  home_logo: staffImage('content.write', [...IMAGES_JPG_PNG, 'webp', 'gif']),
};

export const MB = 1024 * 1024;

/** Lower-case extension of a file name, without the dot; '' when there is none. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}
