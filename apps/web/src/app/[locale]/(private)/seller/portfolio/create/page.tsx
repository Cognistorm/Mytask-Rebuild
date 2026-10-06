'use client';
// Selling → Portfolio → Add a new work `/seller/portfolio/create` (spec 02 AC-24, AC-25). Open to every user (R-P1).
import { DashboardShell } from '../../../../../../components/dashboard/shell';
import { PortfolioForm } from '../../../../../../components/portfolio-edit/portfolio-form';

export default function CreatePortfolioPage() {
  return (
    <DashboardShell side="selling" active="portfolio">
      <PortfolioForm />
    </DashboardShell>
  );
}
