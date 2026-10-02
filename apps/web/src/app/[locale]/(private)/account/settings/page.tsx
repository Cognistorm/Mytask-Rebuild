'use client';
// Account settings `/account/settings` (spec 02 AC-29…AC-35; legacy `Account/Settings/SettingsComponent.php`,
// `account/settings/settings.blade.php`). Inside the dashboard shell on the Buying side (the `/account/*`
// pages); no navigation item is active: the account links are in the page's own side card (AC-35).
import { AccountSettings } from '../../../../../components/account-settings/account-settings';
import { DashboardShell } from '../../../../../components/dashboard/shell';

export default function AccountSettingsPage() {
  return (
    <DashboardShell side="buying">
      <AccountSettings />
    </DashboardShell>
  );
}
