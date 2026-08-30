# setup

Everything is built. This file is the connecting.

Four things, in this order. Every value goes into **`.env.local`**, which
already exists in this folder — you're filling in blanks, not writing a file.

Nothing here costs money. No card is required at any step.

---

> **Status:** Neon, R2, the counter dates and both emails are already filled in
> and verified — `npm run check-conn` passes, the tables are pushed and the
> seed has run. The only thing left is **step 3, the passwords.**

## 0. Check it runs first

```bash
npm run dev
```

Open <http://localhost:3000>. You'll get the whole site, unlocked, with no
memories in it. That's the expected state — the app is deliberately built to
boot with an empty `.env.local` so you can look around before committing to
any of the accounts below.

---

## 1. Neon — the database (10 min)

Holds text and dates. No images, ever.

1. Go to <https://neon.tech> → sign up with Google.
2. **Create a project.** Name it `manno-momo`. Region: pick **AWS ap-south-1
   (Mumbai)** — it's the closest to Indore and it matters more than anything
   else on this page for how fast the site feels.
3. On the project dashboard, find **Connection string** and copy it. It looks
   like:
   ```
   postgresql://neondb_owner:AbCd1234@ep-cool-name-123456.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```
   Make sure the **Pooled connection** toggle is ON.
4. Paste it into `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```
5. Create the tables:
   ```bash
   npm run db:push
   ```
   It should print eight tables created.

> **Add Nehal's email to the Neon account** (Settings → Members). PRD §10: the
> archive shouldn't live entirely at one person's discretion.

---

## 2. Cloudflare R2 — the photos (10 min)

Holds the image and audio bytes. Free tier is 10 GB, and — the part that
matters — **zero egress fees, permanently**.

1. Go to <https://dash.cloudflare.com> → sign up.
2. Left sidebar → **R2**. It asks you to add a payment method to *enable* R2
   even on the free plan. You will not be charged unless you pass 10 GB; at
   the compression this app uses, that's roughly 35,000 photos.
3. **Create bucket.** Name: `manno-momo`. Location: **APAC**.
4. **Leave the bucket private.** Do not enable public access, do not connect a
   custom domain to it. The app serves every image through `/i/[key]`, which
   checks your session cookie first. This is deliberate — see PRD §6.
5. Go to **R2 → Manage R2 API Tokens → Create API Token**.
   - Permissions: **Object Read & Write**
   - Specify bucket: `manno-momo`
   - TTL: forever
6. It shows you three things **once**. Copy all three:
   - Access Key ID
   - Secret Access Key
   - the S3 endpoint, `https://<account_id>.r2.cloudflarestorage.com`
7. Fill in `.env.local`:
   ```
   R2_ACCOUNT_ID=<the hex string from the endpoint>
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=manno-momo
   R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   ```

### One extra step: CORS

The browser uploads straight to R2, so the bucket has to accept requests from
the site. Bucket → **Settings** → **CORS Policy** → paste:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "https://YOUR-DOMAIN.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Come back and add the real domain once you have one. **Uploads used to fail when
the dev server picked a port other than 3000** — the app now uploads through
`/api/upload/put` instead, so CORS is optional for local dev. Still configure it
before deploying: direct browser uploads are faster on mobile data.

---

## 3. Passwords — the login (2 min)

No Google, no OAuth, no third-party anything. **A password each** — not one
shared password. The site has to know which of you wrote which version, so the
two accounts stay separate.

```bash
npm run set-password
```

It asks for a password for `manno`, then for `momo`, twice each, with the
typing hidden. It writes **hashes** into `.env.local` — the plaintext is never
stored, not in the file and not in your shell history. It also generates
`AUTH_SECRET` if that's still empty.

Use at least 8 characters. To change just one of them later:

```bash
npm run set-password momo
```

**Restart the dev server afterwards.** Until you do, the site is still in its
unlocked state and won't show a login screen — which is the usual reason people
think the login is missing.

