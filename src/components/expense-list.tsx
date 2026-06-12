// Expense list grouped by day. Tapping a row opens the edit/delete dialog.
// Rows still waiting for server confirmation (optimistic temp ids) are not editable.
"use client";

import { useMemo, useState } from "react";

import type { ExpenseInput } from "@/actions/expenses";
import { ExpenseEditDialog } from "@/components/expense-editor";
import type { RunExpenseAction } from "@/components/expense-view";
import { Card, CardContent } from "@/components/ui/card";
import { formatDayLabel, formatKRW } from "@/lib/format";
import type { Expense, ExpenseCategory, Member } from "@/types/db";

type DayGroup = {
  date: string;
  total: number;
  expenses: Expense[];
};

type Props = {
  expenses: Expense[];
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  onUpdate: (expenseId: string, input: ExpenseInput) => void;
  onDelete: (expenseId: string) => void;
  emptyMessage: string;
};

export function ExpenseList({
  expenses,
  categories,
  members,
  runAction,
  onUpdate,
  onDelete,
  emptyMessage,
}: Props) {
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name] as const)),
    [categories],
  );
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m] as const)),
    [members],
  );

  // expenses arrive sorted by spent_on desc then created_at desc, so group while preserving order.
  const groups = useMemo<DayGroup[]>(() => {
    const result: DayGroup[] = [];
    for (const expense of expenses) {
      const last = result[result.length - 1];
      const amount = Number(expense.amount);
      if (last && last.date === expense.spent_on) {
        last.total += amount;
        last.expenses.push(expense);
      } else {
        result.push({
          date: expense.spent_on,
          total: amount,
          expenses: [expense],
        });
      }
    }
    return result;
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <Card className="shadow-none ring-0">
        <CardContent className="flex min-h-32 items-center justify-center text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <section key={group.date}>
            <div className="flex items-baseline justify-between px-2 pb-1.5">
              <h3 className="text-xs font-medium text-muted-foreground">
                {formatDayLabel(group.date)}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatKRW(group.total)}
              </span>
            </div>
            <Card className="gap-0 p-1.5 shadow-none ring-0">
              <ul className="flex flex-col">
                {group.expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    categoryName={
                      expense.category_id
                        ? (categoryNameById.get(expense.category_id) ?? null)
                        : null
                    }
                    member={
                      expense.member_id
                        ? (memberById.get(expense.member_id) ?? null)
                        : null
                    }
                    disabled={isOptimisticId(expense.id)}
                    onClick={() => setEditTarget(expense)}
                  />
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      <ExpenseEditDialog
        expense={editTarget}
        categories={categories}
        members={members}
        runAction={runAction}
        onSave={(input) => {
          if (editTarget) onUpdate(editTarget.id, input);
        }}
        onDelete={() => {
          if (editTarget) onDelete(editTarget.id);
        }}
        onClose={() => setEditTarget(null)}
      />
    </>
  );
}

function isOptimisticId(id: string): boolean {
  return id.startsWith("optimistic-");
}

function ExpenseRow({
  expense,
  categoryName,
  member,
  disabled,
  onClick,
}: {
  expense: Expense;
  categoryName: string | null;
  member: Member | null; // null = shared (or an expense whose member was deleted)
  disabled: boolean;
  onClick: () => void;
}) {
  const title = expense.memo ?? categoryName ?? "지출";
  const subCategory = expense.memo ? categoryName : null;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:opacity-60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{title}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {subCategory ? (
              <>
                <span className="truncate">{subCategory}</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span className="inline-flex shrink-0 items-center gap-1">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full"
                style={{
                  backgroundColor: member
                    ? `var(--${member.color})`
                    : "var(--muted-foreground)",
                }}
              />
              {member ? member.name : "공용"}
            </span>
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {formatKRW(Number(expense.amount))}
        </span>
      </button>
    </li>
  );
}
