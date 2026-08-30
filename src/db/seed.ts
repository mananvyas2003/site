import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { counters, firsts, users } from "./schema";
import { PEOPLE, emailFor } from "../lib/people";

/**
 * Idempotent. Creates the two users, the three counters, and the starting
 * list of firsts. Safe to re-run after you change a date in .env.local.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is empty — fill .env.local first (see SETUP.md)");
    process.exit(1);
  }

  const db = drizzle(neon(url), { schema });

  // ── the two of you ──────────────────────────────────────
  for (const person of Object.values(PEOPLE)) {
    const email = emailFor(person.handle);
    await db
      .insert(users)
      .values({
        handle: person.handle,
        displayName: person.displayName,
        email,
        accent: person.accent,
      })
      .onConflictDoUpdate({
        target: users.handle,
        set: { email, displayName: person.displayName, accent: person.accent },
      });
    console.log(`✓ ${person.handle} <${email}>`);
  }

  // ── the three counter dates ─────────────────────────────
  const COUNTERS = [
    { key: "met", label: "met", env: "COUNTER_MET" },
    { key: "friends", label: "best friends", env: "COUNTER_FRIENDS" },
    { key: "together", label: "together", env: "COUNTER_TOGETHER" },
  ];

  for (const c of COUNTERS) {
    const startDate = process.env[c.env]?.trim();
    if (!startDate) {
      console.warn(`! ${c.env} is empty — skipping the ${c.label} counter`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      console.warn(`! ${c.env} is "${startDate}" — expected YYYY-MM-DD, skipping`);
      continue;
    }
    await db
      .insert(counters)
      .values({ key: c.key, label: c.label, startDate })
      .onConflictDoUpdate({ target: counters.key, set: { startDate, label: c.label } });
    console.log(`✓ ${c.label} — ${startDate}`);
  }

  // ── the firsts, only if the list is empty ───────────────
  const existing = await db.select().from(firsts);
  if (existing.length === 0) {
    const labels = [
      "first conversation",
      "first coffee",
      "first movie",
      "first fight",
      "first trip",
      "first time she called you manno",
    ];
    await db.insert(firsts).values(labels.map((label, i) => ({ label, sortOrder: i })));
    console.log(`✓ ${labels.length} firsts`);
  } else {
    console.log(`· firsts already has ${existing.length} rows, left alone`);
  }

  console.log("\ndone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
