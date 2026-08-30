# IELTS 7.5 Coach

A personal, AI-powered IELTS Academic preparation platform — a mobile-first PWA that takes one
student from their current level to an estimated Band 7.5 over roughly six months.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma (SQLite by default,
Postgres-ready), and the Anthropic API (Claude) as the primary AI provider.

## What's implemented

- **Onboarding** → **full diagnostic** (Reading, Listening, Writing Task 1 & 2, Speaking) →
  **diagnostic report** (band table, strengths/weaknesses, bottleneck, six-month roadmap)
- **Reading**: AI-generated 3-passage / 40-question IELTS Academic tests (Multiple Choice,
  True/False/Not Given, Matching Headings/Information/Features, Sentence/Summary/Table
  Completion, Short Answer), timed, auto-graded with band conversion and per-question-type
  accuracy breakdown
- **Listening**: AI-generated 4-section / 40-question tests with full spoken scripts, played
  automatically via the browser's speech synthesis (transcript hidden until submission), graded
  the same way as Reading
- **Writing**: Task 1 (AI-generated chart/table/process data rendered with Recharts) and Task 2
  (essay prompts), a real editor with word count/timer/autosave, and a full 4-criteria IELTS
  rubric evaluation from Claude with detailed sentence-level corrections (original → problem →
  explanation → improved → rule → new example)
- **Speaking**: Part 1/2 (cue card)/3 flow, live transcription via the Web Speech API, speech-rate
  and hesitation metrics, and a 4-criteria Claude evaluation (with a typed text-input fallback if
  the browser doesn't support speech recognition)
- **Adaptive daily plan**: every day's tasks are generated from your actual weaknesses (weak
  question types, recurring errors, exam proximity) with a stated reason for each task
- **Six-month curriculum**: phase-based roadmap that tracks which month you're in
- **Progress**, **Error review**, **Vocabulary** (AI-assisted definitions/collocations),
  **AI Tutor chat** (grounded in your real score history, not a stateless chatbot), **Mock exams**
  (auto-rotating weekly check-ins + monthly full mocks), and a **Study/Exam mode** toggle
  everywhere
- **PWA**: installable on iPhone home screen, offline app-shell caching, manifest + icons +
  service worker
- **"Why am I not at my target yet?"**: a dedicated breakdown (current estimate, biggest
  blockers, skills already sufficient, skills below target, next steps, time-to-target estimate)
  with an optional on-demand AI-written plain-English explanation
- **Quick sessions** ("I have 30/60/120 minutes") and a **low-motivation recovery mode** that
  detects 2+ missed days and offers a short 20-minute restart session instead of a normal full plan
- **Mistake flashcards with real spaced repetition (SM-2)**: every recurring error becomes a
  flashcard scheduled by the same algorithm used in Anki — wrong answers resurface sooner, correct
  ones less often, until marked mastered
