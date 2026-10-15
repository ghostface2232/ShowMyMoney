// Client body of the asset page: owns the optimistic dashboard mirror and feeds it to both
// the summary strip and the table, so a committed cell edit updates the totals instantly.
"use client";

import type { DashboardData } from "@/actions/dashboard";
import { AssetTable, useOptimisticDashboard } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";

export function AssetDashboard({ dashboard }: { dashboard: DashboardData }) {
  const {
    dashboard: localDashboard,
    actions,
    addSnapshot,
  } = useOptimisticDashboard(dashboard);

  return (
    <>
      <SummaryCards dashboard={localDashboard} />
      <AssetTable
        dashboard={localDashboard}
        actions={actions}
        onAddSnapshot={addSnapshot}
      />
    </>
  );
}