Once it restarts, opening any page sends you to `/signin`: two buttons —
`manno` and `momo` — and a password box. It remembers which of you last used
that device.

To switch on a shared laptop: tap the handle chip in the top-right → **sign
out**. Nehal then signs in as `momo`, and everything she writes and uploads is
recorded as hers.

<details>
<summary>If that script won't run</summary>

You can put a plaintext password straight into `.env.local` instead:

```
MANNO_PASSWORD=whatever you picked
MOMO_PASSWORD=whatever she picked
```

The `*_PASSWORD_HASH` values take priority, so blank those out if you go this
way. Avoid a `$` in the password — the env loader treats `$name` as a variable
reference and will silently eat part of it, which locks you out with a
confusing "that isn't it".
</details>

## 4. The two emails and the three dates (2 min)

```
MANNO_EMAIL=your.actual@gmail.com
MOMO_EMAIL=her.actual@gmail.com

COUNTER_MET=2022-08-30
COUNTER_FRIENDS=2022-09-30
COUNTER_TOGETHER=2026-08-25
```

The emails are **labels only** now — nothing authenticates against them. They
just fill in the `users` table.

The three dates are PRD §11 question 1 — met, best friends, together. They
render as `day 1,462` on the hero and in the footer, and tick over at midnight
IST. Paste them with no leading space; the app trims and validates, but a
mangled date is silently skipped rather than shown wrong.

Then seed the two users, the counters, and the starting list of firsts:

```bash
npm run db:seed
```

It's idempotent — re-run it any time you change a date.

**Add your first memory before you touch anything else.** The PRD is right
about this: put 20 real memories in before you have opinions about the design.

---

## 5. Deploy

**→ [DEPLOY.md](./DEPLOY.md)** — full Vercel guide (env vars, CORS, migrations, cron).

Quick version:

1. Push to GitHub (private repo).
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Paste every line from `.env.local` into **Environment Variables**, but set:
   ```
   AUTH_URL=https://your-project.vercel.app
   ```
4. Before first deploy, run locally:
   ```bash
   npm run migrate-all
   npm run db:seed
   npm run check-deploy
   npm run check-conn
   ```
5. Deploy. Then add the live URL to **R2 → CORS `AllowedOrigins`** — uploads go browser → R2 directly and need this.

> When pasting a hash into Vercel's env UI, paste it exactly. It looks like
> `scrypt:<hex>:<hex>` — no spaces, no line break, no surrounding quotes.

### Then, on your phone

Open the site in Chrome → menu → **Add to Home screen**. That installs it as a
PWA, which is what turns on the share sheet: from then on, selecting photos in
Google Photos → Share → **manno weds momo** drops you straight into `/new`
with the photos already attached and the date already read out of them.

That path is the whole project. If it works, the archive fills up. If it
doesn't, nothing else on this page matters.

The session lasts 90 days, so you type the password roughly four times a year.

---

## If something misbehaves

Run the connection check first — it tells you which half is broken:

```bash
npm run check-conn
```

Useful things to send me:

- the output of `npm run check-conn`
- whether `/new` still shows the red "not wired up yet" box after a restart
- for login trouble: whether the message is `that isn't it` (wrong password or
  a mangled hash) or `too many tries` (rate limiter — wait it out, or restart
  the server to clear it)
- for upload failures: the Network tab entry for the failing `PUT` to
  `r2.cloudflarestorage.com` — a **CORS** error means step 2's CORS block, a
  **403** means the API token isn't Object Read **& Write**

Don't paste `AUTH_SECRET`, `R2_SECRET_ACCESS_KEY`, or your passwords anywhere.
I don't need them.

---

## The quarterly thing

Set a calendar reminder. Every three months:

1. Open `/export`, download the JSON.
2. Run the `rclone sync` line printed on that page to mirror the photos.
3. Put both somewhere you *both* have access to.

This site is a view. The originals stay in Google Photos and on a hard drive.
Never let a hobby project be the only copy of your memories.
