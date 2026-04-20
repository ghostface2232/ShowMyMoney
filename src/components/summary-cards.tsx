// 헤더 아래의 요약 스트립. 어떤 카드를 탭하든 동일한 Dialog가 열려 그룹별 월별 증식량을 한 그래프에서 컬러로 구분해 보여준다.
"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { CategoryGroupWithCategories } from "@/actions/categories";
import type { DashboardData, SnapshotWithEntries } from "@/actions/dashboard";
import { CountUp } from "@/components/count-up";
import { Card } from "@/components/ui/card";
import { GrowthDialog } from "@/components/growth-dialog";
import { formatKRW } from "@/lib/format";
import { calcMultiGrowthSeries } from "@/lib/growth-math";
import { DURATION_BASE, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type CardDatum = {
  key: string;
  label: string;
  amount: number;
  delta: number | null;
  deltaPct: number | null;
  fullWidthOnMobile?: boolean;
};

type DividerFlags = {
  mobileRight: boolean;
  mobileBottom: boolean;
  desktopRight: boolean;
};

type Props = { dashboard: DashboardData };

export function SummaryCards({ dashboard }: Props) {
  const { snapshots, categoryTree } = dashboard;
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const cards = useMemo(
    () => buildCards(snapshots, categoryTree),
    [snapshots, categoryTree],
  );

  const ascendingSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => a.year_month - b.year_month),
    [snapshots],
  );

  const { data: growthData, series: growthSeries } = useMemo(
    () => calcMultiGrowthSeries(ascendingSnapshots, categoryTree),
    [ascendingSnapshots, categoryTree],
  );

  return (
    <>
      <Card
        className={cn(
          "grid grid-cols-2 gap-0 py-0 shadow-none ring-0",
          "sm:grid-cols-none sm:grid-flow-col sm:auto-cols-fr",
        )}
      >
        {cards.map((card, index) => {
          const flags = computeDividerFlags(card, index, cards);
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => setOpen(true)}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: DURATION_BASE, delay: index * 0.04, ease: EASE_OUT }
              }
              style={{ willChange: "transform, opacity" }}
              className={cn(
                "relative flex min-w-0 cursor-pointer flex-col justify-center gap-1 bg-card px-4 py-4 text-left transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                "hover:bg-muted/40",
                "sm:px-6",
                card.fullWidthOnMobile && "col-span-2 sm:col-auto",
                // right divider (::after) — inset top/bottom 16px
                "after:pointer-events-none after:absolute after:top-4 after:bottom-4 after:right-0 after:w-px after:bg-border after:content-['']",
                !flags.mobileRight && "after:hidden",
                !flags.mobileRight && flags.desktopRight && "sm:after:block",
                flags.mobileRight && !flags.desktopRight && "sm:after:hidden",
                // bottom divider (::before) — inset left/right 16px
                "before:pointer-events-none before:absolute before:bottom-0 before:left-4 before:right-4 before:h-px before:bg-border before:content-['']",
                !flags.mobileBottom && "before:hidden",
                flags.mobileBottom && "sm:before:hidden",
              )}
            >
              <span className="truncate text-xs text-muted-foreground">
                {card.label}
              </span>
              <CountUp
                value={card.amount}
                format={formatKRW}
                className={cn(
                  "font-heading text-base tabular-nums sm:text-lg",
                  card.fullWidthOnMobile ? "font-semibold" : "font-medium",
                )}
              />
              {card.delta !== null ? (
                <DeltaBadge delta={card.delta} pct={card.deltaPct} />
              ) : null}
            </motion.button>
          );
        })}
      </Card>
      <GrowthDialog
        open={open}
        onOpenChange={setOpen}
        title="그룹별 월별 증가량"
        subtitle="그룹별 최근 순변화량 추이"
        data={growthData}
        series={growthSeries}
      />
    </>
  );
}

function DeltaBadge({ delta, pct }: { delta: number; pct: number | null }) {
  const positive = delta > 0;
  const negative = delta < 0;
  const sign = positive ? "+" : negative ? "-" : "";
  const amountText = `${sign}${formatKRW(Math.abs(delta))}`;
  const pctText =
    pct === null ? "" : ` · ${sign}${Math.abs(pct).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        positive && "bg-chart-2/10 text-chart-2",
        negative && "bg-destructive/10 text-destructive",
        !positive && !negative && "bg-muted text-muted-foreground",
      )}
    >
      {amountText}
      {pctText}
    </span>
  );
}

function computeDividerFlags(
  card: CardDatum,
  index: number,
  cards: CardDatum[],
): DividerFlags {
  const isTotal = Boolean(card.fullWidthOnMobile);
  const totalGroups = cards.length - 1;
  const groupIndex = isTotal ? -1 : index - 1;
  const isDesktopLast = index === cards.length - 1;

  let mobileRight = false;
  let mobileBottom = false;
  if (isTotal) {
    mobileBottom = totalGroups > 0;
  } else {
    const hasRightSibling =
      groupIndex % 2 === 0 && groupIndex + 1 < totalGroups;
    const mobileRow = Math.floor(groupIndex / 2);
    const mobileLastRow = Math.floor(Math.max(0, totalGroups - 1) / 2);
    mobileRight = hasRightSibling;
    mobileBottom = mobileRow < mobileLastRow;
  }

  return {
    mobileRight,
    mobileBottom,
    desktopRight: !isDesktopLast,
  };
}

function buildCards(
  snapshots: SnapshotWithEntries[],
  groups: CategoryGroupWithCategories[],
): CardDatum[] {
  const [latest, previous] = snapshots;

  const sum = (
    snap: SnapshotWithEntries | undefined,
    categoryIds: string[] | null,
  ): number => {
    if (!snap) return 0;
    if (categoryIds === null) {
      let total = 0;
      for (const entry of Object.values(snap.entriesByCategory)) {
        total += Number(entry.amount);
      }
      return total;
    }
    let total = 0;
    for (const id of categoryIds) {
      const entry = snap.entriesByCategory[id];
      if (entry) total += Number(entry.amount);
    }
    return total;
  };

  const deltaOf = (
    now: number,
    prev: number | null,
  ): { delta: number | null; pct: number | null } => {
    if (prev === null) return { delta: null, pct: null };
    const delta = now - prev;
    const pct = prev === 0 ? null : (delta / prev) * 100;
    return { delta, pct };
  };

  const hasPrevious = Boolean(previous);
  const totalNow = sum(latest, null);
  const totalPrev = hasPrevious ? sum(previous, null) : null;
  const totalDelta = deltaOf(totalNow, totalPrev);

  const cards: CardDatum[] = [
    {
      key: "total",
      label: "총자산",
      amount: totalNow,
      delta: totalDelta.delta,
      deltaPct: totalDelta.pct,
      fullWidthOnMobile: true,
    },
  ];

  for (const group of groups) {
    const ids = group.categories.map((c) => c.id);
    const now = sum(latest, ids);
    const prev = hasPrevious ? sum(previous, ids) : null;
    const d = deltaOf(now, prev);
    cards.push({
      key: group.id,
      label: group.name,
      amount: now,
      delta: d.delta,
      deltaPct: d.pct,
    });
  }

  return cards;
}
