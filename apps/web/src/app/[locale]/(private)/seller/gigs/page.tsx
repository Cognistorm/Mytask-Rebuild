'use client';
// Selling → Gigs `/seller/gigs` (spec 04 AC-20, AC-24; url-map §5).
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { MyGigs } from '../../../../../components/my-gigs/my-gigs';

export default function MyGigsPage() {
  return (
    <DashboardShell side="selling" active="gigs">
      <MyGigs />
    </DashboardShell>
  );
}
