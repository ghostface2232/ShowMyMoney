// Summary strip below the header. Tapping any card opens the same Dialog, showing per-group monthly growth color-coded on a single graph.
"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { CategoryGroupWithCategories } from "@/actions/categories";
import type { DashboardData, SnapshotWithEntries } from "@/actions/dashboard";
import { CountUp } from "@/components/count-up";
import { Card } from "@/components/ui/card";
import { GrowthDialog } from "@/components/growth-dialog";
import { hasClientNavigated } from "@/lib/app-navigation";
import { formatKRW } from "@/lib/format";
import { calcMultiGrowthSeries } from "@/lib/growth-math";
import {
  DURATION_BASE,
  EASE_OUT,
  ENTER_BLUR,
  ENTER_Y,
  STAGGER_INTERVAL,
} from "@/lib/motion";
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
          // With an odd number of group cells the last one would sit next to an
          // empty cell on mobile — let it span the full row instead.
          const groupCount = cards.length - 1;
          const spansLastRow =
            !card.fullWidthOnMobile &&
            index === cards.length - 1 &&
            groupCount % 2 === 1;
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => setOpen(true)}
              // Entry stagger only on initial load/refresh, not when remounting on a tab switch.
              initial={
                reducedMotion || hasClientNavigated()
                  ? false
                  : { opacity: 0, y: ENTER_Y, filter: ENTER_BLUR }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      duration: DURATION_BASE,
                      delay: index * STAGGER_INTERVAL,
                      ease: EASE_OUT,
                    }
              }
              style={{ willChange: "transform, opacity" }}
              className={cn(
                "relative flex min-w-0 cursor-pointer flex-col justify-center gap-1 bg-card px-4 text-left transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                "hover:bg-muted/50",
                card.fullWidthOnMobile ? "py-5" : "py-4",
                "sm:px-6",
                (card.fullWidthOnMobile || spansLastRow) &&
                  "col-span-2 sm:col-auto",
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
              <span
                className={cn(
                  "truncate text-muted-foreground",
                  card.fullWidthOnMobile
                    ? "text-[13px] font-medium"
                    : "text-xs",
                )}
              >
                {card.label}
              </span>
              <CountUp
                value={card.amount}
                format={formatKRW}
                className={cn(
                  "font-heading font-semibold tabular-nums",
                  card.fullWidthOnMobile
                    ? "text-3xl leading-tight tracking-tight"
                    : "text-[15px] sm:text-base",
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
  const amountText = formatKRW(Math.abs(delta));
  const pctText =
    pct === null ? "" : ` · ${Math.abs(pct).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "mt-0.5 inline-flex w-fit shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        positive && "bg-positive/10 text-positive",
        negative && "bg-negative/10 text-negative",
        !positive && !negative && "bg-muted text-muted-foreground",
      )}
    >
      {positive ? (
        <ArrowUpRight aria-label="증가" className="size-3" strokeWidth={2.5} />
      ) : negative ? (
        <ArrowDownRight aria-label="감소" className="size-3" strokeWidth={2.5} />
      ) : null}
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
