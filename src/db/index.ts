import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * The database is intentionally lazy. Before you've pasted a Neon URL into
 * .env.local the whole site still boots — every page falls back to its empty
 * state instead of throwing. See SETUP.md.
 */
export const dbConfigured = Boolean(process.env.DATABASE_URL);

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/** Use in server components: returns `fallback` instead of exploding. */
export async function safeQuery<T>(fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<T>, fallback: T): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  try {
    return await fn(db);
  } catch (err) {
    console.error("[db]", err);
    return fallback;
  }
}

export { schema };
