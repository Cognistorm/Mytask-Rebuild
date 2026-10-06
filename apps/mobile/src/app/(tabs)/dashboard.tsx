// Dashboard tab (spec 02 AC-2…AC-7; design 07 "Native app"; legacy `Seller/Home/HomeComponent.php`,
// `livewire/main/seller/home/home.blade.php`, `buyer-app.blade.php`). Opens the side chosen last (AC-3), the
// Buying / Selling switcher on top (no new login, AC-2), then the side's first section — Selling Home from
// `getSellingDashboard`, or the Buying landing (Projects, or Orders while S-075 is OFF) — and the side's nav.
// In slice 1 most figures are the contract's neutral values (0 / []); later slices fill them.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import {
  EmptyState,
  NavList,
  RoleBadge,
  RoleSwitcher,
  Row,
  SecondaryButton,
  Section,
  Skeleton,
  StatGrid,
  StatTile,
} from '../../components/dashboard';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { navItems, useDashboardSide } from '../../lib/dashboard';
import { formatCount, formatDate, formatMoney } from '../../lib/format';
import { createT } from '../../lib/i18n';
import { RequireMe, useSwitchDashboard } from '../../lib/me';
import { usePublicConfig } from '../../lib/public-config';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Dashboard = components['schemas']['DashboardSelling'];
type OrderRow = components['schemas']['DashboardOrderRow'];

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

/** Guests go to login (Owner Q-167): this tab needs the signed-in account. */
export default function DashboardTab() {
  return (
    <RequireMe>
      <DashboardTabScreen />
    </RequireMe>
  );
}

