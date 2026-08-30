# manno weds momo

A private, two-person memory archive. Built from [the PRD](./manno-momo-prd.md).

Not a product. No sign-up, no third user, no landing page for strangers.

**→ [SETUP.md](./SETUP.md).** Neon, R2 and the counter dates are connected and
verified. The one step left is `npm run set-password`.

**→ [DEPLOY.md](./DEPLOY.md)** when you're ready for Vercel.

---

## The one metric

> time from "we just got back from a date" → memory is on the site.
> **target: under 60 seconds, from a phone, one-handed.**

Everything in here is subordinate to that. The floating `+` is on every page;
the only required field in the whole app is a title; dates and places are read
out of the photos' EXIF rather than asked for. If you're ever tempted to add a
required field to `/new`, don't — that's the failure mode the PRD names.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Until a password is set the site runs unlocked on localhost, so you can look
around. Once `npm run set-password` has run, it asks who you are and lets
exactly two people in.

| script | what it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run db:push` | create/update the tables in Neon |
| `npm run db:seed` | the two users, three counters, starting firsts |
| `npm run db:studio` | browse the data |
| `npm run check` | logic checks + type-check |
| `npm run set-password` | set or change either password |
| `npm run check-conn` | prove Neon and R2 actually answer |
| `npm run check-deploy` | env checklist before Vercel |
| `npm run migrate-all` | apply all SQL migrations to Neon |

`npm run check` runs both check scripts plus a type-check:

- `scripts/check-unlock.ts` — the reciprocal note rule, all seven cases
- `scripts/check-dates.ts` — IST counters, midnight rollover, date formatting, slugs
- `scripts/check-auth.ts` — password hashing, account separation, rate limiting

> The folder name contains an `&`, which breaks `npx` and the `.bin` shims on
> Windows. The `npm run` scripts above already work around it by calling node
> directly. If you ever need a tool `npm run` does not cover, use
> `node ./node_modules/tsx/dist/cli.mjs scripts/check-unlock.ts` instead, or
> rename the folder to something without an ampersand.

---

## The routes

| route | what it is |
|---|---|
| `/` | hero, counters, the count, how it works, both sides, the thread, firsts, sealed, a note from us |
| `/m/[slug]` | one memory — photos, both notes, voice, place, edit panel |
| `/new` | the 60-second capture flow. Also the phone's share-sheet target |
| `/firsts` | the firsts list, editable, linkable to days |
| `/letters` | sealed letters + countdown |
| `/search` | plain text over titles, notes, places |
| `/picks?who=` | each person's starred photos |
| `/map` | every memory with coordinates, on OSM tiles |
| `/print/[year]` | A5 print layout → Cmd-P → PDF |
| `/export` | the quarterly backup |
| `/i/[...key]` | authenticated image proxy — the bucket stays private |

---

## How the signature feature works

Neither of you sees the other's note until **both have written, or 48 hours
pass**. The gate is on *reading* only — you can always write yours.

The rule lives in one file, [`src/lib/notes-visibility.ts`](./src/lib/notes-visibility.ts),
and is applied in exactly two places: the memory page and `/api/notes`. Both
call the same `resolveSides()`, and the locked branch never puts the other
person's text into the response at all — it isn't hidden with CSS, it isn't in
the HTML. `scripts/check-unlock.ts` covers all seven cases.

Editing your note updates `updated_at` and deliberately leaves `created_at`
alone, so revising your version can't re-lock hers.

---

## How the login works

**A password each, not a shared one.** The PRD argues against a shared password
and it's right — `both sides` depends on knowing *who* wrote which version, and
who uploaded which photo. Two passwords keep that and drop the Google
dependency entirely.

Passwords are stored as **scrypt hashes** in the environment
(`npm run set-password` generates them; the plaintext is never written
anywhere). Verification is timing-safe. Plaintext in the env is accepted as a
fallback, because being locked out of your own archive by a hashing step you
got wrong is worse than the marginal risk — the env file already holds the R2
secret key either way.

The hash separator is a **colon**, not the conventional `$`. Next.js runs every
`.env` value through dotenv-expand, which reads `$name` as a variable reference
and silently expands it to nothing — a `$`-delimited hash arrives mangled and
every login fails with no useful error. `scripts/check-auth.ts` has a
regression test for exactly this.

Failed attempts are rate-limited per account and per source address: five free,
then exponential backoff to a fifteen-minute cap. It's in-memory, so it resets
when the instance does — it isn't trying to stop a determined attacker, just to
make online guessing against two accounts pointless.

Sessions last 90 days, so you type the password about four times a year.

**Signing out / switching.** The chip in the top-right shows who you are; tap it
for `sign out`. That's how you hand the laptop over — Nehal signs out of your
account and back in as `momo`, and the notes and photos land under her name.

**Before a password is set**, the site runs unlocked so you can look around —
but *only* on a dev machine. In production, no password means nobody gets in,
not everybody: `unlockedForSetup()` checks `NODE_ENV`, and `check-auth.ts`
has a test pinning that. Deploying before running `set-password` gives you a
locked door, not a public archive.

---

## Architecture, and why

**Images never go in the database.** Postgres holds rows that point at object
keys; Cloudflare R2 holds the bytes. Putting photos in Postgres as blobs blows
through every free tier in about 200 photos.

Each upload produces two renditions, both made **in the browser** before
anything is sent: `web` at 1600px WebP q80 and `thumb` at 400px. Re-encoding
through a canvas is also what strips EXIF — the app reads your GPS to place
the memory and then never publishes it. A blurhash is computed at the same
time so the grid never flashes grey.

The bucket is **private**. Every image is served through `/i/[key]`, which
checks the session cookie and streams from R2. The lazy alternative — a public
bucket with unguessable UUIDs — makes every photo a permanent public URL to
anyone who ever gets the link.

```
Browser                    App                      R2
  │  resize + blurhash
  ├─ POST /api/upload/sign ─►  presigned PUT ×2
  ├─────────── PUT bytes ──────────────────────────►  (never touch the server)
  └─ POST /api/media ──────►  row written