- **Weekly & monthly reports**: deterministic stats (study time, tasks, score deltas, errors
  corrected, what improved/didn't) plus an optional AI-written narrative summary
- **Plateau detection**: flags a skill whose last several scores haven't moved in 2+ weeks and
  attempts to diagnose why from your actual error/practice data
- **Configurable AI model routing + cost tracking**: generation/evaluation calls route through
  STRONG/BALANCED/FAST tiers (env-configurable model per tier), every call's token usage and
  estimated cost is logged and shown on the Profile page, with optional daily/monthly spend caps
- **Lightweight XP/streak/achievements**: non-primary, unlocked automatically on real milestones
  (first mock, 10 essays, 100 corrected mistakes, band targets hit) — never gates functionality

### Honest scope notes

- **No AI key configured**: every AI-generation and AI-evaluation call has a real, working
  fallback (a smaller sample test, or a heuristic word-count/vocabulary-diversity scorer) so the
  app is fully click-through-able with zero setup. These fallbacks are clearly labelled in the UI
  and are **not** meant to replace the real Claude-powered experience — set `ANTHROPIC_API_KEY`
  for the actual product.
- **Listening audio** uses the browser's built-in text-to-speech (`speechSynthesis`), not a
  generated audio file — there is no server-side audio pipeline in this build. Voice quality
  depends on the voices installed on the device.
- **Single-user, no password login**: this is built as one student's private coach, not a
  multi-tenant SaaS. Identity is a durable anonymous cookie set by middleware — there is no
  account system, sign-up, or password anywhere.
- **Notifications** are a local browser feature (`Notification` API) — reminders only fire while
  the tab/PWA is open, since there's no push-notification backend.

## 1. Run it locally

```bash
npm install
cp .env.example .env      # already done if you're reading this from the built repo
npx prisma migrate dev    # creates prisma/dev.db (SQLite) from the schema
npm run dev
```

Open **http://localhost:3000** — it will walk you straight into onboarding.

## 2. Configure the AI (Claude)

Get a key from https://console.anthropic.com/, then in `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5"   # optional override, used by all 3 tiers below by default
```

Restart `npm run dev` after changing `.env`. Every generation/evaluation call switches from its
offline fallback to full Claude-powered output automatically — no code changes needed.

The AI layer is provider-agnostic by design: everything goes through `src/lib/ai/client.ts`, so
swapping providers means changing one file, not every feature.

Optional: split cost vs. quality across model tiers (`src/lib/ai/models.ts`) and cap spend —
see `.env.example` for `ANTHROPIC_MODEL_STRONG/BALANCED/FAST` and
`AI_DAILY_COST_LIMIT_USD`/`AI_MONTHLY_COST_LIMIT_USD`. Running totals are shown on the Profile page.

## 3. Configure the database

Default is SQLite, zero config — good for a single personal user. To use Postgres instead:

1. In `prisma/schema.prisma`, change the datasource `provider` from `"sqlite"` to `"postgresql"`.
2. In `.env`, set `DATABASE_URL="postgresql://user:password@host:5432/ielts_tutor"`.
3. Run `npx prisma migrate dev`.

## 4. Open it on iPhone

Your iPhone needs to reach the machine running `npm run dev`:

```bash
npm run dev -- -H 0.0.0.0
```

Find your Mac's local IP (`System Settings → Wi-Fi → Details`, or `ipconfig getifaddr en0`), then
on your iPhone (same Wi-Fi network) open Safari to `http://<your-mac-ip>:3000`.

For a real deployment reachable from anywhere, deploy to Vercel (or any Node host) and point your
iPhone at the public URL instead — see step 6.

## 5. Add it to the iPhone Home Screen

1. Open the app URL in **Safari** on the iPhone (must be Safari, not Chrome — iOS only allows
   installing PWAs from Safari).
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name and tap **Add**.

It now opens full-screen, no browser chrome, with its own icon — a real installed app.

## 6. Deploying so it's reachable from anywhere

Any Node-compatible host works (Vercel is easiest for Next.js). At minimum you'll want:

- `DATABASE_URL` pointing at a real Postgres instance (SQLite is fine for local dev, not for a
  deployed app with a read-only/ephemeral filesystem)
- `ANTHROPIC_API_KEY` set as a server-side environment variable (never exposed to the client —
  all Claude calls happen in API routes)
- `APP_SESSION_SECRET` set to a real random string

## 7. Starting the diagnostic

First launch → onboarding (exam type, target score, exam date, current level, daily study time,
study days, 6-month plan) → you're dropped straight into `/diagnostic`, which requires completing
Reading, Listening, both Writing tasks, and Speaking before your personalized plan unlocks. This
is enforced server-side (`src/lib/guards.ts`), not just a UI suggestion.

## What remains to be configured / possible next steps

Nothing required — the app runs immediately. Optional, for a more complete production setup:

- Set `ANTHROPIC_API_KEY` for full AI generation/evaluation (see above) — this is the single
  highest-impact thing to configure.
- Switch to Postgres if deploying (see above).
- The vocabulary/grammar system currently seeds itself from your Writing/Speaking mistakes and
  manually-added words; there's no bulk import.
- Push notifications (vs. the current in-tab `Notification` API reminders) would need a backend
  push service (e.g. web-push + VAPID keys) — not built, since it's explicitly optional per spec
  and adds real infrastructure.
- The offline story is "app shell loads offline"; AI generation/evaluation obviously requires a
  live connection and is not queued for later.

## Architecture

```
Browser (mobile-first React, Tailwind)
  ↓
Next.js API routes (src/app/api/**)  — auth/session, validation, scoring
  ↓
AI layer (src/lib/ai/**)             — prompts, schemas, Claude client, offline fallbacks
  ↓
Prisma / SQLite or Postgres          — all persistent state
```

Key separation of concerns:

- `src/lib/ai/prompts/*` — one file per skill's Claude prompts (reading, listening, writing,
  speaking, tutor, vocabulary), independent of UI
