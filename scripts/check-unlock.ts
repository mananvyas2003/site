import { resolveSides, UNLOCK_AFTER_MS } from "../src/lib/notes-visibility";
import type { Note } from "../src/db/schema";

const ME = "me", THEM = "them";
const note = (author: string, ageMs: number, body: string): Note => ({
  id: `${author}-note`, memoryId: "m", authorId: author, body,
  createdAt: new Date(Date.now() - ageMs), updatedAt: new Date(Date.now() - ageMs),
});

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
}

// 1. she wrote, i haven't, it's fresh -> locked
let r = resolveSides([note(THEM, 60_000, "hers")], ME, THEM);
check("she wrote 1min ago, i haven't -> locked", r.theirs.state, "locked");
check("  ...and her body is not reachable", "note" in r.theirs, false);

// 2. she wrote, i wrote too -> visible, reciprocal
r = resolveSides([note(THEM, 60_000, "hers"), note(ME, 10_000, "mine")], ME, THEM);
check("both wrote -> visible", r.theirs.state, "visible");
check("  ...reason is reciprocal", r.theirs.state === "visible" && r.theirs.reason, "reciprocal");

// 3. she wrote 49h ago, i never did -> visible by elapsed
r = resolveSides([note(THEM, UNLOCK_AFTER_MS + 3_600_000, "hers")], ME, THEM);
check("49h passed, i never wrote -> visible", r.theirs.state, "visible");
check("  ...reason is elapsed", r.theirs.state === "visible" && r.theirs.reason, "elapsed");

// 4. exactly 48h -> unlocked (boundary is inclusive)
r = resolveSides([note(THEM, UNLOCK_AFTER_MS + 1000, "hers")], ME, THEM);
check("48h boundary -> visible", r.theirs.state, "visible");

// 5. only i wrote -> her side empty, mine visible
r = resolveSides([note(ME, 1000, "mine")], ME, THEM);
check("only i wrote -> theirs empty", r.theirs.state, "empty");
check("  ...mine always visible", r.mine.state, "mine");

// 6. nothing written
r = resolveSides([], ME, THEM);
check("nothing written -> both empty", [r.mine.state, r.theirs.state], ["empty", "empty"]);

// 7. my own note is never gated by anything
r = resolveSides([note(ME, 0, "mine")], ME, THEM);
check("my note readable immediately", r.mine.state === "mine" && r.mine.note.body, "mine");

console.log(failed === 0 ? "\nall good." : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
