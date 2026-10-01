// getPublicConfig in the app (spec 00 AC-11): entry points of switched-off features stay hidden.
// One request per app start and language; a failed request is not kept, so the next screen asks again.
import { useEffect, useState } from 'react';
import type { Locale } from '@mytask/api-client';
import type { components } from '@mytask/types';
import { mobileApi } from './api';

export type PublicConfig = components['schemas']['PublicConfig'];
export type SocialProvider = components['schemas']['SocialProvider'];

const cache = new Map<Locale, Promise<PublicConfig | undefined>>();

/** `undefined` while loading or when the API is unreachable (entry points stay hidden). */
export function usePublicConfig(locale: Locale): PublicConfig | undefined {
  const [config, setConfig] = useState<PublicConfig>();
  useEffect(() => {
    let live = true;
    let pending = cache.get(locale);
    if (!pending) {
      pending = mobileApi(locale)
        .GET('/config/public')
        .then(
          (res) => res.data,
          () => undefined,
        );
      void pending.then((c) => c ?? cache.delete(locale));
      cache.set(locale, pending);
    }
    void pending.then((c) => live && setConfig(c));
    return () => {
      live = false;
    };
  }, [locale]);
  return config;
}
