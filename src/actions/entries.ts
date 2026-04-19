// 엔트리(스냅샷 × 카테고리의 금액) 서버 액션. 유니크 제약 기반 upsert로 금액을 기록한다.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Entry } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

export async function listEntriesBySnapshot(
  snapshotId: string,
): Promise<Record<string, Entry>> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isSnapshotOwnedBy(supabase, accountId, snapshotId))) {
    throw new Error("스냅샷을 찾을 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("entries")
    .select("id, snapshot_id, category_id, amount, created_at, updated_at")
    .eq("snapshot_id", snapshotId);

  if (error) {
    throw new Error(`엔트리를 불러오지 못했습니다: ${error.message}`);
  }

  const byCategory: Record<string, Entry> = {};
  for (const row of (data ?? []) as Entry[]) {
    byCategory[row.category_id] = row;
  }
  return byCategory;
}

export async function upsertEntry(
  snapshotId: string,
  categoryId: string,
  amount: number,
): Promise<Result> {
  const accountId = await requireAccount();

  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "금액은 0 이상이어야 합니다." };
  }

  const supabase = getSupabaseAdmin();
  if (!(await isSnapshotOwnedBy(supabase, accountId, snapshotId))) {
    return { ok: false, error: "스냅샷을 찾을 수 없습니다." };
  }
  if (!(await isCategoryOwnedBy(supabase, accountId, categoryId))) {
    return { ok: false, error: "항목을 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("entries")
    .upsert(
      { snapshot_id: snapshotId, category_id: categoryId, amount },
      { onConflict: "snapshot_id,category_id" },
    );
  if (error) return { ok: false, error: "금액 저장에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteEntry(entryId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data: entry } = await supabase
    .from("entries")
    .select("id, snapshot_id")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) return { ok: false, error: "엔트리를 찾을 수 없습니다." };

  if (!(await isSnapshotOwnedBy(supabase, accountId, entry.snapshot_id))) {
    return { ok: false, error: "엔트리를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("entries").delete().eq("id", entryId);
  if (error) return { ok: false, error: "엔트리 삭제에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

async function isSnapshotOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  snapshotId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("snapshots")
    .select("id")
    .eq("id", snapshotId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}

async function isCategoryOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  categoryId: string,
): Promise<boolean> {
  const { data: category } = await supabase
    .from("categories")
    .select("group_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!category) return false;

  const { data: group } = await supabase
    .from("category_groups")
    .select("id")
    .eq("id", category.group_id)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(group);
}
