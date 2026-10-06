// Server-side loads of the public profile pages (spec 02 AC-8, AC-9, AC-28), as the visitor of the request so
// the owner sees "Edit profile" and their own pending/rejected work. `cache` shares one API call between
// `generateMetadata` and the page.
import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { viewerApi } from '../../lib/api';

export type UserProfile = components['schemas']['UserProfile'];
export type PortfolioItem = components['schemas']['PortfolioItem'];
export type PortfolioItemPage = components['schemas']['PortfolioItemPage'];

/** Portfolio page size: the profile preview shows 6 (legacy), the portfolio page loads 24 at a time. */
export const PREVIEW_SIZE = 6;
export const PORTFOLIO_PAGE_SIZE = 24;

function failed(what: string, status: number): never {
  throw new Error(`${what} failed with HTTP ${status}`);
}

/** The profile, or the 404 page for pending, banned, deleted and unknown users (AC-9, EC-4). */
export const loadProfile = cache(async (locale: Locale, username: string) => {
  const { api, mayHaveSession } = await viewerApi(locale);
  const res = await api.GET('/users/{username}', { params: { path: { username } } });
  if (res.response.status === 404) notFound();
  if (!res.data) failed('getUserProfile', res.response.status);
  return { profile: res.data, mayHaveSession };
});

/** First page of a user's portfolio (only public items, plus the owner's own pending/rejected ones). */
export const loadPortfolio = cache(async (locale: Locale, username: string, limit: number) => {
  const { api } = await viewerApi(locale);
  const res = await api.GET('/portfolio-items', { params: { query: { username, limit } } });
  if (res.response.status === 404) notFound();
  if (!res.data) failed('listPortfolioItems', res.response.status);
  return res.data;
});

/** The seller's active gigs, newest first (listGigs, spec 02 AC-8: 6 at a time); a failure shows no block. */
export const loadGigs = cache(async (locale: Locale, username: string, limit: number) => {
  try {
    const { api } = await viewerApi(locale);
    const res = await api.GET('/gigs', { params: { query: { sellerUsername: username, limit } } });
    return res.data ?? null;
  } catch {
    return null;
  }
});

/** A portfolio item by its slug (the uid is its suffix); others' pending/rejected items are 404. */
export const loadPortfolioItem = cache(async (locale: Locale, slug: string) => {
  const { api, mayHaveSession, hasSession } = await viewerApi(locale);
  const res = await api.GET('/portfolio-items/lookup', { params: { query: { slug } } });
  if (res.response.status === 404 || res.response.status === 400) notFound();
  if (!res.data) failed('lookupPortfolioItem', res.response.status);
  return { item: res.data, mayHaveSession, hasSession };
});

/** The API's optional-user answer has no "viewer" field: a signed-in visitor can report, a guest cannot. */
export function isGuestView(profile: UserProfile): boolean {
  return !profile.isOwnProfile && !profile.canReport;
}
