'use client';
// Loads the owner's item for `/seller/portfolio/{uid}/edit` (url-map §5) by its public uid
// (`lookupPortfolioItem`), then shows the form. Someone else's item, or one that does not exist, is "Page not
// found" (the API answers 404 for others' pending/rejected items; an active one of someone else is not editable).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, EmptyState, Skeleton } from '@mytask/ui/web';
import { href, useApi, useLocale, useT } from '../../lib/client';
import { PortfolioForm } from './portfolio-form';

type Item = components['schemas']['PortfolioItem'];

export function EditPortfolio({ uid }: { uid: string }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [item, setItem] = useState<Item | null>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api
      .GET('/portfolio-items/lookup', { params: { query: { uid } } })
      .catch(() => undefined);
    if (res?.data) return setItem(res.data.isOwn ? res.data : null);
    if (res?.response.status === 404 || res?.response.status === 400) return setItem(null);
    setFailed(true);
  }, [api, uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div className="mt-dash-error">
        <Alert kind="error">{t('t_toast_something_went_wrong')}</Alert>
        <button type="button" className="mt-button" onClick={() => void load()}>
          {t('t_ui_retry')}
        </button>
      </div>
    );
  }
  if (item === undefined) return <Skeleton label={t('t_ui_loading')} rows={4} />;
  if (item === null) {
    return (
      <EmptyState
        title={t('t_page_not_fount')}
        action={
          <Link className="mt-button" href={href(locale, '/seller/portfolio')}>
            {t('t_back_to_my_works')}
          </Link>
        }
      />
    );
  }
  return <PortfolioForm item={item} />;
}
