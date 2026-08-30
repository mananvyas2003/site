import { redirect } from "next/navigation";
import { auth } from "./auth";
import { emailFor, isHandle, PEOPLE, unlockedForSetup, type Handle } from "./people";

export type Viewer = {
  id: string;
  handle: Handle;
  displayName: string;
  accent: string;
  email: string;
};

function viewerFor(handle: Handle, id: string): Viewer {
  return {
    id,
    handle,
    displayName: PEOPLE[handle].displayName,
    accent: PEOPLE[handle].accent,
    email: emailFor(handle),
  };
}

/** Every page except /signin goes through here. */
export async function requirePage(): Promise<Viewer> {
  if (unlockedForSetup()) return viewerFor("manno", "");

  const session = await auth();
  const handle = session?.user?.handle;
  if (!session?.user || !isHandle(handle)) redirect("/signin");

  return viewerFor(handle, session.user.id ?? "");
}

/**
 * For route handlers: null instead of a redirect. The setup fallback applies
 * here too, otherwise you could browse the unlocked site on localhost but
 * every write would 401.
 */
export async function requireApi(): Promise<Viewer | null> {
  if (unlockedForSetup()) {
    const db = await import("@/db").then((m) => m.getDb());
    if (db) {
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const row = (await db.select().from(users).where(eq(users.handle, "manno")).limit(1))[0];
      if (row) return viewerFor("manno", row.id);
    }
    return null;
  }

  const session = await auth();
  const handle = session?.user?.handle;
  if (!session?.user || !isHandle(handle) || !session.user.id) return null;
  return viewerFor(handle, session.user.id);
}
export { unlockedForSetup } from "./people";
