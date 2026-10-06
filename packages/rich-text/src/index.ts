// The one allow-list for stored HTML (CONVENTIONS §19, SEC-22). The API sanitises every write with it; web renders
// only API output, mobile passes the same profile to its HTML renderer. Nothing else may render stored HTML.
import allowList from '../allow-list.json';

export type RichTextProfileName = 'user_text' | 'user_text_links' | 'staff_content';

export interface RichTextProfile {
  /** Elements kept; any other element is removed and its text kept (except `dropWithContent`). */
  elements: readonly string[];
  /** Attributes kept per element; every other attribute is removed. */
  attributes: Readonly<Record<string, readonly string[]>>;
  /** `href` schemes allowed on `a`; a link with any other target is removed, its text kept. */
  linkSchemes: readonly string[];
  /** Site-relative `href` (`/path`) allowed. */
  relativeLinks: boolean;
  /** `img src` must point into `PUBLIC_MEDIA_BASE_URL`; other images are removed. */
  mediaLibraryImages: boolean;
  /** `rel` written on every kept link (null when the profile has no links). */
  linkRel: string | null;
}

export interface RichTextAllowList {
  /** Removed together with everything inside them. */
  dropWithContent: readonly string[];
  profiles: Readonly<Record<RichTextProfileName, RichTextProfile>>;
}

export const richTextAllowList: RichTextAllowList = allowList as RichTextAllowList;
