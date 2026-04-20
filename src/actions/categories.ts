// 카테고리 그룹/항목의 CRUD 및 재정렬 서버 액션. 모든 진입점에서 requireAccount와 소유권 검증을 수행한다.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Category, CategoryGroup } from "@/types/db";

export type CategoryGroupWithCategories = CategoryGroup & {
  categories: Category[];
};

type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function listCategoryTree(): Promise<CategoryGroupWithCategories[]> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data: groups, error: groupError } = await supabase
    .from("category_groups")
    .select("id, account_id, name, sort_order, created_at")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (groupError) {
    throw new Error(`카테고리 그룹을 불러오지 못했습니다: ${groupError.message}`);
  }

  const groupRows = (groups ?? []) as CategoryGroup[];
  if (groupRows.length === 0) return [];

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, group_id, name, sort_order, created_at")
    .in(
      "group_id",
      groupRows.map((g) => g.id),
    )
    .order("sort_order", { ascending: true });

  if (categoryError) {
    throw new Error(`카테고리를 불러오지 못했습니다: ${categoryError.message}`);
  }

  const byGroup = new Map<string, Category[]>();
  for (const row of (categories ?? []) as Category[]) {
    const list = byGroup.get(row.group_id) ?? [];
    list.push(row);
    byGroup.set(row.group_id, list);
  }

  return groupRows.map((group) => ({
    ...group,
    categories: byGroup.get(group.id) ?? [],
  }));
}

export async function createGroup(
  name: string,
): Promise<Result<{ group: CategoryGroup }>> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  const { data: tail, error: tailError } = await supabase
    .from("category_groups")
    .select("sort_order")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (tailError) return { ok: false, error: "순서를 계산하지 못했습니다." };

  const nextOrder = (tail?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("category_groups")
    .insert({ account_id: accountId, name: trimmed, sort_order: nextOrder })
    .select("id, account_id, name, sort_order, created_at")
    .single();
  if (error) return { ok: false, error: "그룹 생성에 실패했습니다." };

  revalidatePath("/");
  return { ok: true, group: data as CategoryGroup };
}

export async function renameGroup(groupId: string, name: string): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  if (!(await isGroupOwnedBy(supabase, accountId, groupId))) {
    return { ok: false, error: "그룹을 찾을 수 없습니다." };
  }
  const { error } = await supabase
    .from("category_groups")
    .update({ name: trimmed })
    .eq("id", groupId);
  if (error) return { ok: false, error: "이름 변경에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isGroupOwnedBy(supabase, accountId, groupId))) {
    return { ok: false, error: "그룹을 찾을 수 없습니다." };
  }
  const { error } = await supabase
    .from("category_groups")
    .delete()
    .eq("id", groupId);
  if (error) return { ok: false, error: "그룹 삭제에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function createCategory(
  groupId: string,
  name: string,
): Promise<Result<{ category: Category }>> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  if (!(await isGroupOwnedBy(supabase, accountId, groupId))) {
    return { ok: false, error: "그룹을 찾을 수 없습니다." };
  }

  const { data: tail, error: tailError } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (tailError) return { ok: false, error: "순서를 계산하지 못했습니다." };

  const nextOrder = (tail?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("categories")
    .insert({ group_id: groupId, name: trimmed, sort_order: nextOrder })
    .select("id, group_id, name, sort_order, created_at")
    .single();
  if (error) return { ok: false, error: "항목 생성에 실패했습니다." };

  revalidatePath("/");
  return { ok: true, category: data as Category };
}

export async function renameCategory(
  categoryId: string,
  name: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  const groupId = await ownedGroupIdForCategory(supabase, accountId, categoryId);
  if (!groupId) return { ok: false, error: "항목을 찾을 수 없습니다." };

  const { error } = await supabase
    .from("categories")
    .update({ name: trimmed })
    .eq("id", categoryId);
  if (error) return { ok: false, error: "이름 변경에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();
  const groupId = await ownedGroupIdForCategory(supabase, accountId, categoryId);
  if (!groupId) return { ok: false, error: "항목을 찾을 수 없습니다." };

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false, error: "항목 삭제에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function reorderGroups(orderedIds: string[]): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("category_groups")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("account_id", accountId),
    ),
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "순서 변경에 실패했습니다." };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function reorderCategories(
  groupId: string,
  orderedIds: string[],
): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();
  if (!(await isGroupOwnedBy(supabase, accountId, groupId))) {
    return { ok: false, error: "그룹을 찾을 수 없습니다." };
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("group_id", groupId),
    ),
  );
  if (results.some((r) => r.error)) {
    return { ok: false, error: "순서 변경에 실패했습니다." };
  }

  revalidatePath("/");
  return { ok: true };
}

async function isGroupOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  groupId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("category_groups")
    .select("id")
    .eq("id", groupId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}

async function ownedGroupIdForCategory(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  categoryId: string,
): Promise<string | null> {
  const { data: category } = await supabase
    .from("categories")
    .select("group_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return null;
  const owned = await isGroupOwnedBy(supabase, accountId, category.group_id);
  return owned ? category.group_id : null;
}
