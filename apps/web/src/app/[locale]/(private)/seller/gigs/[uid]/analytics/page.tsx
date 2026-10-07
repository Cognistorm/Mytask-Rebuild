'use client';
// Selling → Gigs → Analytics `/seller/gigs/{uid}/analytics` (spec 04 AC-39; url-map §5).
import { useParams } from 'next/navigation';
import { DashboardShell } from '../../../../../../../components/dashboard/shell';
import { GigAnalyticsView } from '../../../../../../../components/gig-analytics/gig-analytics';

export default function GigAnalyticsPage() {
  const { uid } = useParams<{ uid: string }>();
  return (
    <DashboardShell side="selling" active="gigs">
      <GigAnalyticsView uid={uid} />
    </DashboardShell>
  );
}
