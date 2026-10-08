// Server-side load of the gig page `/service/{slug}` (spec 04 AC-26…AC-30, AC-33; contract `lookupGig`), as the
// visitor of the request so the owner gets `viewer.isOwner` and their pending/rejected gig. `cache` shares one API
// call between `generateMetadata` and the page.
import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { viewerApi } from '../../lib/api';

export type Gig = components['schemas']['Gig'];

/** The uid is the text after the last `-` of the slug (contract `lookupGig`; a slug without `-` is all uid). */
export function uidOfSlug(slug: string): string {
  return slug.slice(slug.lastIndexOf('-') + 1);
}

/** The gig for this slug, or the 404 page (unknown uid, deleted, others' pending/rejected; AC-28). */
export const loadGig = cache(async (locale: Locale, slug: string) => {
  const uid = uidOfSlug(slug);
  if (!uid || uid.length > 40) notFound();
  const { api } = await viewerApi(locale);
  const res = await api.GET('/gigs/lookup', { params: { query: { uid } } });
  if (res.response.status === 404 || res.response.status === 400) notFound();
  if (!res.data) throw new Error(`lookupGig failed with HTTP ${res.response.status}`);
  return res.data;
});

/** "You may also like" (`listRelatedGigs`, AC-32): up to 40 cards in random order; a failure hides the section. */
export async function loadRelated(locale: Locale, gigId: string) {
  try {
    const { api } = await viewerApi(locale);
    const res = await api.GET('/gigs/{gigId}/related', { params: { path: { gigId } } });
    return res.data?.gigs ?? [];
  } catch {
    return [];
  }
}
