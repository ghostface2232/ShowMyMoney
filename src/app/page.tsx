// 홈 대시보드 진입점. 세션 검증 후 카테고리 트리를 SSR로 받아 헤더/요약/테이블에 주입한다.
import { redirect } from "next/navigation";

import { listCategoryTree } from "@/actions/categories";
import { AppHeader } from "@/components/app-header";
import { AssetTable } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  const categoryTree = await listCategoryTree();

  return (
    <>
      <AppHeader
        displayName={session.displayName}
        categoryTree={categoryTree}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <SummaryCards />
        <AssetTable />
      </main>
    </>
  );
}
