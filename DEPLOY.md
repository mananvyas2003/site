# Deploy to Vercel

Step-by-step for putting **manno & momo** on Vercel. Read [SETUP.md](./SETUP.md) first if Neon and R2 aren't wired up yet.

---

## What you need before deploying

| Service | Purpose |
|---|---|
| [Neon](https://neon.tech) | Postgres — text, dates, notes |
| [Cloudflare R2](https://dash.cloudflare.com) | Private photo/audio storage |
| [Vercel](https://vercel.com) | Hosting (Hobby tier is fine) |
| GitHub | Private repo (already at `origin`) |

The production build is verified with `npm run build`. Uploads go **browser → R2 directly** via presigned URLs — required because Vercel caps serverless request bodies at 4.5 MB.

---

## 1. Push to GitHub

```bash
git add .
git commit -m "ready for vercel"
git push origin main
```

`.env.local` is gitignored — secrets stay local until you paste them into Vercel.

---

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import `mananvyas2003/site` (or your repo).
2. **Framework preset:** Next.js (auto-detected).
3. **Build command:** `npm run build` (default).
4. **Root directory:** `.` (default).
5. Do **not** deploy yet — set environment variables first.

---

## 3. Environment variables

In Vercel → Project → **Settings → Environment Variables**, add every line from your `.env.local` for **Production** (and Preview if you want preview deploys to work).

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string. Remove `channel_binding=require` if present. |
| `AUTH_SECRET` | From `npm run set-password`. Paste exactly — no quotes. |
| `AUTH_URL` | `https://your-project.vercel.app` (or custom domain). **Not** localhost. |
| `MANNO_PASSWORD_HASH` | From `.env.local`. Colon-separated scrypt hash. |
| `MOMO_PASSWORD_HASH` | Same. |
| `MANNO_EMAIL` / `MOMO_EMAIL` | Labels only. |
| `R2_*` | All five R2 vars from SETUP.md step 2. |
| `COUNTER_MET` / `COUNTER_FRIENDS` / `COUNTER_TOGETHER` | `YYYY-MM-DD` dates. |
| `VAPID_*` + `CRON_SECRET` | Optional — daily 9pm push reminder. Generate with `npx web-push generate-vapid-keys`. |

**Do not** set plaintext `MANNO_PASSWORD` / `MOMO_PASSWORD` on Vercel if you already have hashes.

Validate locally before deploying:

```bash
npm run check-deploy
npm run check-conn
```

---

## 4. Database migrations

Run once against your Neon database (local machine is fine — it uses `DATABASE_URL` from `.env.local`):

```bash
npm run migrate-all    # inbox, push, firsts photos
npm run db:seed        # two users, counters, starting firsts — idempotent
```

If this is a brand-new Neon project with no tables at all, run `npm run db:push` first, then `migrate-all`, then `db:seed`.

---

## 5. R2 CORS (required for uploads)

Bucket → **Settings → CORS Policy**:

```json
[
  {
    "AllowedOrigins": [
      "https://your-project.vercel.app",
      "https://your-custom-domain.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without this, photo uploads fail with a CORS error in the browser Network tab.

---

## 6. Deploy

Click **Deploy** in Vercel (or push to `main` if auto-deploy is on).

After the first successful deploy:

1. Open the live URL → you should see `/signin`.
2. Sign in as `manno` with your password.
3. Add a test memory at `/new` with one photo.
4. Confirm the photo appears on the memory page and loads via `/i/...`.

---

## 7. Custom domain (optional)

Vercel → Project → **Domains** → add your domain.

Then update:

- `AUTH_URL` → `https://your-domain.com`
- R2 CORS → add the custom domain to `AllowedOrigins`
- Redeploy (or wait for the next push)

---

## 8. PWA on your phone

Open the live site in Chrome → menu → **Add to Home screen**.

The share sheet target (`/new` with photos attached) only works over **HTTPS** on the installed PWA — which Vercel provides automatically.

---

## 9. Cron job (optional push reminders)

`vercel.json` already defines a daily cron at **9pm IST** (15:30 UTC):

```json
{ "path": "/api/cron/push", "schedule": "30 15 * * *" }
```

Requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET` in Vercel env. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

Cron jobs on Hobby: once per day per path — matches this use case.

---

## 10. Region

Functions run in **Mumbai (`bom1`)** — configured in `vercel.json`. Closest to Indore for faster DB and API responses.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login loops or "that isn't it" | Check `AUTH_URL` matches the live URL exactly. Re-paste hashes with no extra spaces. |
| `database not configured` | `DATABASE_URL` missing in Vercel env. Redeploy after adding. |
| Upload CORS error | Add live URL to R2 CORS `AllowedOrigins`. |
| Upload 403 | R2 token needs **Object Read & Write** on the bucket. |
| `inbox_messages` / table errors | Run `npm run migrate-all` against Neon. |
| Preview deploy login broken | Add preview URL pattern to R2 CORS, or skip Preview env vars. |
| Build fails | Run `npm run build` locally; fix TypeScript errors before pushing. |

```bash
npm run check-conn      # Neon + R2 connectivity
npm run check-deploy    # env var checklist
```

---

## After deploy — quarterly backup

Set a calendar reminder. Every three months:

1. Open `/export` on the live site → download JSON.
2. Run the `rclone sync` command printed there.
3. Store both somewhere you both have access to.

---

## Env reference

See [`.env.example`](./.env.example) for the full list with comments.
