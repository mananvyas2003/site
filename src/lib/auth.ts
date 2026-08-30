import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { PEOPLE, emailFor, handleFromEmail, isHandle, verifyPassword, type Handle } from "./people";
import { checkLocked, recordFailure, recordSuccess } from "./rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string; handle: Handle; accent: string } & DefaultSession["user"];
  }
}

const NINETY_DAYS = 90 * 24 * 60 * 60;

/** Auth.js swallows thrown errors into a code; this is how we get a message out. */
class LoginError extends CredentialsSignin {
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        handle: { label: "who", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(raw) {
        const password = String(raw?.password ?? "");
        const email = String(raw?.email ?? "");
        const handleRaw = String(raw?.handle ?? "");
        const handle = isHandle(handleRaw) ? handleRaw : handleFromEmail(email);
        if (!handle) throw new LoginError("bad-handle");

        // one bucket per person, one per source address
        let ip = "unknown";
        try {
          const h = await headers();
          ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
        } catch {
          /* not in a request context */
        }

        for (const key of [`h:${handle}`, `ip:${ip}`]) {
          const { locked, retryInSec } = checkLocked(key);
          if (locked) throw new LoginError(`locked:${retryInSec}`);
        }

        if (!verifyPassword(handle, password)) {
          recordFailure(`h:${handle}`);
          recordFailure(`ip:${ip}`);
          throw new LoginError("wrong");
        }

        recordSuccess(`h:${handle}`);
        recordSuccess(`ip:${ip}`);

        return {
          id: handle,
          name: PEOPLE[handle].displayName,
          email: emailFor(handle),
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: NINETY_DAYS },
  // you should never see a login screen on your own phone
  cookies: {
    sessionToken: {
      name: "mm.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: NINETY_DAYS,
      },
    },
  },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      // `user.id` is the handle on the sign-in pass; afterwards read it back
      const handle = isHandle(user?.id) ? (user.id as Handle) : isHandle(token.handle) ? (token.handle as Handle) : null;
      if (!handle) return token;

      token.handle = handle;
      token.accent = PEOPLE[handle].accent;
      token.name = PEOPLE[handle].displayName;

      // upsert the row on first sign-in; nobody ever "signs up"
      if (!token.uid) {
        const db = getDb();
        if (db) {
          try {
            const existing = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
            if (existing[0]) {
              token.uid = existing[0].id;
            } else {
              const inserted = await db
                .insert(users)
                .values({
                  handle,
                  displayName: PEOPLE[handle].displayName,
                  email: emailFor(handle),
                  accent: PEOPLE[handle].accent,
                })
                .onConflictDoNothing()
                .returning();
              token.uid =
                inserted[0]?.id ??
                (await db.select().from(users).where(eq(users.handle, handle)).limit(1))[0]?.id;
            }
          } catch (err) {
            console.error("[auth] user upsert failed", err);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.handle = (token.handle as Handle) ?? "manno";
        session.user.accent = (token.accent as string) ?? PEOPLE.manno.accent;
      }
      return session;
    },
  },
  trustHost: true,
});
