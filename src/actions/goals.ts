// 목표(저축 목표) CRUD 서버 액션. 소유권 검증과 입력 유효성 검사를 수행한다.
"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Goal } from "@/types/db";

type Result = { ok: true } | { ok: false; error: string };

export async function listGoals(): Promise<Goal[]> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("goals")
    .select("id, account_id, label, target_amount, target_date, created_at")
    .eq("account_id", accountId)
    .order("target_date", { ascending: true });

  if (error) {
    throw new Error(`목표를 불러오지 못했습니다: ${error.message}`);
  }
  return (data ?? []) as Goal[];
}

export async function createGoal(
  label: string,
  targetAmount: number,
  targetDate: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const validation = validateGoalInput(label, targetAmount, targetDate);
  if (!validation.ok) return validation;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("goals").insert({
    account_id: accountId,
    label: validation.label,
    target_amount: targetAmount,
    target_date: targetDate,
  });

  if (error) return { ok: false, error: "목표 생성에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function updateGoal(
  goalId: string,
  label: string,
  targetAmount: number,
  targetDate: string,
): Promise<Result> {
  const accountId = await requireAccount();
  const validation = validateGoalInput(label, targetAmount, targetDate);
  if (!validation.ok) return validation;

  const supabase = getSupabaseAdmin();
  if (!(await isGoalOwnedBy(supabase, accountId, goalId))) {
    return { ok: false, error: "목표를 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("goals")
    .update({
      label: validation.label,
      target_amount: targetAmount,
      target_date: targetDate,
    })
    .eq("id", goalId);

  if (error) return { ok: false, error: "목표 수정에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

export async function deleteGoal(goalId: string): Promise<Result> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  if (!(await isGoalOwnedBy(supabase, accountId, goalId))) {
    return { ok: false, error: "목표를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) return { ok: false, error: "목표 삭제에 실패했습니다." };

  revalidatePath("/");
  return { ok: true };
}

type ValidationResult =
  | { ok: true; label: string }
  | { ok: false; error: string };

function validateGoalInput(
  label: string,
  targetAmount: number,
  targetDate: string,
): ValidationResult {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "라벨을 입력하세요." };
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { ok: false, error: "목표 금액은 0보다 커야 합니다." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return { ok: false, error: "목표일 형식이 올바르지 않습니다." };
  }
  return { ok: true, label: trimmed };
}

async function isGoalOwnedBy(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  accountId: string,
  goalId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("account_id", accountId)
    .maybeSingle();
  return Boolean(data);
}
