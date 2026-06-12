// Expense summary strip. Tap a card to switch the view scope (all/member/shared); shows month-over-month deltas.
// Unlike assets, increased spending is negative, so delta colors are inverted (increase = destructive).
"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { ExpenseScopeTotals } from "@/actions/expense-dashboard";
import { CountUp } from "@/components/count-up";
import { Card } from "@/components/ui/card";
import { hasClientNavigated } from "@/lib/app-navigation";
import { SCOPE_ALL, SCOPE_SHARED } from "@/lib/expense-scope";
import { formatKRW } from "@/lib/format";
import { DURATION_BASE, EASE_OUT } from "@/lib/motion";
import type { Member } from "@/types/db";
import { cn } from "@/lib/utils";

type CardDatum = {
  key: string; // same domain as the scope key ("all" | "shared" | member id)
  label: string;
  amount: number;
  delta: number | null;
  deltaPct: number | null;
  dotColor?: string;
  fullWidthOnMobile?: boolean;
};

type DividerFlags = {
  mobileRight: boolean;
  mobileBottom: boolean;
  desktopRight: boolean;
};

type Props = {
  members: Member[];
  totals: ExpenseScopeTotals;
  prevTotals: ExpenseScopeTotals | null;
  scope: string;
  onScopeChange: (scope: string) => void;
};

export function ExpenseSummaryCards({
  members,
  totals,
  prevTotals,
  scope,
  onScopeChange,
}: Props) {
  const reducedMotion = useReducedMotion();

  const cards = useMemo(
    () => buildCards(members, totals, prevTotals),
    [members, totals, prevTotals],
  );

  return (
    <div className="flex flex-col gap-2">
      <Card
        className={cn(
          "grid grid-cols-2 gap-0 py-0 shadow-none ring-0",
          "sm:grid-cols-none sm:grid-flow-col sm:auto-cols-fr",
        )}
      >
        {cards.map((card, index) => {
          const flags = computeDividerFlags(card, index, cards);
          const selected = scope === card.key;
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() =>
                onScopeChange(selected ? SCOPE_ALL : card.key)
              }
              aria-pressed={selected}
              // Entry stagger only on initial load/refresh, not when remounting on a tab switch.
              initial={
                reducedMotion || hasClientNavigated()
                  ? false
                  : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: DURATION_BASE, delay: index * 0.04, ease: EASE_OUT }
              }
              style={{ willChange: "transform, opacity" }}
              className={cn(
                "relative flex min-w-0 cursor-pointer flex-col justify-center gap-1 px-4 py-4 text-left transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                selected ? "bg-muted/60" : "bg-card hover:bg-muted/40",
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
              <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {card.dotColor ? (
                  <span
                    aria-hidden
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: card.dotColor }}
                  />
                ) : null}
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
      {members.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          헤더의 관리에서 멤버를 추가하면 사람별 지출을 나눠 볼 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}

function DeltaBadge({ delta, pct }: { delta: number; pct: number | null }) {
  const increased = delta > 0;
  const decreased = delta < 0;
  const sign = increased ? "+" : decreased ? "-" : "";
  const amountText = `${sign}${formatKRW(Math.abs(delta))}`;
  const pctText = pct === null ? "" : ` · ${sign}${Math.abs(pct).toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        increased && "bg-destructive/10 text-destructive",
        decreased && "bg-chart-2/10 text-chart-2",
        !increased && !decreased && "bg-muted text-muted-foreground",
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
  members: Member[],
  totals: ExpenseScopeTotals,
  prevTotals: ExpenseScopeTotals | null,
): CardDatum[] {
  const deltaOf = (
    now: number,
    prev: number | null,
  ): { delta: number | null; pct: number | null } => {
    if (prev === null) return { delta: null, pct: null };
    const delta = now - prev;
    const pct = prev === 0 ? null : (delta / prev) * 100;
    return { delta, pct };
  };

  const totalDelta = deltaOf(totals.total, prevTotals?.total ?? null);
  const cards: CardDatum[] = [
    {
      key: SCOPE_ALL,
      label: "총지출",
      amount: totals.total,
      delta: totalDelta.delta,
      deltaPct: totalDelta.pct,
      fullWidthOnMobile: true,
    },
  ];

  // With no members everything is shared, so splitting is meaningless — show only the total card.
  if (members.length === 0) return cards;

  for (const member of members) {
    const now = totals.byMember[member.id] ?? 0;
    const prev = prevTotals ? (prevTotals.byMember[member.id] ?? 0) : null;
    const d = deltaOf(now, prev);
    cards.push({
      key: member.id,
      label: member.name,
      amount: now,
      delta: d.delta,
      deltaPct: d.pct,
      dotColor: `var(--${member.color})`,
    });
  }

  const sharedDelta = deltaOf(totals.shared, prevTotals?.shared ?? null);
  cards.push({
    key: SCOPE_SHARED,
    label: "공용",
    amount: totals.shared,
    delta: sharedDelta.delta,
    deltaPct: sharedDelta.pct,
    dotColor: "var(--muted-foreground)",
  });

  return cards;
}
