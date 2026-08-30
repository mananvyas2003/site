import type { Note, User } from "@/db/schema";

export const UNLOCK_AFTER_MS = 48 * 60 * 60 * 1000;

export type SideState =
  | { state: "mine"; note: Note }               // your own — always visible
  | { state: "visible"; note: Note; reason: "reciprocal" | "elapsed" }
  | { state: "locked"; writtenAt: Date; unlocksAt: Date }  // they wrote, you haven't
  | { state: "empty" };                          // nothing written yet

export type BothSides = {
  mine: SideState;
  theirs: SideState;
  /** true when the pair is fully open — used for the "both sides" layout */
  unlocked: boolean;
};

/**
 * PRD §5: "return the other person's note only if the requester has already
 * written theirs, or now() - note.created_at > 48h."
 *
 * The point is that you write your honest version, not a reply to hers. So the
 * gate is on *reading*, never on writing — you can always add your own note.
 */
export function resolveSides(
  notes: Note[],
  viewerId: string,
  otherId: string | null,
  now: Date = new Date(),
): BothSides {
  const mineNote = notes.find((n) => n.authorId === viewerId) ?? null;
  const theirsNote = otherId ? (notes.find((n) => n.authorId === otherId) ?? null) : null;

  const mine: SideState = mineNote ? { state: "mine", note: mineNote } : { state: "empty" };

  let theirs: SideState;
  if (!theirsNote) {
    theirs = { state: "empty" };
  } else if (mineNote) {
    theirs = { state: "visible", note: theirsNote, reason: "reciprocal" };
  } else {
    const writtenAt = theirsNote.createdAt ?? now;
    const unlocksAt = new Date(writtenAt.getTime() + UNLOCK_AFTER_MS);
    theirs =
      now.getTime() >= unlocksAt.getTime()
        ? { state: "visible", note: theirsNote, reason: "elapsed" }
        : { state: "locked", writtenAt, unlocksAt };
  }

  return { mine, theirs, unlocked: theirs.state !== "locked" };
}

/** Strip the body from anything the viewer isn't allowed to read yet. */
export function redactForWire(side: SideState) {
  if (side.state === "locked") {
    return { state: "locked" as const, unlocksAt: side.unlocksAt.toISOString() };
  }
  if (side.state === "empty") return { state: "empty" as const };
  return {
    state: side.state,
    body: side.note.body,
    createdAt: side.note.createdAt?.toISOString() ?? null,
    updatedAt: side.note.updatedAt?.toISOString() ?? null,
  };
}

/** Copy for the locked / one-sided states (PRD §8). */
export function sideCopy(theirs: SideState, other: Pick<User, "handle" | "displayName"> | null) {
  const who = other?.handle ?? "she";
  const her = other?.handle === "manno" ? "his" : "hers";
  if (theirs.state === "locked") return `${who} hasn't written ${her} yet. write yours to unlock.`;
  if (theirs.state === "empty") return `${who} hasn't written ${her} yet — nudge ${other?.handle === "manno" ? "him" : "her"}.`;
  return "";
}
