// 월별 증식량을 그룹별 다중 시리즈로 계산한다. 인접한 스냅샷의 엔트리 합 차이를 각 그룹에 대해 산출한다.

import type { CategoryGroupWithCategories } from "@/actions/categories";
import type { SnapshotWithEntries } from "@/actions/dashboard";
import { formatYearMonth } from "@/lib/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

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
  const series: GrowthSeries[] = groups.map((group, index) => ({
    id: group.id,
    name: group.name,
    color: CHART_COLORS[index % CHART_COLORS.length],
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
