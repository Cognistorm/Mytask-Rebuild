'use client';
// Selling Home `/seller/home` (spec 02 AC-6, AC-7; design 07; legacy `Seller/Home/HomeComponent.php`,
// `livewire/main/seller/home/home.blade.php`). Reads only `getSellingDashboard`. Open to every active user
// (R-P1, EC-1). In slice 1 most figures are the contract's neutral values (0 / []); later slices fill them.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import {
  Alert,
  EmptyState,
  InfoButton,
  Panel,
  Price,
  ResponsiveTable,
  Skeleton,
  StatGrid,
  StatTile,
} from '@mytask/ui/web';
import { DashboardShell, useDashboard } from '../../../../../components/dashboard/shell';
import { href, useApi, useLocale, useT } from '../../../../../lib/client';
import { formatDate } from '../../../../../lib/format';

type Dashboard = components['schemas']['DashboardSelling'];
type OrderRow = components['schemas']['DashboardOrderRow'];
type AwardRow = components['schemas']['DashboardAwardedProjectRow'];

const ORDER_STATUS_KEY: Record<OrderRow['status'], string> = {
  awaiting_payment: 't_pending_payment',
  paid: 't_paid',
  in_progress: 't_in_progress',
  delivered: 't_delivered',
  revision_requested: 't_revision_requested',
  completed: 't_completed',
  canceled: 't_canceled',
  refunded: 't_refunded',
};

export default function SellingHomePage() {
  return (
    <DashboardShell side="selling" active="home">
      <SellingHome />
    </DashboardShell>
  );
}

function SellingHome() {
  const locale = useLocale();
  const t = useT(locale);
  const api = useApi(locale);
  const { otherSide } = useDashboard();
  const [data, setData] = useState<Dashboard>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api.GET('/me/dashboard/selling');
    // 401 / restricted are handled by the shell (redirect); anything else offers a retry.
    if (res.data) setData(res.data);
    else if (res.response.status !== 401 && res.response.status !== 403) setFailed(true);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const createGig = (
    <Link className="mt-button mt-button-primary" href={href(locale, '/create')}>
      {t('t_create_a_new_gig')}
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

  if (!data) return <Skeleton label={t('t_ui_loading')} tiles={8} rows={4} />;

  const { user, kpis } = data;
  const count = (n: number) => n.toLocaleString('en-US');

  return (
    <>
      <div className="mt-dash-heading">
        <div>
          <h1 className="mt-text-h2 mt-dash-title">
            {t('t_welcome_back')}, {user.fullName}!
          </h1>
          <p className="mt-dash-meta">
            {user.isIdVerified && (
              <span className="mt-dash-verified" data-testid="verified">
                {t('t_verified_account')}
              </span>
            )}
            <span data-testid="member-since">
              {t('t_member_since')} {formatDate(user.createdAt)}
            </span>
          </p>
        </div>
        <div className="mt-dash-actions">
          <Link className="mt-button" href={otherSide.href} onClick={otherSide.onSelect}>
            {t('t_switch_to_buying')}
          </Link>
          {createGig}
        </div>
      </div>

      <StatGrid>
        <StatTile
          testId="kpi-available"
          label={t('t_available_balance')}
          value={<Price money={kpis.availableBalance} />}
        />
        <StatTile
          testId="kpi-pending"
          label={t('t_pending_balance')}
          value={<Price money={kpis.pendingBalance} />}
          info={<InfoButton label={t('t_ui_more_info')}>{t('t_pending_balance_hint')}</InfoButton>}
        />
        <StatTile
          testId="kpi-earnings"
          label={t('t_earnings')}
          value={<Price money={kpis.earnings} />}
        />
        <StatTile testId="kpi-reach" label={t('t_total_reach')} value={count(kpis.totalReach)} />
        <StatTile testId="kpi-gigs" label={t('t_total_gigs')} value={count(kpis.totalGigs)} />
        <StatTile
          testId="kpi-awarded"
          label={t('t_awarded_projects')}
          value={count(kpis.awardedProjects)}
        />
        <StatTile
          testId="kpi-completed"
          label={t('t_completed_orders')}
          value={count(kpis.completedOrders)}
        />
        <StatTile
          testId="kpi-pending-orders"
          label={t('t_pending_orders')}
          value={count(kpis.pendingOrders)}
        />
        <StatTile
          testId="kpi-in-progress"
          label={t('t_orders_in_progress')}
          value={count(kpis.ordersInProgress)}
        />
        <StatTile
          testId="kpi-canceled"
          label={t('t_canceled_orders')}
          value={count(kpis.canceledOrders)}
        />
      </StatGrid>

      <div className="mt-dash-columns">
        <Panel title={t('t_new_messages')} testId="unread-contacts">
          {data.unreadContacts.length === 0 ? (
            <p className="mt-dash-muted">{t('t_no_messages_yet')}</p>
          ) : (
            <ul className="mt-dash-contacts">
              {data.unreadContacts.map((c) => (
                <li key={c.conversation.id}>
                  <Link href={href(locale, `/inbox/${c.conversation.id}`)}>
                    <span>{c.user.username}</span>
                    <span className="mt-dash-count">{c.unreadCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('t_latest_orders')} testId="latest-orders">
          {data.latestOrders.length === 0 ? (
            <EmptyState title={t('t_no_orders_yet')} action={createGig} />
          ) : (
            <ResponsiveTable<OrderRow>
              caption={t('t_latest_orders')}
              rows={data.latestOrders}
              rowKey={(r) => r.orderItemId}
              columns={[
                {
                  key: 'gig',
                  label: t('t_gig'),
                  render: (r) => (
                    <Link href={href(locale, `/seller/orders/${r.displayId}`)}>
                      {r.gig?.title ?? r.displayId}
                    </Link>
                  ),
                },
                { key: 'buyer', label: t('t_buyer'), render: (r) => r.buyer.username },
                {
                  key: 'total',
                  label: t('t_total'),
                  numeric: true,
                  render: (r) => <Price money={r.total} />,
                },
                {
                  key: 'status',
                  label: t('t_status'),
                  render: (r) => t(ORDER_STATUS_KEY[r.status]),
                },
                { key: 'date', label: t('t_date'), render: (r) => formatDate(r.createdAt) },
              ]}
            />
          )}
        </Panel>
      </div>

      {/* Hidden while projects are OFF (S-075): the API sends null. */}
      {data.latestAwardedProjects && (
        <Panel title={t('t_latest_awarded_projects')} testId="latest-awarded">
          {data.latestAwardedProjects.length === 0 ? (
            <EmptyState title={t('t_no_projects_yet')} action={createGig} />
          ) : (
            <ResponsiveTable<AwardRow>
              caption={t('t_latest_awarded_projects')}
              rows={data.latestAwardedProjects}
              rowKey={(r) => r.project.id}
              columns={[
                {
                  key: 'project',
                  label: t('t_project'),
                  render: (r) => (
                    <a href={href(locale, `/project/${r.project.pid}/${r.project.slug}`)}>
                      {r.project.title}
                    </a>
                  ),
                },
                { key: 'client', label: t('t_buyer'), render: (r) => r.client.username },
                {
                  key: 'amount',
                  label: t('t_total'),
                  numeric: true,
                  render: (r) => <Price money={r.amount} />,
                },
                {
                  key: 'date',
                  label: t('t_awarded_date'),
                  render: (r) => formatDate(r.acceptedAt),
                },
              ]}
            />
          )}
        </Panel>
      )}
    </>
  );
}
