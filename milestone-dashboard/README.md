# Milestone Dashboard

A dark-mode luxury financial gatekeeper. Log daily revenue and expenses, track your bank balance, and let the dashboard tell you when you're **Approved** to buy that Rolex, Porsche, or MacBook — based on your actual business performance.

## The rules

- **3× Rule** — Projected Monthly Profit must be ≥ 3 × target price
- **10× Rule** — Current Bank Balance must be ≥ 10 × target price

Both must be met for **APPROVED**. Otherwise the row tells you which half to strengthen.

## Stack

- **Frontend:** Vite + React + Tailwind, deployed to Vercel
- **Backend:** Supabase (Postgres + Auth) — magic-link email login
- **Offline mode:** if Supabase env vars aren't set, the app falls back to localStorage only

## Local development

Copy the env template and fill in your Supabase project values:

```bash
cp .env.example .env.local
# edit .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Without the env vars, the app runs in local-only mode (no auth, browser localStorage).

## Production build

```bash
npm run build
```

This generates a static `dist/` folder.

## Deploy to Vercel

The repo is wired to Vercel via the GitHub integration. Push to `main` to deploy.

**One-time Vercel setup:** In your Vercel project settings → **Environment Variables**, add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_…` |

Set the **Root Directory** to `milestone-dashboard` (Project Settings → General).

## Database schema

Three tables, all with row-level security so each authenticated user only sees their own rows:

- `daily_entries` — id, user_id, entry_date, revenue, expense, created_at
- `bank_balance` — user_id (PK), amount, updated_at
- `milestones` — (user_id, idx 0–6) PK, name, updated_at

Migration lives in Supabase project history (`init_milestone_dashboard_schema`).

## Privacy

Your data is stored in your private Supabase row, gated by RLS — only you can read or write it. No telemetry, no analytics, no third parties.
