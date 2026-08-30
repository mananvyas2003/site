/**
 * The copy deck (PRD §8), in one place so you can rewrite the voice without
 * opening a single component.
 *
 * Rules: all lowercase in headings, sentence case in body. Dry, not
 * sentimental — the photos carry the feeling, the copy gets out of the way.
 *
 * ► The lines marked WRITE-YOUR-OWN are starting points. Replace them.
 */
export const COPY = {
  heroEyebrow: "save the date — date to be confirmed",
  heroSub: "paperwork pending. everything else already happened.",
  heroCaption: "the day the college made it official. we took a bit longer.",

  countEyebrow: "the count",
  // WRITE-YOUR-OWN — the PRD suggests replacing folio's "because phones break"
  countBody:
    "because we'll forget, and this won't. the camera roll is a pile; this is the version with the dates attached and both of us in it.",

  steps: [
    "you dump the photos",
    "one of us names the day",
    "we both write our version — you don't see hers until you've written yours",
    "december prints the year",
  ],

  bothSidesEyebrow: "both sides",
  bothSidesBody:
    "two versions of the same evening, written blind. neither of us gets to edit around the other. it turns out we remember different halves.",

  threadEyebrow: "the thread",
  futureEntry: "this one isn't written yet",

  sealedBody:
    "write something with a date on it. it stays shut until then — not encrypted, just not handed back by the server until the day arrives.",

  // WRITE-YOUR-OWN — one paragraph each, in your own words
  noteFromManno:
    "i started this because i went looking for a photo from the second year and spent forty minutes scrolling past screenshots of bus timings. everything we actually did is in there somewhere, undated and unsorted. this is the sorted version.",
  noteFromMomo:
    "i agreed to it on the condition that i don't have to be the one who remembers the dates. so far that's holding.",

  empty: "nothing here yet. that's what the + is for.",
  notFound: "this page isn't part of our story yet.",
  uploadSuccess: "saved. now go write your version.",

  footer: "made in indore, by hand, for two people.",
  footerSignoff: "see you in 2065, momo.",
} as const;

export const FUTURE_YEAR = 2065;
