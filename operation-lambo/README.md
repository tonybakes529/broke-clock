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
- **localStorage** — all game state lives in your browser. No backend, no auth,
  no env vars, no database to provision.
- **Recharts** — bank-over-time chart
- **lucide-react** — icons
- **Vercel** — static hosting

> Single-player, single-device by design: your data is saved in the browser.
> Clearing site data (or the **Reset** button in the header) wipes the game.

## The loop

1. **Feed the bank** → the car moves toward $3M.
2. **Log every dollar that leaves** → luxury spend is flagged and punished.
3. **Miss a day's mission** → the target slips by `missPenalty` days (default 3).

**Daily mission** (complete when all true for today):
1. At least one income tx logged today.
2. Net bank change today ≥ `dailyGoal` (default $2,740 ≈ $3M / 1095 days).
3. Zero luxury-flagged spend today.

All math lives in `lib/engine.ts` as pure, unit-tested functions
(`npm test` → 36 tests). The **slip engine** runs in the browser on every load:
any past day from `startDate` to yesterday with no completed mission and not yet
judged adds `missPenalty` to `delayDays` and is marked judged (never
re-penalized; today is never judged).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine unit tests
npm run build    # production build
```

First run seeds your starting state (`lib/store.ts`): bank `$1,987.56`, debts
Chase/Amex/Frontier/Blue. Edit `SEED_BANK` / `SEED_DEBTS` to match reality.

## Deploy (Vercel)

In the Vercel project: **Framework Preset = Next.js**, **Root Directory =
`operation-lambo`**. No environment variables required. Push and deploy.

## CSV import

On **The Bank** tab, upload a card/bank export (`date, description, amount`).
Negatives → spend, positives → income; luxury keywords pre-flag rows. Review the
preview, tick luxury per row, then commit.
