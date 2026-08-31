# IELTS 7.5 Coach

A personal, AI-powered IELTS Academic preparation platform - a mobile-first PWA that takes one student from their current level to an estimated Band 7.5 over roughly six months.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma (SQLite by default, Postgres-ready), and the Anthropic API (Claude) as the AI provider.

## What it does

- Onboarding leads into a full diagnostic (Reading, Listening, Writing Task 1 & 2, Speaking) and produces a diagnostic report: band table, strengths/weaknesses, main bottleneck, six-month roadmap.
- Reading: AI-generated 3-passage / 40-question IELTS Academic tests (Multiple Choice, True/False/Not Given, Matching Headings/Information/Features, Sentence/Summary/Table Completion, Short Answer), timed and auto-graded with a per-question-type accuracy breakdown.
- Listening: AI-generated 4-section / 40-question tests with full spoken scripts, played through the browser's speech synthesis, graded the same way as Reading.
- Writing: Task 1 (AI-generated chart/table/process data, rendered with Recharts) and Task 2 (essay prompts), with a real editor (word count, timer, autosave) and a 4-criteria IELTS rubric evaluation from Claude, including sentence-level corrections.
- Speaking: Part 1/2 (cue card)/3 flow with live transcription via the Web Speech API, speech-rate and hesitation metrics, and a 4-criteria Claude evaluation (falls back to typed text input if the browser doesn't support speech recognition).
- An adaptive daily plan generated from actual weak spots (weak question types, recurring errors, exam proximity), with a stated reason for each task.
- A six-month, phase-based curriculum that tracks which month you're in.
- Progress tracking, error review, a vocabulary section (AI-assisted definitions/collocations), an AI tutor chat grounded in your real score history, recurring mock exams, and a study/exam mode toggle.
- Installable as a PWA on the iPhone home screen, with offline app-shell caching.
- A "why am I not at my target yet" breakdown: current estimate, biggest blockers, skills already sufficient, skills below target, next steps, estimated time to target.
- Quick sessions ("I have 30/60/120 minutes") and a low-motivation recovery mode that detects 2+ missed days and offers a short 20-minute restart instead of a full plan.
- Mistake flashcards with real spaced repetition (SM-2, the same algorithm Anki uses) - wrong answers resurface sooner, correct ones less often, until marked mastered.
- Weekly and monthly reports combining deterministic stats (study time, tasks, score deltas, errors corrected) with an optional AI-written narrative summary.
- Plateau detection: flags a skill whose scores haven't moved in 2+ weeks and tries to diagnose why from actual error/practice data.
- Configurable AI model routing and cost tracking - generation/evaluation calls route through STRONG/BALANCED/FAST tiers, with token usage and estimated cost logged and shown on the Profile page, plus optional daily/monthly spend caps.
- A lightweight XP/streak/achievements layer, unlocked on real milestones (first mock, 10 essays, 100 corrected mistakes, band targets hit) - never gates functionality.

## Honest scope notes

- No AI key configured: every AI-generation and AI-evaluation call has a working fallback (a smaller sample test, or a heuristic word-count/vocabulary-diversity scorer), so the app is fully click-through-able with zero setup. These fallbacks are clearly labelled in the UI and aren't meant to replace the real Claude-powered experience - set `ANTHROPIC_API_KEY` for that.
- Listening audio uses the browser's built-in text-to-speech (`speechSynthesis`), not a generated audio file - there's no server-side audio pipeline. Voice quality depends on the voices installed on the device.
- Single-user, no password login: this is built as one student's private coach, not a multi-tenant SaaS. Identity is a durable anonymous cookie set by middleware - there's no account system, sign-up, or password.
- Notifications are a local browser feature (Notification API) - reminders only fire while the tab/PWA is open, since there's no push-notification backend.

## 1. Run it locally

```bash
npm install
cp .env.example .env
npx prisma migrate dev # creates prisma/dev.db (SQLite) from the schema
npm run dev
```

Open `http://localhost:3000` - it walks you straight into onboarding.

## 2. Configure the AI (Claude)

Get a key from [console.anthropic.com](https://console.anthropic.com/), then in `.env`:

```text
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5" # optional override, used by all 3 tiers below by default
```

Restart `npm run dev` after changing `.env`. Every generation/evaluation call switches from its offline fallback to full Claude-powered output automatically - no code changes needed.

The AI layer is provider-agnostic by design: everything goes through `src/lib/ai/client.ts`, so swapping providers means changing one file, not every feature.

Optional: split cost vs. quality across model tiers (`src/lib/ai/models.ts`) and cap spend - see `.env.example` for `ANTHROPIC_MODEL_STRONG`/`BALANCED`/`FAST` and `AI_DAILY_COST_LIMIT_USD`/`AI_MONTHLY_COST_LIMIT_USD`. Running totals show on the Profile page.

## 3. Configure the database

Default is SQLite, zero config - good for a single personal user. To use Postgres instead:

1. In `prisma/schema.prisma`, change the datasource provider from `"sqlite"` to `"postgresql"`.
2. In `.env`, set `DATABASE_URL="postgresql://user:password@host:5432/ielts_tutor"`.
3. Run `npx prisma migrate dev`.

## 4. Open it on iPhone

Your iPhone needs to reach the machine running `npm run dev`:

```bash
npm run dev -- -H 0.0.0.0
```

Find your Mac's local IP (System Settings → Wi-Fi → Details, or `ipconfig getifaddr en0`), then on your iPhone (same Wi-Fi network) open Safari to `http://<your-mac-ip>:3000`.

For a real deployment reachable from anywhere, deploy to Vercel (or any Node host) and point your iPhone at the public URL instead - see step 6.

## 5. Add it to the iPhone home screen

1. Open the app URL in Safari on the iPhone (must be Safari, not Chrome - iOS only allows installing PWAs from Safari).
2. Tap the Share icon in the toolbar.
3. Scroll down and tap "Add to Home Screen".
4. Confirm the name and tap Add.

It now opens full-screen, no browser chrome, with its own icon.

## 6. Deploying so it's reachable from anywhere

Any Node-compatible host works (Vercel is easiest for Next.js). At minimum:

- `DATABASE_URL` pointing at a real Postgres instance (SQLite is fine for local dev, not for a deployed app with a read-only/ephemeral filesystem).
- `ANTHROPIC_API_KEY` set as a server-side environment variable (never exposed to the client - all Claude calls happen in API routes).
- `APP_SESSION_SECRET` set to a real random string.

## 7. Starting the diagnostic

First launch → onboarding (exam type, target score, exam date, current level, daily study time, study days, six-month plan) → straight into `/diagnostic`, which requires completing Reading, Listening, both Writing tasks, and Speaking before the personalized plan unlocks. This is enforced server-side (`src/lib/guards.ts`), not just a UI suggestion.

## Architecture

```
Browser (mobile-first React, Tailwind)
  -> Next.js API routes (src/app/api/**) - auth/session, validation, scoring
  -> AI layer (src/lib/ai/**) - prompts, schemas, Claude client, offline fallbacks
  -> Prisma / SQLite or Postgres - all persistent state
```

Key separation of concerns:

- `src/lib/ai/prompts/*` - one file per skill's Claude prompts (reading, listening, writing, speaking, tutor, vocabulary), independent of the UI.
- `src/lib/scoring/*` - band conversion, IELTS overall-band rounding, score prediction/trend, reading/listening grading - pure functions, no AI or UI involved.
- `src/lib/adaptive.ts` + `src/lib/dailyPlan.ts` - the weakness-detection and daily-plan-generation engine, rule-based and explainable (every task states why it was assigned).
- `src/components/**` - one folder per feature area, mostly presentational.
- `prisma/schema.prisma` - the full data model (users, profiles, sessions, all four skills' attempts, scores, errors, vocabulary, grammar, mocks, chat).

## Possible next steps

- Push notifications (vs. the current in-tab Notification API reminders) would need a backend push service (e.g. web-push + VAPID keys) - not built yet, since it adds real infrastructure for an explicitly optional feature.
- The vocabulary/grammar system currently seeds itself from Writing/Speaking mistakes and manually-added words - there's no bulk import.
- The offline story is "app shell loads offline" - AI generation/evaluation needs a live connection and isn't queued for later.
