# Production Checklist — IELTS 7.5 Coach

Run through this before considering a deployment "done." See `DEPLOYMENT.md` for the how-to
behind each item.

## Environment

- [ ] `DATABASE_URL` points at a real Postgres instance (not SQLite) with `sslmode=require` if required
- [ ] `prisma/schema.prisma` datasource `provider` is `"postgresql"`, not `"sqlite"`
- [ ] `npx prisma migrate deploy` has been run against the production database
- [ ] `ANTHROPIC_API_KEY` is set as a **server-side** environment variable on the host (never in client code, never committed)
- [ ] `APP_SESSION_SECRET` is set to a real random value, not the placeholder
- [ ] `.env` is not committed to git (`git status` shows it untracked/ignored)

## AI configuration

- [ ] Decide whether to split model tiers (`ANTHROPIC_MODEL_STRONG/BALANCED/FAST`) or leave them
      all defaulting to `ANTHROPIC_MODEL`
- [ ] Set `AI_DAILY_COST_LIMIT_USD` and/or `AI_MONTHLY_COST_LIMIT_USD` if the deployment URL will
      ever be reachable by anyone besides you (see Security below)
- [ ] Confirm a real (non-fallback) generation call works post-deploy: start a Reading diagnostic
      and confirm it does **not** say "SAMPLE" anywhere in the passage title
- [ ] Confirm a real Writing evaluation returns `evaluatedByAI: true` (visible in the network
      response from `/api/writing/[id]/submit`), not the heuristic fallback

## Build & code health

- [ ] `npm run build` completes with no errors
- [ ] `npx tsc --noEmit` reports no errors
- [ ] `npx eslint src` reports no errors
- [ ] No console errors on first load of `/`, `/onboarding`, `/home`, `/diagnostic` in a real
      browser (check DevTools console, not just the terminal)

## Security

- [ ] Understand this app has **no password/account system** — identity is a single anonymous
      cookie per browser. If the deployment URL is public, anyone who opens it gets their own
      profile and consumes your Anthropic budget. Either keep the URL private, put it behind
      access control (Vercel Password Protection / Cloudflare Access / VPN), or accept the
      cost-limit env vars as your only guardrail.
- [ ] `ANTHROPIC_API_KEY` confirmed not present in any client-side bundle (`grep -r "sk-ant" .next/static` should return nothing after a build)
- [ ] Cost limits set per the item above if the URL is or might become publicly reachable
- [ ] Database connection string uses a role with only the privileges this app needs (not a
      Postgres superuser), if your provider supports scoped roles

## Data & backups

- [ ] Confirm your Postgres provider takes automatic backups (Neon/Supabase/Railway all do by
      default) — this app has no built-in export/backup feature
- [ ] If this matters to you: manually export your data at least once
      (`pg_dump` or your provider's export tool) before relying on the deployment long-term

## PWA / mobile

- [ ] `/manifest.json` loads and returns valid JSON on the deployed URL
- [ ] All icon URLs referenced in the manifest return 200 (check `/icons/icon-192.png` and `/icons/icon-512.png` at minimum)
- [ ] Service worker registers without error (check DevTools → Application → Service Workers)
- [ ] "Add to Home Screen" works from Safari on an actual iPhone, and the installed app opens
      full-screen with the correct icon and name
- [ ] Test on both iPhone (mobile-first target) and a desktop browser (wider layouts, side nav)

## Functional smoke test (do this once, post-deploy)

Walk through the full loop on the live URL, not just localhost:

1. Onboarding → full diagnostic (all four skills) → diagnostic report shows real bands
2. Home dashboard shows the estimate, target, gap, and today's plan with a stated reason per task
3. Complete one Reading and one Listening practice set — scores and per-question-type accuracy
   appear correctly
4. Submit one Writing task — real AI feedback appears with corrections, and a few of those
   corrections show up on the Errors page
5. Open Error Review → Flashcards, grade at least one card, confirm it doesn't reappear
   immediately (spaced repetition working)
6. Check Progress page renders charts with a target line; if enough score history exists, check
   plateau detection doesn't crash
7. Check `/progress/reports` (weekly/monthly) and `/progress/why-not-yet` load without errors
8. Check the Profile page's "AI usage & cost" numbers increased after the above testing

## Known non-goals (don't file these as bugs)

- No multi-user login/auth — by design, this is a single personal coach (see `DEPLOYMENT.md` §5)
- No server-side generated Listening audio — uses the browser's built-in text-to-speech
- No push notifications — only in-app `Notification` API reminders while the tab/PWA is open
- No bulk vocabulary import — vocabulary is seeded from your own mistakes and manual additions
