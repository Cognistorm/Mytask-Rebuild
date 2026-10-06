// Selling → Portfolio → Edit my work `/seller/portfolio/{uid}/edit` (spec 02 AC-25, AC-27, AC-42; url-map §5).
import { DashboardShell } from '../../../../../../../components/dashboard/shell';
import { EditPortfolio } from '../../../../../../../components/portfolio-edit/edit-portfolio';

export default async function EditPortfolioPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <DashboardShell side="selling" active="portfolio">
      <EditPortfolio uid={uid} />
    </DashboardShell>
  );
}