```

**Sealed letters are withheld at the query, not encrypted.** `getLetters()`
splits on `unlock_on <= today` and a sealed letter's body is never in the
response. That's honest protection against accidental peeking, which is the
real threat model. Don't oversell it to her as encryption.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Lenis · Drizzle → Neon
Postgres · Auth.js (Credentials, one password each) · R2 via
`@aws-sdk/client-s3` · `browser-image-compression` + `exifr` + `blurhash`, all
client-side.

The map is a hand-rolled slippy map on free OSM raster tiles — no MapLibre
bundle, no tile key, no billing account.

## Design

Palette, type and motion are in [`src/app/globals.css`](./src/app/globals.css);
every string is in [`src/lib/copy.ts`](./src/lib/copy.ts). Two entries there are
marked **WRITE-YOUR-OWN** — the "note from us" paragraphs. Replace them; they're
currently my guess at your voice, which is not the same as your voice.

`--manno` (deep green) and `--momo` (deep rose) aren't decoration — they're how
you tell at a glance whose note, whose photo, whose picks.

Drop a wide-cropped photo at `public/hero.jpg` to fill the hero. Without one
you get a warm wash and the page still looks finished.

---

## Still to do

Deliberately not built, from the PRD's own P2 list: mood/weather tags,
"chapters", and the WhatsApp-export import. The year-end print route **is**
built — `/print/2026`, A5, print to PDF.

Two open questions from PRD §11 that the code can't answer: whether the
reciprocal note-unlock delights Nehal or annoys her (ask her before you get
attached to it), and whether you're backfilling four years or starting today.
Backfilling is a six-hour job that makes the site worth opening on day one.
