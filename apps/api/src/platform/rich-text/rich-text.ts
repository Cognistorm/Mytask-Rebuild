// The one server-side HTML sanitiser (CONVENTIONS §19, SEC-22). Every field described as "sanitised HTML" or
// "formatted text" goes through `sanitize` on every write (and through `sanitizeRichText` in the Phase 5 ETL).
// The allow-list itself lives in `packages/rich-text/allow-list.json`, shared with the web and mobile renderers.
// Signing external `staff_content` links to `/redirect` (spec 17 AC-47) is done on read, once the signer exists.
import { Global, Inject, Injectable, Module } from '@nestjs/common';
import allowList from '@mytask/rich-text/allow-list.json';
import sanitizeHtml from 'sanitize-html';
import { ENV, type Env } from '../config/env';

export type RichTextProfileName = keyof typeof allowList.profiles;
type Profile = {
  elements: readonly string[];
  attributes: Readonly<Record<string, readonly string[]>>;
  linkSchemes: readonly string[];
  relativeLinks: boolean;
  mediaLibraryImages: boolean;
  linkRel: string | null;
};

/** C0 controls, space, DEL, C1 controls and Unicode spaces/invisibles, stripped before a URL is checked. */
const URL_NOISE: readonly (readonly [number, number])[] = [
  [0x0000, 0x0020],
  [0x007f, 0x00a0],
  [0x00ad, 0x00ad],
  [0x1680, 0x1680],
  [0x180e, 0x180e],
  [0x2000, 0x200f],
  [0x2028, 0x202f],
  [0x205f, 0x206f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
];
const SITE = 'https://site.invalid';
const NUMBER = /^[1-9][0-9]{0,3}$/;

function withoutNoise(raw: string | undefined): string {
  let out = '';
  for (const ch of raw ?? '') {
    const code = ch.codePointAt(0)!;
    if (!URL_NOISE.some(([from, to]) => code >= from && code <= to)) out += ch;
  }
  return out;
}

/** `href` allowed by the profile, normalised; null removes the link (its text is kept). */
function safeHref(raw: string | undefined, profile: Profile): string | null {
  const value = withoutNoise(raw);
  // Browsers read `\` as `/` in http(s) URLs (`/\evil.example` = `//evil.example`): never accept one.
  if (!value || value.includes('\\')) return null;
  if (value.startsWith('/') || value.startsWith('#')) {
    if (!profile.relativeLinks) return null;
    try {
      // Path-absolute or fragment only; protocol-relative `//host` leaves the site and is refused.
      return new URL(value, SITE).origin === SITE && !value.startsWith('//') ? value : null;
    } catch {
      return null;
    }
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null; // bare relative paths (`page`, `?q`) and anything unparsable
  }
  const scheme = url.protocol.slice(0, -1);
  if (!profile.linkSchemes.includes(scheme)) return null;
  // `https://mytask.ge@evil.example` shows a trusted name for another host.
  if (scheme !== 'mailto' && (!url.hostname || url.username || url.password)) return null;
  return url.href;
}

/** `img src` inside the public media library (SEC-32(d)): parsed, never a string-prefix test. */
function safeImageSrc(raw: string | undefined, base: URL | null): string | null {
  if (!base) return null;
  let url: URL;
  try {
    url = new URL(withoutNoise(raw));
  } catch {
    return null;
  }
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const inside =
    url.protocol === base.protocol &&
    url.host === base.host &&
    !url.username &&
    !url.password &&
    url.pathname.startsWith(basePath);
  return inside ? url.href : null;
}

function keepNumbers(attribs: Record<string, string>, names: readonly string[]) {
  const kept: Record<string, string> = {};
  for (const name of names) {
    const value = attribs[name]?.trim();
    if (value !== undefined && NUMBER.test(value)) kept[name] = value;
  }
  return kept;
}

/**
 * A link or image whose target was refused is left without `href`/`src` by its transformer and removed here, its
 * text kept. (Renaming it to a forbidden tag instead makes sanitize-html 2.17 close the NEXT sibling with that
 * name: its rename map is not cleared for skipped tags.)
 */
const unwrap = (frame: sanitizeHtml.IFrame): 'excludeTag' | false =>
  (frame.tag === 'a' && !frame.attribs.href) || (frame.tag === 'img' && !frame.attribs.src)
    ? 'excludeTag'
    : false;

function optionsFor(profile: Profile, mediaBase: URL | null): sanitizeHtml.IOptions {
  const allowedAttributes: Record<string, string[]> = {};
  for (const [tag, names] of Object.entries(profile.attributes))
    allowedAttributes[tag] = [...names];
  if (allowedAttributes.a) allowedAttributes.a.push('rel');
  const cells: sanitizeHtml.Transformer = (tagName, attribs): sanitizeHtml.Tag => ({
    tagName,
    attribs: keepNumbers(attribs, ['colspan', 'rowspan']),
  });
  const link: sanitizeHtml.Transformer = (tagName, attribs): sanitizeHtml.Tag => {
    const href = safeHref(attribs.href, profile);
    if (href === null || profile.linkRel === null) return { tagName, attribs: {} }; // removed by `unwrap`
    return { tagName, attribs: { href, rel: profile.linkRel } };
  };
  const image: sanitizeHtml.Transformer = (tagName, attribs): sanitizeHtml.Tag => {
    const src = profile.mediaLibraryImages ? safeImageSrc(attribs.src, mediaBase) : null;
    if (src === null) return { tagName, attribs: {} }; // removed by `unwrap`
    const kept: Record<string, string> = { src };
    if (attribs.alt !== undefined) kept.alt = attribs.alt;
    return { tagName, attribs: { ...kept, ...keepNumbers(attribs, ['width', 'height']) } };
  };
  return {
    allowedTags: [...profile.elements],
    allowedAttributes,
    allowedClasses: {},
    allowedStyles: {},
    allowedSchemes: [...profile.linkSchemes],
    allowedSchemesByTag: { img: mediaBase ? [mediaBase.protocol.slice(0, -1)] : [] },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    allowVulnerableTags: false,
    parseStyleAttributes: false,
    disallowedTagsMode: 'discard',
    nonTextTags: [...allowList.dropWithContent],
    exclusiveFilter: unwrap,
    transformTags: { a: link, img: image, th: cells, td: cells },
  };
}

/**
 * Cleans `html` with one profile of the shared allow-list. `mediaBaseUrl` is `PUBLIC_MEDIA_BASE_URL`; without it
 * every image is removed (fail closed).
 */
export function sanitizeRichText(
  html: string,
  profileName: RichTextProfileName,
  mediaBaseUrl?: string | null,
): string {
  const profile: Profile = allowList.profiles[profileName];
  const mediaBase = mediaBaseUrl ? new URL(mediaBaseUrl) : null;
  return sanitizeHtml(html, optionsFor(profile, mediaBase)).trim();
}

/**
 * Text content of sanitised HTML, for the owning spec's length and letter rules ("checked on the text content
 * after sanitising", CONVENTIONS §19). Entities are decoded, whitespace runs count as one space.
 */
export function richTextPlainText(html: string): string {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: [...allowList.dropWithContent],
  });
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class RichText {
  constructor(@Inject(ENV) private readonly env: Env) {}

  sanitize(html: string, profile: RichTextProfileName): string {
    return sanitizeRichText(html, profile, this.env.PUBLIC_MEDIA_BASE_URL);
  }

  plainText(html: string): string {
    return richTextPlainText(html);
  }
}

@Global()
@Module({ providers: [RichText], exports: [RichText] })
export class RichTextModule {}
