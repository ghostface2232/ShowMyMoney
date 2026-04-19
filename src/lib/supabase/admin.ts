// 서버 전용 Supabase admin 클라이언트. service_role 키로 DB에 접근하는 싱글톤을 제공한다.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase server env. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  client = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
