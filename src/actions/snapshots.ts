// 스냅샷(월별 자산 기록) CRUD 서버 액션. year_month 유니크 제약과 소유권 검증을 강제한다.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Snapshot } from "@/types/db";

type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function listSnapshots(): Promise<Snapshot[]> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("snapshots")
    .select("id, account_id, year_month, note, created_at")
    .eq("account_id", accountId)
    .order("year_month", { ascending: false });

  if (error) {
    throw new Error(`스냅샷을 불러오지 못했습니다: ${error.message}`);
  }
  return (data ?? []) as Snapshot[];
}

export async function createSnapshot(
  yearMonth: number,
  note?: string,
): Promise<Result<{ snapshot: Snapshot }>> {
  const accountId = await requireAccount();
  if (!isValidYearMonth(yearMonth)) {
    return { ok: false, error: "년월 형식이 올바르지 않습니다." };
  }

  const supabase = getSupabaseAdmin();
  const trimmedNote = note?.trim();
  const { data, error } = await supabase
    .from("snapshots")
    .insert({
      account_id: accountId,
      year_month: yearMonth,
      note: trimmedNote ? trimmedNote : null,
    })
    .select("id, account_id, year_month, note, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 해당 월의 스냅샷이 존재합니다." };
    }
    return { ok: false, error: "스냅샷 생성에 실패했습니다." };
  }

  revalidatePath("/");
  return { ok: true, snapshot: data as Snapshot };
}

export async function deleteSnapshot(snapshotId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isSnapshotOwnedBy(supabase, accountId, snapshotId))) {
    return { ok: false, error: "스냅샷을 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("id", snapshotId);
  if (error) return { ok: false, error: "스냅샷 삭제에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function updateSnapshotNote(
  snapshotId: string,
  note: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isSnapshotOwnedBy(supabase, accountId, snapshotId))) {
    return { ok: false, error: "스냅샷을 찾을 수 없습니다." };
  }

  const trimmed = note.trim();
  const { error } = await supabase
    .from("snapshots")
    .update({ note: trimmed.length > 0 ? trimmed : null })
    .eq("id", snapshotId);
  if (error) return { ok: false, error: "메모 저장에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

function isValidYearMonth(value: number): boolean {
  if (!Number.isInteger(value)) return false;
  if (value < 190001 || value > 999912) return false;
  const month = value % 100;
  return month >= 1 && month <= 12;
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
