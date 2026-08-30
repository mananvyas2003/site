# PRD — "manno weds momo"

A private, two-person memory archive. Built for Manan (Manno) and Nehal (Momo). Nobody else.

**Owner:** Manan
**Status:** Draft v1, ready to build
**Reference for tone & layout:** Folio (getfolio.arovi.app) — structure and motion borrowed, copy and palette are ours

---

## 0. Read this before the feature list

The failure mode for this project is not "the code was hard." It's **week 4**, when adding a memory takes eleven taps and neither of you bothers. Every decision below is subordinate to one metric:

> **North star: time from "we just got back from a date" → memory is on the site. Target: under 60 seconds, from a phone, one-handed.**

If a feature adds friction to that path, it goes to P2 or gets cut. A beautiful site with 6 memories in it is a failed project. An ugly site with 300 is a success.

Second thing: **this site is a view, not the archive.** Originals stay in Google Photos / iCloud / a hard drive. This app stores compressed web copies. Never let a hobby project be the only copy of your memories.

---

## 1. What this is

A password-walled website where exactly two people log photos, dates, places, voice notes, and — the important bit — **each of their own version of the same day**. It builds into a scrollable thread of the relationship, from "college best friends" to now, and exports to a printable PDF once a year.

### Non-goals (defend these hard)
- No signup, no waitlist, no onboarding flow, no landing page for strangers
- No third users. Not friends, not family, not "view-only" links
- No comments, likes, follows, or anything social-network shaped
- No native app. Mobile web, installed as a PWA, is enough
- No print fulfilment business. You export a PDF and take it to a press in Indore
- No AI auto-captioning in v1
- No realtime/live-collab. You are two people, you can refresh

---

## 2. Users

| | Manan | Nehal |
|---|---|---|
| Handle | `manno` | `momo` |
| Role | Both are full admins. No permission tiers. | |
| Devices | Phone first, laptop occasionally | |

**Auth:** Google OAuth (Auth.js) with a hard-coded allowlist of two email addresses. Anyone else who signs in successfully gets bounced to a page that says so.

Why not a shared password: you need to know *who* uploaded a photo and *who* wrote which note. The two-sided notes feature depends on identity. A shared password kills it.

**Session:** 90-day cookie. You should never see a login screen on your own phone.

---

## 3. Information architecture

Five routes. That's the whole app.

```
/                 the hero + the thread (home)
/m/[slug]         one memory — photos, both notes, voice, place
/firsts           the firsts grid
/letters          sealed letters (time capsule)
/new              the upload flow (also reachable as a floating button everywhere)
/print/[year]     print-layout view → PDF
```

### Home page sections, in scroll order

Mapped from Folio's structure, with our content:

1. **Hero** — full-bleed convocation photo, `manno weds momo` set large, live day-counters underneath
2. **The count** — the "problem" section, reframed as our numbers (photos taken vs photos kept)
3. **How this works** — 4 steps, numbered, because it genuinely is a sequence
4. **Both sides** — the signature section (see §4.1). One memory shown expanded, with Manno's version and Momo's version side by side
5. **The thread** — vertical timeline of every memory, one continuous line, ending on an unwritten future entry
6. **The firsts** — small grid, teaser, links to `/firsts`
7. **Sealed** — how many letters are waiting, when the next one opens
8. **A note from us** — the founder-letter equivalent, written by both of you, one paragraph each
9. **Footer** — counters again, "made in indore"

---

## 4. Features

### P0 — build these or don't ship

#### 4.1 Both Sides (the signature feature)
Every memory has room for two notes: one from Manno, one from Momo. They render side by side, each in that person's accent colour, each timestamped.

- Neither person sees the other's note until both have written, or 48 hours pass. **This is the whole magic.** You write your honest version, not a reply to theirs.
- Until unlocked, the other side shows a blurred placeholder: `momo hasn't written hers yet`
- A memory with only one side is fine and normal. Show it as `manno's version only — nudge her`

