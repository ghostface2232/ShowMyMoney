// 대시보드 초기 렌더에 필요한 데이터를 한 번에 수집하는 서버 액션.
// 카테고리 트리와 스냅샷(+엔트리)을 동시에 가져와 테이블 렌더에 최적화된 형태로 반환한다.
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
