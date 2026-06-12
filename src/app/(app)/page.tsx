// Home dashboard entry. Fetches dashboard data via SSR and injects it into the summary/table.
// Session guard and the shared header live in the (app) layout.
import { getDashboardData } from "@/actions/dashboard";
import { AssetTable } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";

export default async function HomePage() {
  const dashboard = await getDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-28 md:px-8">
      <SummaryCards dashboard={dashboard} />
      <AssetTable dashboard={dashboard} />
    </main>
  );
}
