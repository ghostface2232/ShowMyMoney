// Server action that collects all data needed for the dashboard's initial render in one call.
// Fetches the category tree and snapshots (+entries) concurrently and returns them in a table-render-optimized shape.
"use server";

import {
  listCategoryTree,
  type CategoryGroupWithCategories,
} from "@/actions/categories";
import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Entry, Snapshot } from "@/types/db";

export type SnapshotWithEntries = Snapshot & {
  entriesByCategory: Record<string, Entry>;
};

export type DashboardData = {
  categoryTree: CategoryGroupWithCategories[];
  snapshots: SnapshotWithEntries[];
};

type SnapshotRow = Snapshot & { entries: Entry[] | null };

export async function getDashboardData(): Promise<DashboardData> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const [categoryTree, snapshotsResult] = await Promise.all([
    listCategoryTree(),
    supabase
      .from("snapshots")
      .select(
        "id, account_id, year_month, note, created_at, entries(id, snapshot_id, category_id, amount, created_at, updated_at)",
      )
      .eq("account_id", accountId)
      .order("year_month", { ascending: false }),
  ]);

  if (snapshotsResult.error) {
    throw new Error(
      `스냅샷을 불러오지 못했습니다: ${snapshotsResult.error.message}`,
    );
  }

  const rows = (snapshotsResult.data ?? []) as SnapshotRow[];

  const snapshots: SnapshotWithEntries[] = rows.map(
    ({ entries, ...snapshot }) => {
      const entriesByCategory: Record<string, Entry> = {};
      for (const entry of entries ?? []) {
        entriesByCategory[entry.category_id] = entry;
      }
      return { ...snapshot, entriesByCategory };
    },
  );

  return { categoryTree, snapshots };
}
