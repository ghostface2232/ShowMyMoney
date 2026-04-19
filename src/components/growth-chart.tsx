// 월별 증식량을 그룹별 컬러로 구분해 한 그래프에 표시하는 grouped BarChart. 부모 컨테이너 폭에 맞춰 반응형으로 렌더하고, 자산 테이블과 같은 방향으로 최근 달이 왼쪽에 오도록 데이터 순서를 뒤집는다.
"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";

import { formatKRWCompact } from "@/lib/format";
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
      role="presentation"
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
            strokeDasharray="2 4"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            tickFormatter={formatKRWCompact}
            domain={["auto", "auto"]}
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

function buildAriaLabel(data: GrowthPoint[], series: GrowthSeries[]): string {
  if (data.length === 0) return "표시할 월별 증식량이 없습니다.";
  return `그룹 ${series.length}종의 최근 ${data.length}개월 순변화량 추이.`;
}
