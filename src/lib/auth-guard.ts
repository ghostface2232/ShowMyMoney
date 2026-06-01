// Session guard for server actions/Route Handlers. Extracts accountId from a valid session.
import "server-only";
import { getSession } from "@/lib/session";

export async function requireAccount(): Promise<string> {
  const session = await getSession();
  if (!session.accountId) {
    throw new Error("UNAUTHORIZED: active session required");
  }
  return session.accountId;
}
