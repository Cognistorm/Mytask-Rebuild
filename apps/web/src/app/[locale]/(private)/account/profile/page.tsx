'use client';
// Edit profile `/account/profile` (spec 02 AC-15…AC-23, P-23: restores the legacy screen that has no route on
// the live site). Inside the dashboard shell (Selling side: profile, portfolio and availability are what
// buyers see of a freelancer); no navigation item is active.
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { EditProfile } from '../../../../../components/profile-edit/edit-profile';

export default function EditProfilePage() {
  return (
    <DashboardShell side="selling">
      <EditProfile />
    </DashboardShell>
  );
}
