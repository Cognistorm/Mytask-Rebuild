'use client';
// Buying dashboard landing `/account/projects` (spec 02 AC-5, screens table: "lands on /account/projects",
// legacy `buyer-app.blade.php`). Slice 1 builds the shell with the Buying navigation; the projects list itself
// comes with spec 10 (slice 9), so the page shows the empty state until then.
import { EmptyState } from '@mytask/ui/web';
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { useLocale, useT } from '../../../../../lib/client';

export default function BuyingProjectsPage() {
  const locale = useLocale();
  const t = useT(locale);
  return (
    <DashboardShell side="buying" active="projects">
      <h1 className="mt-text-h2 mt-dash-title">{t('t_ordered_projects')}</h1>
      <EmptyState title={t('t_no_projects_yet')} />
    </DashboardShell>
  );
}
