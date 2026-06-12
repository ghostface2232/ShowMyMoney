// Member CRUD server actions. Every entry point runs requireAccount and ownership checks.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Member } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

// Color tokens cycled across member badges/charts. Maps 1:1 to the chart variables in globals.css.
const MEMBER_COLORS = ["chart-2", "chart-4", "chart-1", "chart-5", "chart-3"];

export async function listMembers(): Promise<Member[]> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("members")
    .select("id, account_id, name, color, sort_order, created_at")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`멤버를 불러오지 못했습니다: ${error.message}`);
  }
  return (data ?? []) as Member[];
}

export async function createMember(name: string): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("members")
    .select("sort_order")
    .eq("account_id", accountId)
    .order("sort_order", { ascending: false });
  if (existingError) return { ok: false, error: "순서를 계산하지 못했습니다." };

  const rows = existing ?? [];
  const nextOrder = (rows[0]?.sort_order ?? -1) + 1;
  const color = MEMBER_COLORS[rows.length % MEMBER_COLORS.length];

  const { error } = await supabase.from("members").insert({
    account_id: accountId,
    name: trimmed,
    color,
    sort_order: nextOrder,
  });
  if (error) return { ok: false, error: "멤버 추가에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function renameMember(
  memberId: string,
  name: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, error: "이름을 입력하세요." };

  const supabase = getSupabaseAdmin();
  if (!(await isMemberOwnedBy(supabase, accountId, memberId))) {
    return { ok: false, error: "멤버를 찾을 수 없습니다." };
  }
  const { error } = await supabase
    .from("members")
    .update({ name: trimmed })
    .eq("id", memberId);
  if (error) return { ok: false, error: "이름 변경에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

// Deleting a member keeps its expense rows; the FK's on delete set null reassigns them to shared.
export async function deleteMember(memberId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isMemberOwnedBy(supabase, accountId, memberId))) {
    return { ok: false, error: "멤버를 찾을 수 없습니다." };
  }
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) return { ok: false, error: "멤버 삭제에 실패했습니다." };

  revalidatePath("/expenses");
  return { ok: true };
}

export async function reorderMembers(orderedIds: string[]): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("members")
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

async function isMemberOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  memberId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}
