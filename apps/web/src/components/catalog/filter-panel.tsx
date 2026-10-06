'use client';
// Gig list filters (spec 03 AC-9…AC-12, audit §3.3): rating, price min/max (GEL), delivery time. A plain GET form
// (works without JS) to the same list, keeping the keyword and the sort and going back to page 1. Min > max is
// refused before leaving the page (AC-10: the previous results stay). Desktop: the left column with "Filter";
// phones: a "Filter" button opens a full-screen sheet with a sticky "Show results" bar.
import { useState, type FormEvent } from 'react';
import type { Locale } from '@mytask/i18n';
import { Alert, SiteIcon } from '@mytask/ui/web';
import { useT } from '../../lib/client';
import {
  DELIVERY_KEYS,
  DELIVERY_TIMES,
  gelToTetri,
  RATINGS,
  SORTS,
  type ListQuery,
} from '../../lib/list-query';

export function FilterPanel(props: {
  locale: Locale;
  action: string;
  query: ListQuery;
  /** Keep the keyword as a hidden field (search page) — category pages have none. */
  keepKeyword: boolean;
  resetHref: string | null;
}) {
  const { query } = props;
  const t = useT(props.locale);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(query.priceError);
  const sortLegacy = SORTS.find((s) => s.value === query.sort)?.legacy ?? '';

  function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const data = new FormData(form);
    const min = gelToTetri(String(data.get('min_price') ?? ''));
    const max = gelToTetri(String(data.get('max_price') ?? ''));
    if (min !== null && max !== null && min > max) {
      e.preventDefault();
      setError(true);
      return;
    }
    // Empty fields stay out of the URL.
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (el.name && el.value === '' && el.type !== 'radio') el.disabled = true;
    }
  }

  return (
    <>
      <button
        type="button"
        className="mt-button mt-list-filter-open"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        data-testid="open-filters"
      >
        <SiteIcon name="menu" size={16} />
        {t('t_filter')}
      </button>
      <aside className="mt-list-filters" data-open={open} aria-label={t('t_filter')}>
        <form action={props.action} method="get" onSubmit={submit} data-testid="filters">
          <div className="mt-list-filters-head">
            <h2>{t('t_filter')}</h2>
            <button
              type="button"
              className="mt-icon-button"
              aria-label={t('t_ui_close')}
              onClick={() => setOpen(false)}
            >
              <SiteIcon name="close" />
            </button>
          </div>
          {props.keepKeyword && query.q && <input type="hidden" name="q" value={query.q} />}
          {sortLegacy && <input type="hidden" name="sort_by" value={sortLegacy} />}

          <fieldset>
            <legend>{t('t_rating')}</legend>
            {RATINGS.map((n) => (
              <label key={n} className="mt-list-option">
                <input type="radio" name="rating" value={n} defaultChecked={query.rating === n} />
                <span aria-hidden="true" className="mt-list-stars">
                  {'★'.repeat(n)}
                </span>
                {n === 5 ? t('t_5_stars') : t('t_rating_n_plus', { n })}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>{t('t_price')}</legend>
            <div className="mt-list-prices">
              <label>
                <span>{t('t_min_price')}</span>
                <input
                  name="min_price"
                  inputMode="decimal"
                  defaultValue={query.minPriceText}
                  onChange={() => setError(false)}
                  aria-invalid={error || undefined}
                />
              </label>
              <label>
                <span>{t('t_max_price')}</span>
                <input
                  name="max_price"
                  inputMode="decimal"
                  defaultValue={query.maxPriceText}
                  onChange={() => setError(false)}
                  aria-invalid={error || undefined}
                />
              </label>
            </div>
            {error && <Alert kind="error">{t('t_min_price_greater_than_max')}</Alert>}
          </fieldset>

          <fieldset>
            <legend>{t('t_delivery_time')}</legend>
            {DELIVERY_TIMES.map((d) => (
              <label key={d} className="mt-list-option">
                <input
                  type="radio"
                  name="delivery_time"
                  value={d}
                  defaultChecked={query.deliveryTime === d}
                />
                {t('t_up_to_delivery', { time: t(DELIVERY_KEYS[d]) })}
              </label>
            ))}
          </fieldset>

          <div className="mt-list-filters-actions">
            <button type="submit" className="mt-button mt-button-primary">
              <span className="mt-list-desktop-only">{t('t_filter')}</span>
              <span className="mt-list-phone-only">{t('t_show_results')}</span>
            </button>
            {props.resetHref && (
              <a className="mt-list-reset" href={props.resetHref}>
                {t('t_reset_filter')}
              </a>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}
