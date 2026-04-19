// 요약 카드 탭 시 열리는 그룹별 월별 증식량 Dialog. 데스크톱은 중앙 Dialog, 모바일은 하단 Sheet로 전환한다.
"use client";

import { useId } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GrowthChart } from "@/components/growth-chart";
import { formatKRW } from "@/lib/format";
import type { GrowthPoint, GrowthSeries } from "@/lib/growth-math";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

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
  const isMobile = useMediaQuery("(max-width: 639px)");
  const titleId = useId();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          aria-labelledby={titleId}
          className="max-h-[90dvh] rounded-t-4xl"
        >
          <SheetHeader>
            <SheetTitle id={titleId}>{title}</SheetTitle>
            <SheetDescription>{subtitle}</SheetDescription>
          </SheetHeader>
          <Body data={data} series={series} className="px-6 pb-8" />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
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
      <EmptyState message="아직 그룹이 없습니다. 그룹과 항목을 추가하면 월별 추이가 표시됩니다." />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState message="아직 비교할 수 있는 기록이 부족합니다. 스냅샷이 두 개 이상 쌓이면 표시됩니다." />
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
