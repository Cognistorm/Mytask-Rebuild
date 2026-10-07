'use client';
// Counts the gig page visit (ROADMAP 4.3.12c; spec 04 AC-34; contract `recordGigView`, ADR-012): once after the page
// renders, from the browser so the API sees the visitor's user agent and IP, with `document.referrer` (the API keeps
// only its domain). Not sent for the owner (the API would ignore it). A failure is silent: the page works without it.
import { useEffect, useRef } from 'react';
import { useApi, useLocale } from '../../lib/client';

export function RecordGigView({ gigId }: { gigId: string }) {
  const api = useApi(useLocale());
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return; // once per page, also under React's development double effects
    sent.current = true;
    void api
      .POST('/gigs/{gigId}/views', {
        params: { path: { gigId } },
        body: { referrer: document.referrer || null },
      })
      .catch(() => undefined);
  }, [api, gigId]);
  return null;
}
