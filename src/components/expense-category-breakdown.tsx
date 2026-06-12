// Category breakdown card. Shows the selected scope's per-category totals as horizontal bars.
"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

import { Card } from "@/components/ui/card";
import { formatKRW } from "@/lib/format";
import { DURATION_BASE, EASE_OUT } from "@/lib/motion";
import type { Expense, ExpenseCategory } from "@/types/db";

type BreakdownItem = {
  key: string;
  name: string;
  amount: number;
  count: number;
};

type Props = {
  categories: ExpenseCategory[];
  expenses: Expense[];
  scopeLabel: string;
};

const BAR_COLORS = ["chart-2", "chart-3", "chart-1", "chart-4", "chart-5"];
const UNCATEGORIZED_KEY = "uncategorized";

export function ExpenseCategoryBreakdown({
  categories,
  expenses,
  scopeLabel,
}: Props) {
  const reducedMotion = useReducedMotion();

  const { items, total } = useMemo(
    () => buildBreakdown(categories, expenses),
    [categories, expenses],
  );

  if (items.length === 0) return null;
  const maxAmount = items[0].amount;

  return (
    <Card className="gap-4 p-4 shadow-none ring-0 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-xs font-medium text-muted-foreground">
          카테고리별 · {scopeLabel}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatKRW(total)}
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {items.map((item, index) => {
          const widthPct = maxAmount === 0 ? 0 : (item.amount / maxAmount) * 100;
          const sharePct = total === 0 ? 0 : (item.amount / total) * 100;
          return (
            <li key={item.key} className="flex items-center gap-3 px-1">
              <span className="w-20 shrink-0 truncate text-sm sm:w-24">
                {item.name}
              </span>
              <div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-muted/60">
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{
                    backgroundColor: `var(--${BAR_COLORS[index % BAR_COLORS.length]})`,
                    willChange: "width",
                  }}
                  initial={reducedMotion ? false : { width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: DURATION_BASE, ease: EASE_OUT }
                  }
                />
              </div>
              <span className="w-22 shrink-0 text-right text-sm tabular-nums sm:w-24">
                {formatKRW(item.amount)}
              </span>
              <span className="hidden w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block">
                {sharePct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function buildBreakdown(
  categories: ExpenseCategory[],
  expenses: Expense[],
): { items: BreakdownItem[]; total: number } {
  const byKey = new Map<string, BreakdownItem>();
  let total = 0;

  for (const expense of expenses) {
    const key = expense.category_id ?? UNCATEGORIZED_KEY;
    const amount = Number(expense.amount);
    total += amount;
    const item = byKey.get(key);
    if (item) {
      item.amount += amount;
      item.count += 1;
    } else {
      byKey.set(key, { key, name: "", amount, count: 1 });
    }
  }

  const nameById = new Map(categories.map((c) => [c.id, c.name] as const));
  for (const item of byKey.values()) {
    item.name =
      item.key === UNCATEGORIZED_KEY
        ? "미분류"
        : (nameById.get(item.key) ?? "미분류");
  }

  const items = [...byKey.values()].sort((a, b) => b.amount - a.amount);
  return { items, total };
}
