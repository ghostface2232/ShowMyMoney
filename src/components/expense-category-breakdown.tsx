// Category breakdown card. Ranks the selected scope's per-category totals with
// identity-colored icon chips and thin progress bars (share of the scope total).
"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

import { CategoryIcon } from "@/components/category-icon";
import { Card } from "@/components/ui/card";
import { getCategoryVisual } from "@/lib/category-visual";
import { hasClientNavigated } from "@/lib/app-navigation";
import { formatKRW } from "@/lib/format";
import { DURATION_SLOW, EASE_OUT, STAGGER_INTERVAL } from "@/lib/motion";
import type { Expense, ExpenseCategory } from "@/types/db";

type BreakdownItem = {
  key: string;
  id: string | null;
  name: string;
  amount: number;
  count: number;
};

type Props = {
  categories: ExpenseCategory[];
  expenses: Expense[];
  scopeLabel: string;
};

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

  return (
    <Card className="gap-4 p-4 shadow-none ring-0 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 px-1.5">
        <h2 className="text-[13px] font-medium text-muted-foreground">
          카테고리별 · {scopeLabel}
        </h2>
        <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
          {formatKRW(total)}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const sharePct = total === 0 ? 0 : (item.amount / total) * 100;
          const { color } = getCategoryVisual(item.id, item.name);
          return (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-2xl px-1.5 py-2"
            >
              <CategoryIcon
                categoryId={item.id}
                categoryName={item.name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {item.count}건
                    </span>
                  </p>
                  <p className="flex shrink-0 items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatKRW(item.amount)}
                    </span>
                    <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                      {sharePct > 0 && sharePct < 1
                        ? "<1%"
                        : `${sharePct.toFixed(0)}%`}
                    </span>
                  </p>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/70">
                  <motion.span
                    aria-hidden
                    className="block h-full origin-left rounded-full"
                    style={{ backgroundColor: color }}
                    // Bar growth only on initial load/refresh, not when remounting on a tab switch.
                    // A `transform` string runs on the compositor (WAAPI); `scaleX` would not.
                    initial={
                      reducedMotion || hasClientNavigated()
                        ? false
                        : { transform: "scaleX(0)" }
                    }
                    animate={{ transform: `scaleX(${sharePct / 100})` }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : {
                            duration: DURATION_SLOW,
                            delay: index * STAGGER_INTERVAL,
                            ease: EASE_OUT,
                          }
                    }
                  />
                </div>
              </div>
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
      byKey.set(key, {
        key,
        id: expense.category_id,
        name: "",
        amount,
        count: 1,
      });
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
