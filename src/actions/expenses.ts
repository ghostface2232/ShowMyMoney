// Per-transaction expense CRUD server actions. Enforces amount/date validation and category/member ownership.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidDateString } from "@/lib/year-month";

type Result = { ok: true } | { ok: false; error: string };

export type ExpenseInput = {
  amount: number;
  categoryId: string | null;
  memberId: string | null; // null = shared (공용)
  spentOn: string; // "YYYY-MM-DD"
  memo?: string;
};

export async function createExpense(input: ExpenseInput): Promise<Result> {
  const accountId = await requireAccount();

  const validated = await validateInput(accountId, input);
  if (!validated.ok) return validated;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("expenses").insert({
    account_id: accountId,
    category_id: input.categoryId,
    member_id: input.memberId,
    amount: input.amount,
    spent_on: input.spentOn,
    memo: normalizeMemo(input.memo),
  });
  if (error) return { ok: false, error: "지출 저장에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseInput,
): Promise<Result> {
  const accountId = await requireAccount();

  const validated = await validateInput(accountId, input);
  if (!validated.ok) return validated;

  const supabase = getSupabaseAdmin();
  if (!(await isExpenseOwnedBy(supabase, accountId, expenseId))) {
    return { ok: false, error: "지출을 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: input.categoryId,
      member_id: input.memberId,
      amount: input.amount,
      spent_on: input.spentOn,
      memo: normalizeMemo(input.memo),
    })
    .eq("id", expenseId);
  if (error) return { ok: false, error: "지출 수정에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function deleteExpense(expenseId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isExpenseOwnedBy(supabase, accountId, expenseId))) {
    return { ok: false, error: "지출을 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);
  if (error) return { ok: false, error: "지출 삭제에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

async function validateInput(
  accountId: string,
  input: ExpenseInput,
): Promise<Result> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "금액은 1원 이상이어야 합니다." };
  }
  if (!isValidDateString(input.spentOn)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }

  const supabase = getSupabaseAdmin();
  if (input.categoryId !== null) {
    const { data } = await supabase
      .from("expense_categories")
      .select("id")
      .eq("id", input.categoryId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!data) return { ok: false, error: "카테고리를 찾을 수 없습니다." };
  }
  if (input.memberId !== null) {
    const { data } = await supabase
      .from("members")
      .select("id")
      .eq("id", input.memberId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!data) return { ok: false, error: "멤버를 찾을 수 없습니다." };
  }
  return { ok: true };
}

function normalizeMemo(memo: string | undefined): string | null {
  const trimmed = memo?.trim();
  return trimmed ? trimmed : null;
}

async function isExpenseOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  expenseId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}
