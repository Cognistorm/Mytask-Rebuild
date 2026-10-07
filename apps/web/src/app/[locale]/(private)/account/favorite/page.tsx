'use client';
// Buying → Favourites `/account/favorite` (spec 04 AC-36; url-map §5).
import { DashboardShell } from '../../../../../components/dashboard/shell';
import { Favorites } from '../../../../../components/favorites/favorites';

export default function FavoritesPage() {
  return (
    <DashboardShell side="buying" active="favourites">
      <Favorites />
    </DashboardShell>
  );
}
