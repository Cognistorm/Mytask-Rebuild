'use client';
// Selling → Portfolio `/seller/portfolio` (spec 02 AC-27, AC-28, AC-42; url-map §5).
import { Suspense } from 'react';
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { MyPortfolio } from '../../../../../components/portfolio-edit/my-portfolio';

export default function MyPortfolioPage() {
  return (
    <DashboardShell side="selling" active="portfolio">
      <Suspense>
        <MyPortfolio />
      </Suspense>
    </DashboardShell>
  );
}
