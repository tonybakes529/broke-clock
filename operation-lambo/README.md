# Operation Lambo 🏎️

A single-player wealth game. **The bank is the score.** Every day you don't hit
the mission, the target date slips. **$3M liquid net worth unlocks the trophy.**

The Lamborghini is not the goal — it's the scoreboard. The real win is $3M
investable net worth, at which a ~$300K car is <10% of net worth: buy it in cash,
no wound. The game makes you ruthless with allocation by putting teeth on every
day (loss aversion is the engine).

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — racing-HUD dark theme (Orbitron + Chakra Petch)
- **Supabase** — Postgres + magic-link Auth + Row Level Security
- **Recharts** — bank-over-time chart
- **lucide-react** — icons
- **Vercel** — hosting + nightly cron (the slip engine)

## The loop

1. **Feed the bank** → the car moves toward $3M.
2. **Log every dollar that leaves** → luxury spend is flagged and punished.
3. **Miss a day's mission** → the target slips by `miss_penalty` days (default 3).

**Daily mission** (complete when all true for today):
1. At least one income tx logged today.
2. Net bank change today ≥ `daily_goal` (default $2,740 ≈ $3M / 1095 days).
3. Zero luxury-flagged spend today.

All math lives in `lib/engine.ts` as pure, unit-tested functions
(`npm test` → 36 tests).

## Setup

1. **Create a Supabase project** and run `supabase/schema.sql` in the SQL editor.
2. **Env** — copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE` (server only — used by the cron)
   - `CRON_SECRET` (shared secret protecting `/api/slip`)
3. **Install + run**
   ```bash
   npm install
   npm run dev
   ```
4. **First login** seeds your starting state (`lib/data.ts`):
   bank `$1,987.56`, debts Chase/Amex/Frontier/Blue. Edit to match reality.

## The slip engine

`/api/slip` evaluates every past day from `start_date` to yesterday: any day
with no completed mission and not yet judged adds `miss_penalty` to
`delay_days` and is marked judged (never re-penalized; today is never judged).
It runs on **page load** for the current user, and **nightly at 06:00** via
Vercel cron (`vercel.json`) across all users using the service-role key.

## Deploy

Push to `tonybakes529/broke-clock`, import into Vercel, set the env vars
(including `CRON_SECRET`), and the cron in `vercel.json` will fire daily.

## CSV import

On **The Bank** tab, upload a card/bank export (`date, description, amount`).
Negatives → spend, positives → income; luxury keywords pre-flag rows. Review
the preview, tick luxury per row, then commit.
