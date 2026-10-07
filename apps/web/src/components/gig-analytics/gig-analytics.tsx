'use client';
// Selling → Gigs → Analytics `/seller/gigs/{uid}/analytics` (ROADMAP 4.3.12b; spec 04 AC-39; ADR-012; legacy
// `Seller/Gigs/Options/AnalyticsComponent.php`, `seller/gigs/options/analytics.blade.php`): the public uid →
// `lookupGig` (owner only; anyone else, unknown or deleted → "Page not found" as the edit page) → `getGigAnalytics`.
// Totals as a KPI row; devices, browsers, operating systems, referrers, countries and cities as bar lists (legacy
// pies, a map and lists: one form for all, value printed on every row); the DB-IP credit under the location lists
// (CC BY 4.0, 4.3.5b handoff); recent orders as a table (empty until slice 5).
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  BarList,
  EmptyState,
  formatMoney,
  Panel,
  ResponsiveTable,
  Skeleton,
  StatGrid,
  StatTile,
  type BarItem,
} from '@mytask/ui/web';
import { formatDate } from '../../lib/format';
import { href, useApi, useLocale, useT } from '../../lib/client';
import './gig-analytics.css';

type Gig = components['schemas']['Gig'];
type Analytics = components['schemas']['GigAnalytics'];
type Bucket = components['schemas']['GigAnalyticsBucket'];
type Order = components['schemas']['GigAnalyticsOrder'];

/** Device types the API reports (ua-parser types; a browser without one counts as desktop). */
const DEVICES: Record<string, string> = {
  desktop: 't_ui_device_desktop',
  mobile: 't_ui_device_mobile',
  tablet: 't_ui_device_tablet',
};

/** Order item status (data-model §4.1) → legacy label; anything else is "Other" (contract `GigAnalyticsOrder`). */
const ORDER_STATUS: Record<string, string> = {
  awaiting_payment: 't_pending',
  paid: 't_pending',
  in_progress: 't_in_progress',
  delivered: 't_delivered',
  revision_requested: 't_revision_requested',
  completed: 't_completed',
  canceled: 't_canceled',
  refunded: 't_refunded',
};

export function GigAnalyticsView({ uid }: { uid: string }) {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const [gig, setGig] = useState<Gig | null>();
  const [data, setData] = useState<Analytics>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const found = await api
      .GET('/gigs/lookup', { params: { query: { uid } } })
      .catch(() => undefined);
    const status = found?.response.status;
    if (status === 404 || status === 400 || (found?.data && !found.data.viewer?.isOwner)) {
      return setGig(null);
    }
    if (!found?.data) return setFailed(true);
    const stats = await api
      .GET('/gigs/{gigId}/analytics', { params: { path: { gigId: found.data.id } } })
      .catch(() => undefined);
    if (stats?.response.status === 404) return setGig(null);
    if (!stats?.data) return setFailed(true);
    setGig(found.data);
    setData(stats.data);
  }, [api, uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const number = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const regions = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      return undefined;
    }
  }, [locale]);

  const back = (
    <Link className="mt-button" href={href(locale, '/seller/gigs')}>
      {t('t_back_to_gigs')}
    </Link>
  );

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
  if (gig === null) {
    return (
      <div data-testid="gig-not-found">
        <EmptyState title={t('t_page_not_fount')} action={back} />
      </div>
    );
  }
  if (!gig || !data) return <Skeleton label={t('t_ui_loading')} tiles={4} rows={4} />;

  const unknown = (label: string) => (label === 'unknown' ? t('t_unknown') : label);
  const bars = (list: Bucket[], name: (label: string) => string = unknown): BarItem[] =>
    list.map((b) => ({
      key: b.label,
      label: name(b.label),
      value: b.count,
      valueText: number.format(b.count),
    }));
  const device = (label: string) => (DEVICES[label] ? t(DEVICES[label]) : unknown(label));
  const country = (code: string) =>
    code === 'unknown' ? t('t_unknown') : (regions?.of(code.toUpperCase()) ?? code);

  const section = (id: string, title: string, subtitle: string, list: BarItem[]) => (
    <Panel title={title} testId={`analytics-${id}`}>
      <p className="mt-analytics-subtitle">{subtitle}</p>
      {list.length === 0 ? (
        <p className="mt-analytics-empty">{t('t_no_data_to_show_now')}</p>
      ) : (
        <BarList label={title} items={list} />
      )}
    </Panel>
  );

  return (
    <div className="mt-analytics">
      <div className="mt-analytics-heading">
        <div className="mt-analytics-titles">
          <h1 className="mt-analytics-title">{t('t_gig_analytics')}</h1>
          {/* The gig page is public: a full page load (ADR-019 §2). */}
          <a
            className="mt-analytics-gig"
            href={href(locale, `/service/${gig.slug}`)}
            lang={gig.contentLocale !== locale ? gig.contentLocale : undefined}
          >
            {gig.title}
          </a>
        </div>
        {back}
      </div>

      <StatGrid>
        <StatTile
          label={t('t_total_sales')}
          value={number.format(data.salesCount)}
          testId="kpi-sales"
        />
        <StatTile
          label={t('t_total_clicks')}
          value={number.format(data.clickCount)}
          testId="kpi-clicks"
        />
        <StatTile
          label={t('t_total_impressions')}
          value={number.format(data.impressionCount)}
          testId="kpi-impressions"
        />
        <StatTile
          label={t('t_total_reviews')}
          value={number.format(data.reviewCount)}
          testId="kpi-reviews"
        />
      </StatGrid>

      <div className="mt-analytics-grid">
        {section(
          'devices',
          t('t_devices'),
          t('t_devices_chart_subtitle'),
          bars(data.devices, device),
        )}
        {section('browsers', t('t_browsers'), t('t_browsers_chart_subtitle'), bars(data.browsers))}
        {section('os', t('t_os'), t('t_os_chart_subtitle'), bars(data.operatingSystems))}
        {section('referrers', t('t_referrers'), t('t_referrers_subtitle'), bars(data.referrers))}
        {section(
          'countries',
          t('t_countries'),
          t('t_ui_most_visits_by_countries'),
          bars(data.countries, country),
        )}
        {section('cities', t('t_cities'), t('t_most_visits_by_cities'), bars(data.cities))}
      </div>
      {/* CC BY 4.0 attribution of the local IP-location file (ADR-012, 4.3.5b). */}
      <p className="mt-analytics-credit" data-testid="dbip-credit">
        <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer">
          {t('t_ui_dbip_credit')}
        </a>
      </p>

      <Panel title={t('t_recent_orders')} testId="analytics-orders">
        {data.recentOrders.length === 0 ? (
          <p className="mt-analytics-empty">{t('t_no_data_to_show_now')}</p>
        ) : (
          <ResponsiveTable<Order>
            caption={t('t_recent_orders')}
            rows={data.recentOrders}
            rowKey={(o) => o.item.id}
            columns={[
              { key: 'id', label: t('t_id'), render: (o) => o.item.displayId },
              { key: 'buyer', label: t('t_buyer'), render: (o) => o.buyer.username },
              {
                key: 'price',
                label: t('t_price'),
                numeric: true,
                render: (o) => formatMoney(o.price),
              },
              {
                key: 'status',
                label: t('t_status'),
                render: (o) => t(ORDER_STATUS[o.status] ?? 't_other'),
              },
              { key: 'date', label: t('t_date'), render: (o) => formatDate(o.createdAt) },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