function DashboardTabScreen() {
  const side = useDashboardSide() ?? 'buying';
  const config = usePublicConfig(locale);
  const switchTo = useSwitchDashboard(api);
  const nav = navItems(side, config);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.content}>
        <RoleSwitcher
          label={t('t_dashboard_switcher')}
          current={side}
          items={[
            { side: 'buying', label: t('t_buying') },
            { side: 'selling', label: t('t_selling') },
          ]}
          onSelect={switchTo}
        />
        <RoleBadge
          side={side}
          label={t(side === 'selling' ? 't_seller_dashboard' : 't_buyer_dashboard')}
        />
        {side === 'selling' ? (
          <SellingHome onSwitch={() => switchTo('buying')} />
        ) : (
          <BuyingHome projectsOn={config?.projects.enabled ?? true} />
        )}
        <NavList
          label={t(side === 'selling' ? 't_selling_navigation' : 't_buying_navigation')}
          items={nav.map((n) => ({ key: n.key, label: t(n.label) }))}
          onPress={(key) => {
            const item = nav.find((n) => n.key === key);
            if (item) router.push(item.screen as never);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Buying landing: Projects (legacy), or Orders while projects are OFF. Lists come with specs 06 / 10. */
function BuyingHome({ projectsOn }: { projectsOn: boolean }) {
  return (
    <Section title={t(projectsOn ? 't_ordered_projects' : 't_buy_services')} testID="buying-home">
      <EmptyState title={t(projectsOn ? 't_no_projects_yet' : 't_no_orders_yet')} />
    </Section>
  );
}

// "Create a new gig" (AC-7) appears once the app has the gig wizard (spec 04, slice 3); until then it would
// open a dead end, so it is left out (null).
const createGig: ReactNode = null;

function SellingHome({ onSwitch }: { onSwitch: () => void }) {
  const [data, setData] = useState<Dashboard>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await api.GET('/me/dashboard/selling');
    if (res.data) setData(res.data);
    else setFailed(true);
  }, []);

  // Fresh figures every time the tab is shown.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (failed) {
    return (
      <View style={s.block}>
        <Notice kind="error" text={t('t_toast_something_went_wrong')} />
        <SecondaryButton label={t('t_ui_retry')} onPress={() => void load()} />
      </View>
    );
  }
  if (!data) return <Skeleton label={t('t_ui_loading')} tiles={8} rows={3} />;

  const { user, kpis } = data;
  const money = (m: components['schemas']['Money']) => ({
    value: formatMoney(m),
    negative: m.amount < 0,
  });

  return (
    <View style={s.block}>
      <View style={s.welcome}>
        <Text style={s.title} accessibilityRole="header">
          {t('t_welcome_back')}, {user.fullName}!
        </Text>
        {user.isIdVerified ? <Text style={s.verified}>{t('t_verified_account')}</Text> : null}
        <Text style={s.meta}>
          {t('t_member_since')} {formatDate(user.createdAt)}
        </Text>
      </View>
      {createGig}
      <SecondaryButton label={t('t_switch_to_buying')} onPress={onSwitch} />

      <StatGrid>
        <StatTile
          testID="kpi-available"
          label={t('t_available_balance')}
          {...money(kpis.availableBalance)}
        />
        <StatTile
          testID="kpi-pending"
          label={t('t_pending_balance')}
          {...money(kpis.pendingBalance)}
          info={{ label: t('t_ui_more_info'), text: t('t_pending_balance_hint') }}
        />
        <StatTile testID="kpi-earnings" label={t('t_earnings')} {...money(kpis.earnings)} />
        <StatTile label={t('t_total_reach')} value={formatCount(kpis.totalReach)} />
        <StatTile label={t('t_total_gigs')} value={formatCount(kpis.totalGigs)} />
        <StatTile label={t('t_awarded_projects')} value={formatCount(kpis.awardedProjects)} />
        <StatTile label={t('t_completed_orders')} value={formatCount(kpis.completedOrders)} />
        <StatTile label={t('t_pending_orders')} value={formatCount(kpis.pendingOrders)} />
        <StatTile label={t('t_orders_in_progress')} value={formatCount(kpis.ordersInProgress)} />
        <StatTile label={t('t_canceled_orders')} value={formatCount(kpis.canceledOrders)} />
      </StatGrid>

      {/* Rows open their screens once chat (slice 08) and orders (slice 05) exist in the app. */}
      <Section title={t('t_new_messages')} testID="unread-contacts">
        {data.unreadContacts.length === 0 ? (
          <Text style={s.meta}>{t('t_no_messages_yet')}</Text>
        ) : (
          data.unreadContacts.map((c) => (
            <Row key={c.conversation.id} title={c.user.username} lines={[String(c.unreadCount)]} />
          ))
        )}
      </Section>

      <Section title={t('t_latest_orders')} testID="latest-orders">
        {data.latestOrders.length === 0 ? (
          <EmptyState title={t('t_no_orders_yet')} action={createGig} />
        ) : (
          data.latestOrders.map((r) => (
            <Row
              key={r.orderItemId}
              title={r.gig?.title ?? r.displayId}
              lines={[
                `${t('t_buyer')}: ${r.buyer.username}`,
                `${t('t_total')}: ${formatMoney(r.total)}`,
                `${t('t_status')}: ${t(ORDER_STATUS_KEY[r.status])}`,
                `${t('t_date')}: ${formatDate(r.createdAt)}`,
              ]}
            />
          ))
        )}
      </Section>

      {/* Hidden while projects are OFF (S-075): the API sends null. */}
      {data.latestAwardedProjects ? (
        <Section title={t('t_latest_awarded_projects')} testID="latest-awarded">
          {data.latestAwardedProjects.length === 0 ? (
            <EmptyState title={t('t_no_projects_yet')} action={createGig} />
          ) : (
            data.latestAwardedProjects.map((r) => (
              <Row
                key={r.project.id}
                title={r.project.title}
                lines={[
                  `${t('t_buyer')}: ${r.client.username}`,
                  `${t('t_total')}: ${formatMoney(r.amount)}`,
                  `${t('t_awarded_date')}: ${formatDate(r.acceptedAt)}`,
                ]}
              />
            ))
          )}
        </Section>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[4] },
  block: { gap: theme.space[4] },
  welcome: { gap: theme.space[1] },
  title: { ...theme.text.h2, color: theme.colors.text.primary },
  verified: { ...theme.text.label, color: theme.colors.text.success },
  meta: { ...theme.text.bodySm, color: theme.colors.text.secondary },
});
