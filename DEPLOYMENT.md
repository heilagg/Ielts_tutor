# Deployment Guide — IELTS 7.5 Coach

This covers taking the app from local SQLite dev to a real deployment reachable from your
iPhone/Mac anywhere, with Postgres and a configured Claude API key.

## 1. Environment variables

Copy `.env.example` to `.env` (local) or set these in your host's environment settings
(production). Never commit `.env` — it's already gitignored.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `file:./dev.db` for local SQLite. A real `postgresql://...` URL for production (see §2). |
| `ANTHROPIC_API_KEY` | Yes, for AI features | From https://console.anthropic.com/. Without it, generation/evaluation falls back to a small offline sample and a heuristic scorer — clearly labelled in the UI, not hidden. |
| `ANTHROPIC_MODEL` | No | Base model, default `claude-sonnet-4-5`. Used by any tier below that isn't set individually. |
| `ANTHROPIC_MODEL_STRONG` | No | Model for Writing/Speaking evaluation, diagnostic analysis, monthly reports. |
| `ANTHROPIC_MODEL_BALANCED` | No | Model for the AI Tutor, Reading/Listening/Writing/Speaking generation, daily plans, weekly reports. |
| `ANTHROPIC_MODEL_FAST` | No | Model for vocabulary lookups and other simple/cheap operations. |
| `AI_DAILY_COST_LIMIT_USD` | No | Soft daily spend cap (estimated). Calls beyond it fail with a clear message instead of silently continuing. |
| `AI_MONTHLY_COST_LIMIT_USD` | No | Soft monthly spend cap (estimated). |
| `APP_SESSION_SECRET` | Yes | Any long random string. Not currently used to sign anything cryptographically sensitive (see §5), but set a real value anyway. |

Generate a random secret if you need one:

```bash
openssl rand -base64 32
```

## 2. Database (Postgres for production)

SQLite is fine for local development but **not** for a deployed app on a host with an
ephemeral/read-only filesystem (Vercel, most serverless platforms) — the SQLite file would be
wiped or unwritable between requests. For production:

1. Provision a Postgres instance. Any of these work fine: [Neon](https://neon.tech),
   [Supabase](https://supabase.com), [Railway](https://railway.app), or Vercel Postgres.
2. In `prisma/schema.prisma`, change:
   ```diff
   datasource db {
   -  provider = "sqlite"
   +  provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` to your Postgres connection string (production hosts usually want
   `?sslmode=require` appended).
4. Run the migration against that database:
   ```bash
   npx prisma migrate deploy
   ```
   (`migrate deploy` — not `migrate dev` — for production: it applies existing migrations without
   prompting or generating new ones.)
5. Commit the schema change (`prisma/schema.prisma`) — do **not** commit `.env`.

## 3. AI API (Claude)

1. Create a key at https://console.anthropic.com/.
2. Set `ANTHROPIC_API_KEY` as a **server-side** environment variable on your host. It is never
   read by any client-side code — every Claude call happens inside a Next.js API route
   (`src/app/api/**`), so the key never reaches the browser.
3. (Optional) Set the per-tier model overrides and cost limits described in §1 once you know
   which models your account can access and what monthly budget you want to enforce.

## 4. Deploying

### Option A — Vercel (recommended, easiest for Next.js)

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add the environment variables from §1 in the Vercel project settings (Production + Preview).
4. Vercel runs `npm run build` automatically. Add a **Postgres** integration or paste your own
   `DATABASE_URL` from §2 first — the build does not run migrations itself, so either:
   - run `npx prisma migrate deploy` locally against the production `DATABASE_URL` once before
     first deploy, or
   - add it as a Vercel deploy hook / build step (`"vercel-build": "prisma migrate deploy && next build"`
     in `package.json`).
5. Deploy. Your app is live at `https://<project>.vercel.app` (or a custom domain).

### Option B — Any Node host (Railway, Render, Fly.io, a VPS, etc.)

```bash
npm install
npx prisma migrate deploy
npm run build
npm run start   # serves on $PORT, default 3000
```

Make sure the process has the environment variables from §1 available, and that the host keeps
the Node process warm (this app has no serverless cold-start concerns beyond Next.js's own).

## 5. Security notes specific to this app

- This app is built for **one private student**, not multi-tenant use. Identity is a durable
  anonymous cookie (`ielts_uid`, httpOnly) assigned by `src/middleware.ts` — there is no
  password/account system. If you deploy this publicly reachable, anyone with the URL who visits
  it gets their own cookie/profile and can use your Anthropic API budget. For a single-user
  personal deployment, either:
  - keep the URL private/unlisted, or
  - put it behind your host's access control (e.g. Vercel Password Protection, a VPN, or
    Cloudflare Access), or
  - add real authentication (out of scope for this build — see "What remains" in `README.md`).
- `AI_DAILY_COST_LIMIT_USD` / `AI_MONTHLY_COST_LIMIT_USD` (§1) are your main defense against
  runaway API spend from a leaked URL — set them for any public-reachable deployment.
- Rotate `ANTHROPIC_API_KEY` immediately if it's ever exposed (committed, logged, etc.).

## 6. Installing on iPhone (after deploying)

1. Open the deployed URL in **Safari** on the iPhone (must be Safari — iOS only allows installing
   PWAs from Safari, not Chrome or other browsers).
2. Tap the **Share** icon (square with an up arrow) in the toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name and tap **Add**.

It now launches full-screen with its own icon, like a native app, and keeps working (the app
shell, not AI features) if you briefly lose connectivity.

## 7. Production troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 errors on every page | `DATABASE_URL` unset/unreachable, or migrations not applied | Check the connection string; run `npx prisma migrate deploy` |
| AI features silently show "SAMPLE" content | `ANTHROPIC_API_KEY` not set in the deployed environment (separate from your local `.env`) | Set it in your host's environment variable settings, then redeploy/restart |
| "AI usage limit reached" errors | `AI_DAILY_COST_LIMIT_USD` / `AI_MONTHLY_COST_LIMIT_USD` hit | Expected behavior — raise the limit or wait for the period to reset (see Profile page for current spend) |
| PWA won't install / no "Add to Home Screen" option | Not using Safari on iOS, or `manifest.json`/icons failed to load | Confirm `/manifest.json` and `/icons/*.png` are reachable (check your host didn't block `/public`) |
| Slow Reading/Listening generation (30–100s) | Expected — a full 40-question test is a large generation call | Already mitigated with a higher token budget + one retry; still inherently slower than short prompts |
| Band scores look wrong after a short practice set | Should not happen — raw scores are scaled to a /40-equivalent before band lookup (`src/lib/scoring/band.ts`) | If you see this, it's a regression — check `readingRawToBand`/`listeningRawToBand` are called with both `raw` and `total` |
