// iron-session-based server session helper. Stores only accountId/displayName in the showmymoney_session cookie.
import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  accountId: string | undefined;
  displayName: string | undefined;
};

const sessionOptions: SessionOptions = {
  cookieName: "showmymoney_session",
  password: process.env.SESSION_SECRET ?? "",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set in .env.local.");
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
