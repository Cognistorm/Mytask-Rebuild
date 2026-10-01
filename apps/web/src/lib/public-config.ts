'use client';
// getPublicConfig in the browser (spec 00 AC-11): clients hide entry points of switched-off features.
// One request per page load and language; the API answers with an ETag, so the browser revalidates cheaply.
import { useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { useApi } from './client';

export type PublicConfig = components['schemas']['PublicConfig'];
export type SocialProvider = components['schemas']['SocialProvider'];

const cache = new Map<Locale, Promise<PublicConfig | undefined>>();

/** `undefined` while loading or when the API is unreachable (entry points stay hidden). */
export function usePublicConfig(locale: Locale): PublicConfig | undefined {
  const api = useApi(locale);
  const [config, setConfig] = useState<PublicConfig>();
  useEffect(() => {
    let live = true;
    let pending = cache.get(locale);
    if (!pending) {
      pending = api.GET('/config/public').then(
        (res) => res.data,
        () => undefined,
      );
      // A failed request is not kept: the next page that needs the config asks again.
      void pending.then((c) => c ?? cache.delete(locale));
      cache.set(locale, pending);
    }
    void pending.then((c) => live && setConfig(c));
    return () => {
      live = false;
    };
  }, [api, locale]);
  return config;
}
