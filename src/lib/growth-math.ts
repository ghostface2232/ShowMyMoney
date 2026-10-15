// Computes monthly growth as multiple series per group. For each group, derives the difference in entry sums between adjacent snapshots.

import type { CategoryGroupWithCategories } from "@/actions/categories";
import type { SnapshotWithEntries } from "@/actions/dashboard";
import { assignIdentityColors } from "@/lib/category-visual";
import { formatYearMonth } from "@/lib/format";


export type GrowthSeries = {
  id: string;
  name: string;
  color: string;
};

export type GrowthPoint = {
  yearMonth: number;
  label: string;
  [groupId: string]: number | string;
};

export function calcMultiGrowthSeries(
  ascendingSnapshots: SnapshotWithEntries[],
  groups: CategoryGroupWithCategories[],
): { data: GrowthPoint[]; series: GrowthSeries[] } {
  // Identity colors (not rank): reordering groups never recolors a series.
  const colors = assignIdentityColors(groups);
  const series: GrowthSeries[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    color: colors.get(group.id) ?? "var(--chart-1)",
  }));

  if (ascendingSnapshots.length < 2 || groups.length === 0) {
    return { data: [], series };
  }

  const sumFor = (
    snap: SnapshotWithEntries,
    categoryIds: string[],
  ): number => {
    let total = 0;
    for (const id of categoryIds) {
      const entry = snap.entriesByCategory[id];
      if (entry) total += Number(entry.amount);
    }
    return total;
  };

  const data: GrowthPoint[] = [];
  for (let i = 1; i < ascendingSnapshots.length; i++) {
    const current = ascendingSnapshots[i];
    const previous = ascendingSnapshots[i - 1];
    const point: GrowthPoint = {
      yearMonth: current.year_month,
      label: formatYearMonth(current.year_month),
    };
    for (const group of groups) {
      const ids = group.categories.map((c) => c.id);
      point[group.id] = sumFor(current, ids) - sumFor(previous, ids);
    }
    data.push(point);
  }

  return { data, series };
}
