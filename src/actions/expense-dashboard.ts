// Server action collecting the expense page's initial render data in one round trip.
// Unlike the asset dashboard it loads only the selected month, since a month can hold hundreds of rows.
"use server";

import { listExpenseCategories } from "@/actions/expense-categories";
import { listMembers } from "@/actions/members";
import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidYearMonth, prevYearMonth } from "@/lib/year-month";
import type { Expense, ExpenseCategory, Member } from "@/types/db";

// Per-scope totals for previous-month delta math. byMember is keyed by member_id.
export type ExpenseScopeTotals = {
  total: number;
  shared: number;
  byMember: Record<string, number>;
};

export type ExpenseDashboardData = {
  yearMonth: number;
  members: Member[];
  categories: ExpenseCategory[];
  expenses: Expense[];
  prevTotals: ExpenseScopeTotals | null; // null when the previous month has no expenses
  monthsWithData: number[]; // year_month values that contain expenses (descending)
};

export async function getExpenseDashboardData(
  yearMonth: number,
): Promise<ExpenseDashboardData> {
  const accountId = await requireAccount();
  if (!isValidYearMonth(yearMonth)) {
    throw new Error("년월 형식이 올바르지 않습니다.");
  }

  const supabase = getSupabaseAdmin();
  const prev = prevYearMonth(yearMonth);

  const [members, categories, expensesResult, prevResult, monthsResult] =
    await Promise.all([
      listMembers(),
      listExpenseCategories(),
      supabase
        .from("expenses")
        .select(
          "id, account_id, category_id, member_id, amount, spent_on, year_month, memo, created_at, updated_at",
        )
        .eq("account_id", accountId)
        .eq("year_month", yearMonth)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("member_id, amount")
        .eq("account_id", accountId)
        .eq("year_month", prev),
      // supabase-js has no distinct, so fetch all year_month values and dedupe.
      // Fine at personal-ledger scale; switch to an RPC once rows reach the thousands.
      supabase
        .from("expenses")
        .select("year_month")
        .eq("account_id", accountId),
    ]);

  if (expensesResult.error) {
    throw new Error(
      `지출 내역을 불러오지 못했습니다: ${expensesResult.error.message}`,
    );
  }
  if (prevResult.error) {
    throw new Error(
      `전월 지출을 불러오지 못했습니다: ${prevResult.error.message}`,
    );
  }
  if (monthsResult.error) {
    throw new Error(
      `지출 월 목록을 불러오지 못했습니다: ${monthsResult.error.message}`,
    );
  }

  const prevRows = (prevResult.data ?? []) as Array<{
    member_id: string | null;
    amount: number;
  }>;
  const prevTotals = prevRows.length > 0 ? aggregateTotals(prevRows) : null;

  const monthsWithData = [
    ...new Set(
      ((monthsResult.data ?? []) as Array<{ year_month: number }>).map(
        (row) => row.year_month,
      ),
    ),
  ].sort((a, b) => b - a);

  return {
    yearMonth,
    members,
    categories,
    expenses: (expensesResult.data ?? []) as Expense[],
    prevTotals,
    monthsWithData,
  };
}

function aggregateTotals(
  rows: Array<{ member_id: string | null; amount: number }>,
): ExpenseScopeTotals {
  const totals: ExpenseScopeTotals = { total: 0, shared: 0, byMember: {} };
  for (const row of rows) {
    const amount = Number(row.amount);
    totals.total += amount;
    if (row.member_id === null) {
      totals.shared += amount;
    } else {
      totals.byMember[row.member_id] =
        (totals.byMember[row.member_id] ?? 0) + amount;
    }
  }
  return totals;
}
