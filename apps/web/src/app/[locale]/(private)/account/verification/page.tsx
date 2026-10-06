'use client';
// Verification centre `/account/verification` (spec 02 AC-36…AC-39; legacy `Account/Verification/
// VerificationComponent.php`, `account/verification/verification.blade.php`). Dashboard shell, Buying side, as
// the other `/account/*` pages; the account links are in the page's side card (AC-35).
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { VerificationCentre } from '../../../../../components/verification/verification-centre';

export default function VerificationPage() {
  return (
    <DashboardShell side="buying">
      <VerificationCentre />
    </DashboardShell>
  );
}
