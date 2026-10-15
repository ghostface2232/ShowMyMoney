// Grouped BarChart showing monthly growth in one graph, color-coded by group. Renders responsively to the parent container width and reverses the data order so the most recent month is on the left, matching the asset table.
"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";

import { formatKRW, formatKRWCompact } from "@/lib/format";
import type { GrowthPoint, GrowthSeries } from "@/lib/growth-math";

const BAR_INNER_GAP = 2;
const CATEGORY_GAP_RATIO = "25%";
const CHART_HEIGHT = 240;
const MAX_BAR_SIZE = 24;
const Y_AXIS_WIDTH = 44;

type Props = { data: GrowthPoint[]; series: GrowthSeries[] };

export function GrowthChart({ data, series }: Props) {
  const reducedMotion = useReducedMotion();

  const displayData = useMemo(() => [...data].reverse(), [data]);

  return (
    <div
      role="img"
      aria-label={buildAriaLabel(data, series)}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart
          data={displayData}
          margin={{ top: 12, right: 8, bottom: 8, left: 0 }}
          barGap={BAR_INNER_GAP}
          barCategoryGap={CATEGORY_GAP_RATIO}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeWidth={1.2}
            strokeDasharray="2 4"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            // "26년 10월" overlaps on a phone once there are 6+ months; the month alone
            // fits, and Recharts drops ticks if even that gets too dense.
            tickFormatter={shortMonthLabel}
            interval="preserveStartEnd"
            minTickGap={6}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickFormatter={formatKRWCompact}
            // Bars must grow from zero (HIG Charts); an auto domain could start mid-range
            // and exaggerate small differences.
            domain={[
              (dataMin: number) => Math.min(0, dataMin),
              (dataMax: number) => Math.max(0, dataMax),
            ]}
          />
          <ReferenceLine
            y={0}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.35}
          />
          {series.map((s) => (
            <Bar
              key={s.id}
              dataKey={s.id}
              name={s.name}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={MAX_BAR_SIZE}
              isAnimationActive={!reducedMotion}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortMonthLabel(label: string): string {
  return label.replace(/^\d+년\s*/, "");
}

// HIG Charts: describe what the data says with real values, not the colors.
function buildAriaLabel(data: GrowthPoint[], series: GrowthSeries[]): string {
  if (data.length === 0) return "표시할 월별 증감이 없습니다.";
  const latest = data[data.length - 1];
  const parts = series.map((s) => {
    const value = Number(latest[s.id] ?? 0);
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${s.name} ${sign}${formatKRW(Math.abs(value))}`;
  });
  return `그룹 ${series.length}개의 최근 ${data.length}개월 순변화량. ${latest.label} 기준 ${parts.join(", ")}.`;
}
