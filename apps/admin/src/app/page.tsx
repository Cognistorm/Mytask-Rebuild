'use client';
// Phase 3 placeholder: the staff panel is client-rendered and talks to the API on its own origin
// (admin.mytask.ge/api/v1, staff cookies; ADR-010). Staff login arrives with slice 01/16.
import { useEffect, useState } from 'react';
import { createApiClient } from '@mytask/api-client';
import { createT } from '../lib/i18n';

const api = createApiClient({ baseUrl: '/api/v1', client: 'admin', credentials: 'same-origin' });
const t = createT('ka');

export default function AdminHome() {
  const [apiUp, setApiUp] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .GET('/health', { signal: AbortSignal.timeout(2000) })
      .then(({ data }) => setApiUp(data?.status === 'ok'))
      .catch(() => setApiUp(false));
  }, []);

  return (
    <main className="shell">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img src="/brand/mytask-logo-wordmark-trimmed.png" alt="MyTask.ge" height={32} />
      <h1 className="mt-text-h2">{t('t_dashboard')}</h1>
      {apiUp !== null && (
        <p data-testid="api-status" data-up={apiUp} className={apiUp ? 'ok' : 'down'}>
          {t(apiUp ? 't_platform_api_status_ok' : 't_platform_api_status_unreachable')}
        </p>
      )}
    </main>
  );
}
