// 홈 대시보드 진입점. 세션이 없으면 /login, 있으면 헤더/요약/테이블을 SSR로 렌더한다.
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AssetTable } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader displayName={session.displayName} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <SummaryCards />
        <AssetTable />
      </main>
    </>
  );
}
