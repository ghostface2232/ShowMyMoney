// Home dashboard entry. Fetches dashboard data via SSR and hands it to the client dashboard (summary + table).
// Session guard and the shared header live in the (app) layout.
import { getDashboardData } from "@/actions/dashboard";
import { AssetDashboard } from "@/components/asset-dashboard";

export default async function HomePage() {
  const dashboard = await getDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-[calc(6rem+max(env(safe-area-inset-bottom),1rem))] md:px-8">
      <AssetDashboard dashboard={dashboard} />
    </main>
  );
}
