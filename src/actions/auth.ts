// PIN 기반 인증 서버 액션. 세션 쿠키에 accountId/displayName을 기록한다.
"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

const MIN_FAIL_DELAY_MS = 200;
const DEFAULT_GROUP_NAMES = ["현금 자산", "유동 자산", "비유동 자산"];

export async function signIn(pin: string): Promise<Result> {
  const started = Date.now();

  if (!isValidPin(pin)) {
    await ensureMinElapsed(started);
    return { ok: false, error: "PIN 형식이 올바르지 않습니다." };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, pin_hash, display_name");

  if (error) {
    await ensureMinElapsed(started);
    return { ok: false, error: "로그인 처리 중 오류가 발생했습니다." };
  }

  for (const row of data ?? []) {
    if (await verifyPin(pin, row.pin_hash)) {
      const session = await getSession();
      session.accountId = row.id;
      session.displayName = row.display_name;
      await session.save();
      return { ok: true };
    }
  }

  await ensureMinElapsed(started);
  return { ok: false, error: "일치하는 PIN이 없습니다." };
}

export async function signUp(displayName: string, pin: string): Promise<Result> {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "표시 이름을 입력하세요." };
  }
  if (!isValidPin(pin)) {
    return { ok: false, error: "PIN은 숫자 6~12자리여야 합니다." };
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: listError } = await supabase
    .from("accounts")
    .select("id, pin_hash");

  if (listError) {
    return { ok: false, error: "가입 처리 중 오류가 발생했습니다." };
  }

  for (const row of existing ?? []) {
    if (await verifyPin(pin, row.pin_hash)) {
      return { ok: false, error: "이미 사용 중인 PIN입니다. 다른 PIN을 선택하세요." };
    }
  }

  const pin_hash = await hashPin(pin);
  const { data: inserted, error: insertError } = await supabase
    .from("accounts")
    .insert({ pin_hash, display_name: trimmed })
    .select("id, display_name")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "계정 생성에 실패했습니다." };
  }

  const { error: groupError } = await supabase
    .from("category_groups")
    .insert(
      DEFAULT_GROUP_NAMES.map((name, index) => ({
        account_id: inserted.id,
        name,
        sort_order: index,
      })),
    );

  if (groupError) {
    console.error("default category groups insert failed", groupError);
  }

  const session = await getSession();
  session.accountId = inserted.id;
  session.displayName = inserted.display_name;
  await session.save();

  return { ok: true };
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

async function ensureMinElapsed(startedAt: number) {
  const remaining = MIN_FAIL_DELAY_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
}
