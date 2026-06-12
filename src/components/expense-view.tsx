// Expense page body orchestrator. Manages month navigation, view scope (all/member/shared),
// and optimistic expense mutations (mirroring the asset table's local-mirror pattern).
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import type {
  ExpenseDashboardData,
  ExpenseScopeTotals,
} from "@/actions/expense-dashboard";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseInput,
} from "@/actions/expenses";
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
  yearMonthOfDate,
} from "@/lib/year-month";
import type { Expense } from "@/types/db";

type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// Server-roundtrip runner for non-optimistic actions (e.g. category seeding).
// Returns false after toasting on failure, true after scheduling a refresh on success.
export type RunExpenseAction = (
  action: () => Promise<ActionResult>,
) => Promise<boolean>;

type Props = {
  dashboard: ExpenseDashboardData;
};

export function ExpenseView({ dashboard }: Props) {
  const router = useRouter();
  // Month navigation gets its own transition so background refreshes never disable the nav,
  // and vice versa: a refresh after a save must not lock up the inputs.
  const [navPending, startNavTransition] = useTransition();
  const [, startRefreshTransition] = useTransition();
  const [scope, setScope] = useState<string>(SCOPE_ALL);

  const [localExpenses, setLocalExpensesState] = useState(dashboard.expenses);
  const localExpensesRef = useRef(dashboard.expenses);
  const serverExpensesRef = useRef(dashboard.expenses);
  const pendingBackgroundCountRef = useRef(0);
  const lastYearMonthRef = useRef(dashboard.yearMonth);

  useEffect(() => {
    serverExpensesRef.current = dashboard.expenses;
    // A month switch must always replace the list; otherwise keep optimistic rows
    // until every in-flight mutation has settled.
    const monthChanged = lastYearMonthRef.current !== dashboard.yearMonth;
    lastYearMonthRef.current = dashboard.yearMonth;
    if (!monthChanged && pendingBackgroundCountRef.current > 0) return;
    localExpensesRef.current = dashboard.expenses;
    setLocalExpensesState(dashboard.expenses);
  }, [dashboard.expenses, dashboard.yearMonth]);

  function applyLocal(update: (rows: Expense[]) => Expense[]) {
    setLocalExpensesState((current) => {
      const next = update(current);
      localExpensesRef.current = next;
      return next;
    });
  }

  function restoreServerExpenses() {
    const latestServer = serverExpensesRef.current;
    localExpensesRef.current = latestServer;
    setLocalExpensesState(latestServer);
  }

  function refresh() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function runInBackground<T extends object = object>(
    action: Promise<ActionResult<T>>,
    onSuccess?: (result: { ok: true } & T) => void,
  ) {
    pendingBackgroundCountRef.current += 1;
    void action
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          restoreServerExpenses();
          refresh();
          return;
        }
        onSuccess?.(result);
        refresh();
      })
      .catch(() => {
        toast.error("변경사항을 저장하지 못했습니다.");
        restoreServerExpenses();
        refresh();
      })
      .finally(() => {
        pendingBackgroundCountRef.current = Math.max(
          0,
          pendingBackgroundCountRef.current - 1,
        );
      });
  }

  const runAction: RunExpenseAction = async (action) => {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    refresh();
    return true;
  };

  function addExpense(input: ExpenseInput) {
    if (yearMonthOfDate(input.spentOn) !== dashboard.yearMonth) {
      // Saved into another month: nothing to show in this view, just persist.
      runInBackground(createExpense(input));
      return;
    }
    const tempId = createTempId();
    const now = new Date().toISOString();
    const temp: Expense = {
      id: tempId,
      account_id: "",
      category_id: input.categoryId,
      member_id: input.memberId,
      amount: input.amount,
      spent_on: input.spentOn,
      year_month: dashboard.yearMonth,
      memo: normalizeMemo(input.memo),
      created_at: now,
      updated_at: now,
    };
    applyLocal((rows) => sortExpenses([temp, ...rows]));
    runInBackground(createExpense(input), (result) => {
      applyLocal((rows) =>
        rows.map((row) => (row.id === tempId ? result.expense : row)),
      );
    });
  }

  function editExpense(expenseId: string, input: ExpenseInput) {
    const now = new Date().toISOString();
    applyLocal((rows) =>
      sortExpenses(
        rows.map((row) =>
          row.id === expenseId
            ? {
                ...row,
                category_id: input.categoryId,
                member_id: input.memberId,
                amount: input.amount,
                spent_on: input.spentOn,
                year_month: yearMonthOfDate(input.spentOn),
                memo: normalizeMemo(input.memo),
                updated_at: now,
              }
            : row,
        ),
        // A date moved into another month leaves this view.
      ).filter((row) => row.year_month === dashboard.yearMonth),
    );
    runInBackground(updateExpense(expenseId, input), (result) => {
      applyLocal((rows) =>
        rows.map((row) => (row.id === expenseId ? result.expense : row)),
      );
    });
  }

  function removeExpense(expenseId: string) {
    applyLocal((rows) => rows.filter((row) => row.id !== expenseId));
    runInBackground(deleteExpense(expenseId));
  }

  function goToMonth(yearMonth: number) {
    startNavTransition(() => {
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
    for (const expense of localExpenses) {
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
  }, [localExpenses]);

  const scopedExpenses = useMemo(() => {
    if (effectiveScope === SCOPE_ALL) return localExpenses;
    if (effectiveScope === SCOPE_SHARED) {
      return localExpenses.filter((e) => e.member_id === null);
    }
    return localExpenses.filter((e) => e.member_id === effectiveScope);
  }, [localExpenses, effectiveScope]);

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
    localExpenses.length === 0
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
            disabled={navPending}
            onClick={() => goToMonth(prevYearMonth(dashboard.yearMonth))}
            aria-label="이전 달"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <YearMonthPicker
            existing={monthsWithData}
            existingMode="selectable"
            onSelect={goToMonth}
            disabled={navPending}
            trigger={
              <Button
                type="button"
                variant="ghost"
                disabled={navPending}
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
            disabled={navPending}
            onClick={() => goToMonth(nextYearMonth(dashboard.yearMonth))}
            aria-label="다음 달"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {localExpenses.length}건
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
          runAction={runAction}
          onCreate={addExpense}
        />
        <ExpenseList
          expenses={scopedExpenses}
          categories={dashboard.categories}
          members={dashboard.members}
          runAction={runAction}
          onUpdate={editExpense}
          onDelete={removeExpense}
          emptyMessage={emptyMessage}
        />
      </section>
    </div>
  );
}

function sortExpenses(rows: Expense[]): Expense[] {
  return [...rows].sort((a, b) => {
    if (a.spent_on !== b.spent_on) return a.spent_on < b.spent_on ? 1 : -1;
    if (a.created_at !== b.created_at) {
      return a.created_at < b.created_at ? 1 : -1;
    }
    return 0;
  });
}

function normalizeMemo(memo: string | undefined): string | null {
  const trimmed = memo?.trim();
  return trimmed ? trimmed : null;
}

function createTempId(): string {
  return `optimistic-expense-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}
