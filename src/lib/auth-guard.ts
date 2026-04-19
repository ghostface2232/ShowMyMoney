// 서버 액션/Route Handler용 세션 가드. 유효한 세션에서 accountId를 꺼내 반환한다.
import "server-only";
import { getSession } from "@/lib/session";

export async function requireAccount(): Promise<string> {
  const session = await getSession();
  if (!session.accountId) {
    throw new Error("UNAUTHORIZED: active session required");
  }
  return session.accountId;
}
