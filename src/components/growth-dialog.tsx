// Per-group monthly growth Dialog opened by tapping the summary card. Renders as a centered Dialog on desktop and, like every Dialog, a draggable bottom sheet on mobile.
"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKRW } from "@/lib/format";
import type { GrowthPoint, GrowthSeries } from "@/lib/growth-math";
import { cn } from "@/lib/utils";

// Recharts is the heaviest dependency in the app; keep it out of the initial bundle so
// the first paint and hydration on iPhone stay fast, then warm it up once the page is idle.
const loadGrowthChart = () =>
  import("@/components/growth-chart").then((mod) => mod.GrowthChart);
const GrowthChart = dynamic(loadGrowthChart, {
  ssr: false,
  loading: () => <div aria-hidden className="h-60 w-full" />,
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  data: GrowthPoint[];
  series: GrowthSeries[];
};

export function GrowthDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  data,
  series,
}: Props) {
  useEffect(() => {
    // Safari has no requestIdleCallback; a short delay keeps it off the startup path.
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => void loadGrowthChart());
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(() => void loadGrowthChart(), 1500);
    return () => clearTimeout(handle);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <Body data={data} series={series} />
      </DialogContent>
    </Dialog>
  );
}

function Body({
  data,
  series,
  className,
}: {
  data: GrowthPoint[];
  series: GrowthSeries[];
  className?: string;
}) {
  const showChart = data.length > 0 && series.length > 0;
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ChartOrEmpty data={data} series={series} />
      {showChart ? (
        <>
          <Legend series={series} />
          <SummaryLine data={data} series={series} />
        </>
      ) : null}
    </div>
  );
}

function ChartOrEmpty({
  data,
  series,
}: {
  data: GrowthPoint[];
  series: GrowthSeries[];
}) {
  if (series.length === 0) {
    return (
      <EmptyState message="그룹이 없습니다" />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState message="두 달 이상 기록되면 표시됩니다" />
    );
  }
  return <GrowthChart data={data} series={series} />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function Legend({ series }: { series: GrowthSeries[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {series.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-[3px]"
            style={{ backgroundColor: s.color }}
          />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function SummaryLine({
  data,
  series,
}: {
  data: GrowthPoint[];
  series: GrowthSeries[];
}) {
  let totalSum = 0;
  let best: { groupName: string; monthLabel: string; delta: number } | null =
    null;

  for (const point of data) {
    const monthLabel = String(point.label);
    for (const s of series) {
      const value = Number(point[s.id] ?? 0);
      totalSum += value;
      if (value > 0 && (!best || value > best.delta)) {
        best = { groupName: s.name, monthLabel, delta: value };
      }
    }
  }

  const avg = Math.round(totalSum / data.length);

  return (
    <p className="text-center text-xs text-muted-foreground">
      전체 합계{" "}
      <span className="font-medium text-foreground tabular-nums">
        {formatKRW(totalSum)}
      </span>
      <span className="mx-1.5">·</span>
      월 평균{" "}
      <span className="font-medium text-foreground tabular-nums">
        {formatKRW(avg)}
      </span>
      {best ? (
        <>
          <span className="mx-1.5">·</span>
          최대 증가{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatKRW(best.delta)}
          </span>{" "}
          ({best.groupName}, {best.monthLabel})
        </>
      ) : null}
    </p>
  );
}
