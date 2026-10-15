// Client body of the asset page: owns the optimistic dashboard mirror and feeds it to both
// the summary strip and the table, so a committed cell edit updates the totals instantly.
// Also serves the header's month add/delete while mounted.
"use client";

import { useMemo } from "react";

import type { DashboardData } from "@/actions/dashboard";
import { useRegisterAssetActions } from "@/components/asset-actions";
import { AssetTable, useOptimisticDashboard } from "@/components/asset-table";
import { SummaryCards } from "@/components/summary-cards";

export function AssetDashboard({ dashboard }: { dashboard: DashboardData }) {
  const {
    dashboard: localDashboard,
    renderKeys,
    actions,
    addSnapshot,
    deleteSnapshot,
  } = useOptimisticDashboard(dashboard);

  // Lets the header's month management update the table without a server round trip.
  const headerHandlers = useMemo(
    () => ({ addSnapshot, deleteSnapshot }),
    [addSnapshot, deleteSnapshot],
  );
  useRegisterAssetActions(headerHandlers);

  return (
    <>
      <SummaryCards dashboard={localDashboard} />
      <AssetTable
        dashboard={localDashboard}
        renderKeys={renderKeys}
        actions={actions}
        onAddSnapshot={addSnapshot}
      />
    </>
  );
}
