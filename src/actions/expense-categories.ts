// Expense category CRUD server actions. Flat structure with no groups, unlike asset categories.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ExpenseCategory } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

const DEFAULT_CATEGORIES = [
  "식비",
  "카페·간식",
  "교통",
  "주거·관리",
  "생활용품",
  "의료·건강",
  "여가·문화",
  "기타",
];

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, account_id, name, sort_order, created_at")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`지출 카테고리를 불러오지 못했습니다: ${error.message}`);
  }
  return (data ?? []) as ExpenseCategory[];
}

// Bulk-creates default categories to avoid an empty first run. Rejects if any category already exists.
export async function seedDefaultExpenseCategories(): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { count, error: countError } = await supabase
    .from("expense_categories")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  if (countError) return { ok: false, error: "카테고리 확인에 실패했습니다." };
  if ((count ?? 0) > 0) {
    return { ok: false, error: "이미 카테고리가 존재합니다." };
  }

  const { error } = await supabase.from("expense_categories").insert(
    DEFAULT_CATEGORIES.map((name, index) => ({
      account_id: accountId,
      name,
      sort_order: index,
    })),
  );
  if (error) return { ok: false, error: "기본 카테고리 생성에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function createExpenseCategory(name: string): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  const { data: tail, error: tailError } = await supabase
    .from("expense_categories")
    .select("sort_order")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (tailError) return { ok: false, error: "순서를 계산하지 못했습니다." };

  const nextOrder = (tail?.[0]?.sort_order ?? -1) + 1;
  const { error } = await supabase
    .from("expense_categories")
    .insert({ account_id: accountId, name: trimmed, sort_order: nextOrder });
  if (error) return { ok: false, error: "카테고리 생성에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function renameExpenseCategory(
  categoryId: string,
  name: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  if (!(await isCategoryOwnedBy(supabase, accountId, categoryId))) {
    return { ok: false, error: "카테고리를 찾을 수 없습니다." };
  }
  const { error } = await supabase
    .from("expense_categories")
    .update({ name: trimmed })
    .eq("id", categoryId);
  if (error) return { ok: false, error: "이름 변경에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

// Deleting a category keeps its expense rows; the FK's on delete set null leaves them uncategorized.
export async function deleteExpenseCategory(
  categoryId: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isCategoryOwnedBy(supabase, accountId, categoryId))) {
    return { ok: false, error: "카테고리를 찾을 수 없습니다." };
  }
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", categoryId);
  if (error) return { ok: false, error: "카테고리 삭제에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function reorderExpenseCategories(
  orderedIds: string[],
): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("expense_categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("account_id", accountId),
    ),
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "순서 변경에 실패했습니다." };
  }

  revalidatePath("/expenses");
  return { ok: true };
}

async function isCategoryOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  categoryId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("expense_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}
