// 홈 대시보드 진입점. 세션 검증 후 대시보드 데이터와 목표 리스트를 SSR로 받아 헤더/요약/테이블에 주입한다.
import { redirect } from "next/navigation";

import { getDashboardData } from "@/actions/dashboard";
import { listGoals } from "@/actions/goals";
import { AppHeader } from "@/components/app-header";
import { AssetTable } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  const [dashboard, goals] = await Promise.all([
    getDashboardData(),
    listGoals(),
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
        displayName={session.displayName}
        snapshots={dashboard.snapshots.map((snapshot) => ({
          id: snapshot.id,
          year_month: snapshot.year_month,
        }))}
        goals={goals}
        currentTotalAssets={currentTotalAssets}
        hasSnapshot={hasSnapshot}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <SummaryCards dashboard={dashboard} />
        <AssetTable dashboard={dashboard} />
      </main>
    </>
  );
}
