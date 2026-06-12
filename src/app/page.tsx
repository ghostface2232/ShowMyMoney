// Home dashboard entry. After session validation, fetches dashboard data and goal/profile metadata via SSR and injects them into the header/summary/table.
import { redirect } from "next/navigation";

import { getDashboardData } from "@/actions/dashboard";
import { listGoals } from "@/actions/goals";
import { getProfile } from "@/actions/profile";
import { AppHeader } from "@/components/app-header";
import { AssetTable } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  const [dashboard, goals, profile] = await Promise.all([
    getDashboardData(),
    listGoals(),
    getProfile(),
  ]);

  const latest = dashboard.snapshots[0];
  const currentTotalAssets = latest
    ? Object.values(latest.entriesByCategory).reduce(
        (sum, entry) => sum + Number(entry.amount),
        0,
      )
    : 0;
  const hasSnapshot = dashboard.snapshots.length > 0;

  return (
    <>
      <AppHeader
        displayName={profile.displayName}
        firstUsedAt={profile.firstUsedAt}
        snapshots={dashboard.snapshots.map((snapshot) => ({
          id: snapshot.id,
          year_month: snapshot.year_month,
        }))}
        goals={goals}
        currentTotalAssets={currentTotalAssets}
        hasSnapshot={hasSnapshot}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-24 md:px-8">
        <SummaryCards dashboard={dashboard} />
        <AssetTable dashboard={dashboard} />
      </main>
    </>
  );
}