This is the one thing that makes the site worth visiting rather than just scrolling a camera roll. Build it first, not last.

#### 4.2 Fast capture
The 60-second path:

1. Tap the floating `+` from anywhere
2. Select photos from phone (multi-select, no limit)
3. App reads EXIF client-side: pulls capture date and GPS. Groups the batch into a draft memory automatically. Pre-fills the date and reverse-geocodes the place name
4. You type a title. Everything else is optional
5. Save

The EXIF auto-grouping is what makes this fast. Do not make the user pick a date. They will not.

Also accept: paste a screenshot, share-target from the phone share sheet (PWA `share_target` manifest entry — 10 lines of config, huge friction win).

#### 4.3 Photos
- Client-side resize to three renditions before upload: `thumb` 400px WebP, `web` 1600px WebP q80, and optionally `orig`
- Strip EXIF from the `web` rendition after reading it (don't publish your GPS trail)
- Blurhash placeholder generated at upload so the grid never flashes grey
- Each photo can be starred by either of you, independently. `momo's picks` and `manno's picks` become filterable views for free

#### 4.4 The thread
Vertical timeline, newest at bottom or top (pick one, don't offer a toggle). Each entry: date chip, title, place, photo count, cover thumbnail, and a marker if it's a milestone. The line between entries is continuous and drawn, not implied by spacing — this is Folio's best visual idea and it's worth stealing.

Final entry is always the unwritten one: a faded card reading `2065 — whatever we haven't done yet`.

#### 4.5 Counters
Live day counters, computed from three fixed dates:
- `met` — first day of college / first time you spoke
- `best friends` — the day it became obvious
- `together` — the day you started dating

Rendered as `day 1,479` etc. Ticks over at midnight IST.

### P1 — the second month

- **On this day** — banner on home when a memory shares today's date from a previous year. One SQL query, disproportionate emotional payoff
- **Sealed letters** — either of you writes a letter with an unlock date. It is stored encrypted-at-rest-ish (see risks) and simply not returned by the API until `unlock_on <= today`. Show a countdown: `3 letters sealed · next opens 14 feb 2027`
- **The firsts** — a fixed, editable list: first conversation, first coffee, first movie, first fight, first trip, first time she called you Manno. Each links to a memory if one exists
- **Voice notes** — 60-second recordings attached to a memory. Web MediaRecorder API, upload as `.webm`. Folio is right that these age better than photos
- **Map view** — every memory with coordinates, pinned. Use MapLibre + free tiles, not Google Maps (billing)
- **Search** — plain text over titles, notes, places. Postgres `tsvector` or just `ILIKE`; you'll have hundreds of rows, not millions

### P2 — if the habit sticks

- Year-end print export: a `/print/2026` route styled for A5 paper, printed to PDF via headless Chrome or just Cmd-P. Take it to a press in Indore. This is Folio's entire thesis, achievable in a weekend
- Mood/weather tags per memory
- "Chapters" — group memories into arcs (`college`, `the long-distance year`, `after convocation`)
- Import a WhatsApp chat export and attach message snippets to the matching dates

---

## 5. Data model

Postgres. Text and metadata only — **no image bytes in the database, ever.**

```sql
create table users (
  id            uuid primary key default gen_random_uuid(),
  handle        text unique not null,        -- 'manno' | 'momo'
  display_name  text not null,               -- 'Manan' | 'Nehal'
  email         text unique not null,         -- allowlist
  accent        text not null,               -- hex, used everywhere their content appears
  avatar_key    text,
  created_at    timestamptz default now()
);

create table memories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  subtitle      text,
  kind          text not null default 'day', -- day|date|trip|milestone|call|fight|first
  happened_on   date not null,
  happened_until date,                       -- trips span days
  place_name    text,
  city          text,
  lat           double precision,
  lng           double precision,
  cover_media_id uuid,
  is_milestone  boolean default false,
  created_by    uuid references users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on memories (happened_on desc);

create table media (
  id            uuid primary key default gen_random_uuid(),
  memory_id     uuid references memories(id) on delete cascade,
  kind          text not null default 'photo', -- photo|voice
  thumb_key     text not null,               -- R2 object keys
  web_key       text not null,
  orig_key      text,
  mime          text not null,
  width         int, height int, bytes int,
  duration_sec  int,                         -- voice notes
  blurhash      text,
  caption       text,
  taken_at      timestamptz,                 -- from EXIF
  uploaded_by   uuid references users(id),
  sort_order    int default 0,
  created_at    timestamptz default now()
);
create index on media (memory_id, sort_order);

-- the signature feature
create table notes (
  id            uuid primary key default gen_random_uuid(),
  memory_id     uuid references memories(id) on delete cascade,
  author_id     uuid references users(id),
  body          text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (memory_id, author_id)              -- one version each, editable
);

create table stars (                          -- per-person favourites
  media_id      uuid references media(id) on delete cascade,
  user_id       uuid references users(id),
  created_at    timestamptz default now(),
  primary key (media_id, user_id)
);

create table firsts (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  happened_on   date,
  memory_id     uuid references memories(id),
  note          text,
  sort_order    int default 0
);

create table letters (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references users(id),
  title         text,
  body          text not null,
  unlock_on     date not null,
  opened_at     timestamptz,
  created_at    timestamptz default now()
);

create table counters (
  key           text primary key,            -- 'met' | 'friends' | 'together'
  label         text not null,
  start_date    date not null
);
```

**Note-unlock rule** lives in the API, not the schema: when fetching `/m/[slug]`, return the other person's note only if the requester has already written theirs, or `now() - note.created_at > 48h`.

---

## 6. Storage — the actual answer to your question

You asked for "a database with a good free tier that handles a good amount of images." That framing is the trap. **Databases are the wrong place for images.** Putting photos in Postgres as blobs will blow through every free tier in about 200 photos and make every query slow.

Correct architecture: **object storage for the files, a small SQL database for the rows that point at them.** Two services, both free.

### What I'd use

| Layer | Pick | Free allowance | Why |
|---|---|---|---|
| Images & audio | **Cloudflare R2** | 10 GB storage, 1M writes/mo, 10M reads/mo, **zero egress fees**, permanent (not a 12-month trial) | Egress is what kills image-heavy hobby projects on S3. R2 charges nothing for it, ever. S3-compatible, so any tutorial works. |
| Metadata | **Neon Postgres** | 0.5 GB storage, 100 CU-hours/mo, scales to zero when idle and **wakes automatically** | 0.5 GB is thousands of memories of pure text. Real Postgres, works with Drizzle/Prisma. |
| Hosting | **Vercel Hobby** or **Cloudflare Pages** | free for personal, non-commercial | Either is fine. Cloudflare Pages if you want everything under one account. |

*(Figures verified against 2026 sources — check the vendor pricing pages before you architect around them, these move.)*

### What 10 GB actually buys you

| What you store | Size each | Photos in 10 GB |
|---|---|---|
| Phone originals, untouched | ~4 MB | ~2,500 |
| 1600px WebP q80 + 400px thumb | ~280 KB | **~35,000** |

Store the web renditions only, and 10 GB will outlast the free tier of every competitor. If you ever exceed it, R2 is $0.015/GB-month — 50 GB is about ₹65/month. This project will never meaningfully cost you money.

### Options I considered and rejected

- **Supabase** — the default recommendation everyone gives, and wrong for *this specific app*. Free tier is 500 MB database and only **1 GB file storage**, and **free projects pause after 7 days of inactivity** and need a manual restore from the dashboard. A memory site is exactly the kind of thing you don't open for two weeks. You'd show it to someone and get a spinner. Use Supabase only if you keep a cron ping alive, and even then 1 GB of images is not enough.
- **Firebase Storage** — Cloud Storage requires the paid Blaze plan for new projects. Card on file for a side project, no.
- **AWS S3** — free tier expires after 12 months and egress is billed forever. This site is meant to outlive that.
- **Cloudinary** — genuinely good free tier and excellent on-the-fly transforms; the reason I don't lead with it is that it's a credit-based system that's harder to reason about long-term. Fine as a second choice if you want zero image-processing code.
- **Cloudflare D1** instead of Neon (5 GB free, SQLite) — perfectly good if you're deploying all-Cloudflare. Slightly less portable than Postgres if you ever migrate.

### Bucket layout & privacy

```
thumb/{memory_id}/{media_id}.webp
web/{memory_id}/{media_id}.webp
orig/{memory_id}/{media_id}.jpg     (optional, probably skip)
voice/{memory_id}/{media_id}.webm
```

**Keep the bucket private.** Serve images through an app route (`/i/[key]`) that checks the session cookie and streams from R2. Roughly 30 lines. The lazy alternative — a public bucket with unguessable UUIDs — means every photo is a permanent public URL to anyone who ever gets the link. For a couple's archive, don't.

---

## 7. Design direction

Folio's layout and motion, our palette and voice.

### Palette

Folio runs on warm cream + terracotta (`#D85F38`). Copying it exactly works, but it's the single most common look on the internet right now and your site will read as a clone. I'd shift the accent while keeping the structure — pull the palette from an Indian wedding invitation, since the hero literally says *weds*:

```
--paper      #FBF6EC   card stock, page background
--ink        #221A16   near-black, all body text
--marigold   #E8A317   primary accent — buttons, the thread line, counters
--sindoor    #B23A2E   secondary accent — milestones, sealed letters
--manno      #2E5E4E   Manan's content (deep green)
--momo       #9B3B66   Nehal's content (deep rose)
--haze       #D9CFBE   dividers, hairlines, disabled
```

The two personal accents earn their place: they're how you tell at a glance whose note, whose photo, whose starred picks. That's function, not decoration.

*If you'd rather match Folio exactly, swap `--marigold`/`--sindoor` for `#D85F38` and keep everything else.*

### Type

| Role | Face | Notes |
|---|---|---|
| Display | **Instrument Serif**, with italics for emphasised phrases | Set large, tight leading, lowercase, mirroring Folio's `the slam book *for your whole life*` treatment |
| Body | **Inter** or **Geist** | 16–18px, generous measure |
| Utility | **JetBrains Mono** | dates, day counters, photo counts, `page 047`-style markers |
| Flourish | **Yatra One** (Devanagari) | one word per page maximum — `मोमो`, `मन्नो`. Used once, it's a signature. Used everywhere, it's a costume. |

### Motion

- Scroll-triggered reveals on section entry, ~400ms, small y-offset only
- The thread line draws itself as you scroll past it (SVG `stroke-dashoffset` tied to scroll progress) — this is the one place to spend the animation budget
- Hover tilt on photo cards, 2° maximum
- `prefers-reduced-motion` respected everywhere

### Voice

All lowercase in headings. Sentence case in body. Dry, not sentimental — the photos carry the feeling, the copy should get out of the way.

---

## 8. Copy deck

Write your own where marked, but these are the slots and a starting point:

| Slot | Copy |
|---|---|
| Nav | `us · the thread · firsts · sealed` |
| Hero eyebrow | `save the date — date to be confirmed` |
| Hero H1 | `manno weds momo` |
| Hero sub | `paperwork pending. everything else already happened.` |
| Hero image caption | `the day the college made it official. we took a bit longer.` |
| Counter strip | `met · day 1,824    ·    best friends · day 1,479    ·    together · day 412` |
| Section 2 eyebrow | `the count` |
| Section 2 head | `we've taken 11,000 photos. *we've printed three.*` |
| Section 3 head | `how this works` |
| Step 01 | `you dump the photos` |
| Step 02 | `one of us names the day` |
| Step 03 | `we both write our version — you don't see hers until you've written yours` |
| Step 04 | `december prints the year` |
| Section 4 eyebrow | `both sides` |
| Section 4 head | `you remember it wrong. *so do I.*` |
| Locked note state | `momo hasn't written hers yet. write yours to unlock.` |
| Section 5 eyebrow | `the thread` |
| Section 5 head | `every day, threaded. *nothing lost.*` |
| Final thread entry | `2065 — this one isn't written yet` |
| Sealed section | `3 letters sealed. the next one opens 14 feb 2027.` |
| Empty state | `nothing here yet. that's what the + is for.` |
| 404 | `this page isn't part of our story yet.` |
| Upload success toast | `saved. now go write your version.` |
| Footer | `made in indore, by hand, for two people.` |
| Footer sign-off | `see you in 2065, momo.` |

Replace Folio's `because phones break` with your own one-liner. Candidates: `because we'll forget, and this won't` / `we are both terrible at remembering dates`.

---

## 9. Stack & build order

```
Next.js 15 (App Router)  +  TypeScript
Tailwind v4  +  Framer Motion  +  Lenis (smooth scroll)
Drizzle ORM  →  Neon Postgres
Auth.js (Google provider, 2-email allowlist)
Cloudflare R2 via @aws-sdk/client-s3 (presigned PUT)
browser-image-compression  +  exifr  +  blurhash (all client-side)
Deployed on Vercel, custom domain
```

**Weekend 1 — make it real, make it ugly.**
Auth, schema, R2 bucket, upload flow, memory detail page. No styling beyond default Tailwind. End state: you can add a real memory from your phone and see it. Put 20 real memories in before you write a single line of CSS.

**Weekend 2 — both sides.**
Notes with the reciprocal-unlock rule. Per-person accent colours. This is the feature; give it a full session.

**Weekend 3 — make it beautiful.**
Design tokens, type scale, hero, the thread with the drawn line, scroll reveals. Now that real content exists, the design has something to react to.

**Weekend 4 — the rest.**
Counters, firsts, on-this-day, letters. PWA manifest with `share_target`.

**Later.** Voice notes, map, print export.

---

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **You both stop using it by October** | Highest. This is the real risk, not any technical one. | The 60-second capture path. Share-target from the phone share sheet. A monthly reminder. Nehal has to actually want to use it — show her the *both sides* idea before you build anything, and if it doesn't land with her, redesign around what does. |
| Single point of failure — this becomes the only copy | High | Originals never leave Google Photos / a hard drive. Add a `/export` route from day one that dumps a zip of the database as JSON plus all keys. Run it quarterly. |
| Free tiers change or get withdrawn | Medium | R2 is S3-compatible and Neon is plain Postgres — both are a `pg_dump` and a bucket sync away from moving. Avoid anything proprietary you can't export. |
| Photos leak | Medium | Private bucket, authenticated image proxy, EXIF stripped from published renditions, `noindex` header on every route, no OG image with real photos. |
| Sealed letters aren't really secure | Low | Withholding them at the API layer is enough against accidental peeking, which is the actual threat model. Neither of you is going to SQL-query the box. Don't oversell it to her as encryption. |
| **Account & data ownership** | Worth deciding now, not later | It's your Google account, your domain, your bucket. Put both your emails on the Cloudflare and Neon accounts, and keep the quarterly export somewhere you both have. Not because anything will go wrong — because the alternative is that one person's memories live entirely at another person's discretion, and that's a bad property for an archive regardless of how things go. |
| It's a visual clone of someone else's product | Low, but real | Fine for a private site behind a login. Don't copy their written copy, don't use the Folio name or wordmark, and don't publish it as a product. |

---

## 11. Open questions for Manan

1. What are the three counter dates — met, best friends, together?
2. Does the reciprocal note-unlock delight Nehal or annoy her? Ask before building.
3. Domain? (`mannomomo.com`, `momoandmanno.in`, something from an inside joke)
4. Is the convocation photo the hero, or is there a better one? Hero photos need horizontal breathing room and space for type over the top.
5. Backfill: are you going to import the last four years from WhatsApp and Google Photos, or does the archive start today? Backfilling 4 years is a 6-hour job that makes the site immediately worth opening. I'd do it.
