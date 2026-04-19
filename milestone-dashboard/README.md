# Milestone Dashboard

A dark-mode luxury financial gatekeeper. Log daily revenue and expenses, track your bank balance, and let the dashboard tell you when you're **Approved** to buy that Rolex, Porsche, or MacBook — based on your actual business performance.

## The rules

- **3× Rule** — Projected Monthly Profit must be ≥ 3 × target price
- **10× Rule** — Current Bank Balance must be ≥ 10 × target price

Both must be met for **APPROVED**. Otherwise the row tells you which half to strengthen.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

This generates a static `dist/` folder — ready to upload to any host.

## Deploy in 3 steps

### Option A — Netlify (drag-and-drop)

1. Run `npm run build` — you now have a `dist/` folder.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and sign in.
3. Drag the entire `dist/` folder onto the drop zone. Netlify gives you a live URL immediately — open it on your phone.

### Option B — Vercel (CLI)

1. Run `npm install -g vercel` once, then `vercel login`.
2. From inside the `milestone-dashboard` folder, run `vercel` and accept the defaults (framework: Vite).
3. For a production URL, run `vercel --prod`. Open the URL on your phone.

## Data & privacy

All entries, your bank balance, and milestone names are stored in your browser's `localStorage`. Nothing is uploaded. Clearing your browser data will clear your history.
