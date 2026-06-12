// Expense page body orchestrator. Manages month navigation, view scope (all/member/shared), and server action runs.
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import type {
  ExpenseDashboardData,
  ExpenseScopeTotals,
} from "@/actions/expense-dashboard";
import { ExpenseCategoryBreakdown } from "@/components/expense-category-breakdown";
import { ExpenseComposer } from "@/components/expense-editor";
import { ExpenseList } from "@/components/expense-list";
import { ExpenseSummaryCards } from "@/components/expense-summary-cards";
import { Button } from "@/components/ui/button";
import { YearMonthPicker } from "@/components/year-month-picker";
import { SCOPE_ALL, SCOPE_SHARED } from "@/lib/expense-scope";
import { formatYearMonthLong } from "@/lib/format";
import {
  currentYearMonth,
  firstDayOf,
  nextYearMonth,
  prevYearMonth,
  todayDateString,
} from "@/lib/year-month";

type ActionResult = { ok: true } | { ok: false; error: string };

// Returns false after toasting on failure, true after scheduling a refresh on success.
export type RunExpenseAction = (
  action: () => Promise<ActionResult>,
) => Promise<boolean>;

type Props = {
  dashboard: ExpenseDashboardData;
};

export function ExpenseView({ dashboard }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<string>(SCOPE_ALL);

  const runAction: RunExpenseAction = async (action) => {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    startTransition(() => {
      router.refresh();
    });
    return true;
  };

  function goToMonth(yearMonth: number) {
    startTransition(() => {
      router.push(`/expenses?ym=${yearMonth}`);
    });
  }

  const monthsWithData = useMemo(
    () => new Set(dashboard.monthsWithData),
    [dashboard.monthsWithData],
  );

  // A deleted member can leave the selected scope dangling, so fall back to "all".
  const effectiveScope =
    scope === SCOPE_ALL ||
    scope === SCOPE_SHARED ||
    dashboard.members.some((member) => member.id === scope)
      ? scope
      : SCOPE_ALL;

  const currentTotals = useMemo<ExpenseScopeTotals>(() => {
    const totals: ExpenseScopeTotals = { total: 0, shared: 0, byMember: {} };
    for (const expense of dashboard.expenses) {
      const amount = Number(expense.amount);
      totals.total += amount;
      if (expense.member_id === null) {
        totals.shared += amount;
      } else {
        totals.byMember[expense.member_id] =
          (totals.byMember[expense.member_id] ?? 0) + amount;
      }
    }
    return totals;
  }, [dashboard.expenses]);

  const scopedExpenses = useMemo(() => {
    if (effectiveScope === SCOPE_ALL) return dashboard.expenses;
    if (effectiveScope === SCOPE_SHARED) {
      return dashboard.expenses.filter((e) => e.member_id === null);
    }
    return dashboard.expenses.filter((e) => e.member_id === effectiveScope);
  }, [dashboard.expenses, effectiveScope]);

  const scopeLabel = useMemo(() => {
    if (effectiveScope === SCOPE_ALL) return "전체";
    if (effectiveScope === SCOPE_SHARED) return "공용";
    return (
      dashboard.members.find((member) => member.id === effectiveScope)?.name ??
      "전체"
    );
  }, [effectiveScope, dashboard.members]);

  // Default to today when viewing the current month, otherwise the 1st of the viewed month.
  const defaultDate =
    dashboard.yearMonth === currentYearMonth()
      ? todayDateString()
      : firstDayOf(dashboard.yearMonth);

  const emptyMessage =
    dashboard.expenses.length === 0
      ? `아직 ${formatYearMonthLong(dashboard.yearMonth)} 지출이 없습니다. 아래에서 첫 지출을 추가해 보세요.`
      : `${scopeLabel} 범위의 지출이 없습니다.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => goToMonth(prevYearMonth(dashboard.yearMonth))}
            aria-label="이전 달"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <YearMonthPicker
            existing={monthsWithData}
            existingMode="selectable"
            onSelect={goToMonth}
            disabled={pending}
            trigger={
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                className="px-2 font-heading text-xl font-semibold"
              >
                {formatYearMonthLong(dashboard.yearMonth)}
              </Button>
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => goToMonth(nextYearMonth(dashboard.yearMonth))}
            aria-label="다음 달"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {dashboard.expenses.length}건
        </span>
      </div>

      <ExpenseSummaryCards
        members={dashboard.members}
        totals={currentTotals}
        prevTotals={dashboard.prevTotals}
        scope={effectiveScope}
        onScopeChange={setScope}
      />

      {scopedExpenses.length > 0 ? (
        <ExpenseCategoryBreakdown
          categories={dashboard.categories}
          expenses={scopedExpenses}
          scopeLabel={scopeLabel}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <ExpenseComposer
          categories={dashboard.categories}
          members={dashboard.members}
          defaultMemberKey={
            effectiveScope === SCOPE_ALL ? SCOPE_SHARED : effectiveScope
          }
          defaultDate={defaultDate}
          disabled={pending}
          runAction={runAction}
        />
        <ExpenseList
          expenses={scopedExpenses}
          categories={dashboard.categories}
          members={dashboard.members}
          disabled={pending}
          runAction={runAction}
          emptyMessage={emptyMessage}
        />
      </section>
    </div>
  );
}
