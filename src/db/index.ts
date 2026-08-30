import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * The database is intentionally lazy. Before you've pasted a Neon URL into
 * .env.local the whole site still boots — every page falls back to its empty
 * state instead of throwing. See SETUP.md.
 */
export const dbConfigured = Boolean(process.env.DATABASE_URL);

/** channel_binding=require breaks the HTTP driver's fetch on some Node/Windows setups. */
function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    return raw.replace(/([?&])channel_binding=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!_db) {
    const sql = neon(normalizeDatabaseUrl(process.env.DATABASE_URL));
    _db = drizzle(sql, { schema });
  }
  return _db;
}

const TRANSIENT = /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i;

/** Use in server components: returns `fallback` instead of exploding. */
export async function safeQuery<T>(
  fn: (db: NonNullable<ReturnType<typeof getDb>>) => Promise<T>,
  fallback: T,
): Promise<T> {
  const db = getDb();
  if (!db) return fallback;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn(db);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 0 && TRANSIENT.test(msg)) continue;
      console.error("[db]", err);
      return fallback;
    }
  }
  return fallback;
}

export { schema };
