// Snapshot (monthly asset record) CRUD server actions. Enforces the year_month unique constraint and ownership checks.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Entry, Snapshot } from "@/types/db";

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

// Sum of the most recent month's entries (the header's "current total assets"), in one
// query so the layout can fetch it alongside everything else instead of afterwards.
export async function getLatestTotalAssets(): Promise<number> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("snapshots")
    .select("id, entries(amount)")
    .eq("account_id", accountId)
    .order("year_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("총자산을 불러오지 못했습니다.");
  }
  const entries = (data?.entries ?? []) as Array<{ amount: number }>;
  return entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
}

export async function createSnapshot(
  yearMonth: number,
  note?: string,
): Promise<
  Result<{ snapshot: Snapshot; entries: Entry[]; copyFailed: boolean }>
> {
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

  const snapshot = data as Snapshot;
  const copy = await copyEntriesFromPreviousMonth(supabase, accountId, snapshot);

  revalidatePath("/");
  // The copied entries go back to the client so the optimistic column can swap its
  // placeholder amounts for real rows without waiting for a refresh.
  return { ok: true, snapshot, entries: copy.entries, copyFailed: copy.failed };
}

// New months start as a copy of the most recent earlier month so the user
// only edits what changed. Falls back to an empty snapshot if none exists.
async function copyEntriesFromPreviousMonth(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  snapshot: Snapshot,
): Promise<{ entries: Entry[]; failed: boolean }> {
  const { data: previous, error: previousError } = await supabase
    .from("snapshots")
    .select("id")
    .eq("account_id", accountId)
    .lt("year_month", snapshot.year_month)
    .order("year_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) return { entries: [], failed: true };
  if (!previous) return { entries: [], failed: false };

  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("category_id, amount")
    .eq("snapshot_id", previous.id);
  if (entriesError) return { entries: [], failed: true };
  if (!entries || entries.length === 0) return { entries: [], failed: false };

  const { data: inserted, error: insertError } = await supabase
    .from("entries")
    .insert(
      entries.map((entry) => ({
        snapshot_id: snapshot.id,
        category_id: entry.category_id,
        amount: entry.amount,
      })),
    )
    .select("id, snapshot_id, category_id, amount, created_at, updated_at");
  if (insertError) return { entries: [], failed: true };
  return { entries: (inserted ?? []) as Entry[], failed: false };
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
