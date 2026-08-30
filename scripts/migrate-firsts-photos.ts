import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  await db.execute(sql`ALTER TABLE firsts ADD COLUMN IF NOT EXISTS thumb_key text`);
  await db.execute(sql`ALTER TABLE firsts ADD COLUMN IF NOT EXISTS web_key text`);
  console.log("firsts photo columns ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