- `src/lib/scoring/*` — band conversion, IELTS overall-band rounding, score prediction/trend,
  reading/listening grading — pure functions, no AI or UI involved
- `src/lib/adaptive.ts` + `src/lib/dailyPlan.ts` — the weakness-detection and daily-plan-generation
  engine, rule-based and explainable (every task states why it was assigned)
- `src/components/**` — one folder per feature area, mostly presentational
- `prisma/schema.prisma` — the full data model (users, profiles, sessions, all four skills'
  attempts, scores, errors, vocabulary, grammar, mocks, chat)

## Testing performed this session

With a real `ANTHROPIC_API_KEY` configured, the full loop was exercised live against the actual
Claude API (not fallbacks): onboarding → full diagnostic (Reading, Listening, Writing Task 1 & 2,
Speaking, all AI-generated and AI-graded) → diagnostic report → home dashboard → error review →
mistake flashcards (SM-2 grading confirmed against the database) → vocabulary → progress/plateau
detection → weekly & monthly reports (including the on-demand AI narrative) → "Why am I not 7.5
yet?" (including the AI narrative) → mock exam hub → a clean `next build` and a smoke test of the
production server (`next start`).

Real bugs found and fixed via this live testing (not just typecheck/lint):

- **Reading/Listening generation truncation**: a full 40-question test occasionally exceeded the
  token budget mid-JSON and silently fell back to a tiny sample test while taking up to 2 minutes.
  Fixed by raising the token budget and adding one automatic retry before falling back.
- **Writing Task 1 generation failure**: Claude sometimes emitted the bare word `undefined` for
  unused optional JSON fields (e.g. `"tableData": undefined`), which isn't valid JSON and broke
  parsing. Fixed the schema to accept `null` and the prompt to explicitly require `null` instead.
- **Wrong band on shorter practice sets**: the raw→band conversion table is calibrated for a
  40-question test; a 13-question practice set was scored directly against that table, producing
  a badly understated band (7/13 correct showed as Band 3 instead of the correct ~Band 5.5). Fixed
  by scaling any non-40-question raw score to its /40-equivalent before lookup.
- **Study streak always showing 0 in UTC+ timezones**: the streak calculation mixed a local-midnight
  `Date` with UTC-based date-string comparisons, so it read 0 for any server timezone ahead of UTC.
  Fixed to compare UTC calendar days consistently throughout.
- **Hydration-risk in the Error Review list**: a client component computed
  `new Date(...).toLocaleDateString()` at render time, which can differ between server and browser
  locale/timezone and risks a React hydration mismatch. Fixed by formatting the date once on the
  server and passing the string down instead.

Not fully verifiable in this sandboxed environment: real device microphone capture end-to-end
(Web Speech API code path was exercised with a fabricated transcript instead), and real push
notifications (the in-app `Notification` API path was verified, not a backend push service, which
isn't built — see the scope notes above).
