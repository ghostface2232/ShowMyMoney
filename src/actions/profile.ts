// 프로필(계정) 관리 서버 액션. 표시 이름/PIN 변경, 계정 삭제를 처리하며 PIN 관련 실패에는 타이밍 공격 완화 지연을 적용한다.
"use server";

import { requireAccount } from "@/lib/auth-guard";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

export type Profile = {
  displayName: string;
  firstUsedAt: string;
};

const MIN_FAIL_DELAY_MS = 200;

export async function getProfile(): Promise<Profile> {
  const accountId = await requireAccount();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("accounts")
    .select("display_name, first_used_at")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("프로필을 불러오지 못했습니다.");
  }

  return {
    displayName: data.display_name,
    firstUsedAt: data.first_used_at,
  };
}

export async function updateDisplayName(name: string): Promise<Result> {
  const accountId = await requireAccount();
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "표시 이름을 입력하세요." };
  }
  if (trimmed.length > 40) {
    return { ok: false, error: "표시 이름은 40자 이하여야 합니다." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("accounts")
    .update({ display_name: trimmed })
    .eq("id", accountId);

  if (error) return { ok: false, error: "표시 이름 변경에 실패했습니다." };

  const session = await getSession();
  session.displayName = trimmed;
  await session.save();

  return { ok: true };
}

export async function changePin(
  oldPin: string,
  newPin: string,
): Promise<Result> {
  const started = Date.now();
  const accountId = await requireAccount();

  if (!isValidPin(newPin)) {
    await ensureMinElapsed(started);
    return { ok: false, error: "새 PIN은 숫자 6~12자리여야 합니다." };
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error: listError } = await supabase
    .from("accounts")
    .select("id, pin_hash");

  if (listError) {
    await ensureMinElapsed(started);
    return { ok: false, error: "PIN 변경 처리 중 오류가 발생했습니다." };
  }

  const current = (rows ?? []).find((row) => row.id === accountId);
  if (!current) {
    await ensureMinElapsed(started);
    return { ok: false, error: "계정 정보를 찾을 수 없습니다." };
  }

  if (!(await verifyPin(oldPin, current.pin_hash))) {
    await ensureMinElapsed(started);
    return { ok: false, error: "기존 PIN이 일치하지 않습니다." };
  }

  for (const row of rows ?? []) {
    if (row.id === accountId) continue;
    if (await verifyPin(newPin, row.pin_hash)) {
      return {
        ok: false,
        error: "이미 사용 중인 PIN입니다. 다른 PIN을 선택하세요.",
      };
    }
  }

  const newHash = await hashPin(newPin);
  const { error: updateError } = await supabase
    .from("accounts")
    .update({ pin_hash: newHash })
    .eq("id", accountId);

  if (updateError) return { ok: false, error: "PIN 변경에 실패했습니다." };

  return { ok: true };
}

export async function deleteAccount(pin: string): Promise<Result> {
  const started = Date.now();
  const accountId = await requireAccount();

  const supabase = getSupabaseAdmin();
  const { data: account, error } = await supabase
    .from("accounts")
    .select("pin_hash")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account) {
    await ensureMinElapsed(started);
    return { ok: false, error: "계정 정보를 찾을 수 없습니다." };
  }

  if (!(await verifyPin(pin, account.pin_hash))) {
    await ensureMinElapsed(started);
    return { ok: false, error: "PIN이 일치하지 않습니다." };
  }

  const { error: deleteError } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);

  if (deleteError) return { ok: false, error: "계정 삭제에 실패했습니다." };

  const session = await getSession();
  session.destroy();

  return { ok: true };
}

async function ensureMinElapsed(startedAt: number) {
  const remaining = MIN_FAIL_DELAY_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
}
