function formatUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function MetricCard({ label, value, sub, accent }) {
  const accentColor =
    accent === 'gold'
      ? 'text-gold'
      : accent === 'emerald'
        ? 'text-emerald-400'
        : 'text-zinc-100'
  return (
    <div className="card card-glow p-5 md:p-6 flex flex-col justify-between min-h-[140px]">
      <span className="label">{label}</span>
      <div>
        <div className={`metric-value ${accentColor}`}>{value}</div>
        {sub && <div className="text-xs text-zinc-500 mt-1.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function MetricsPanel({
  avgDailyProfit,
  projectedMonthlyProfit,
  availableCapital,
  entryCount,
}) {
  const windowLabel =
    entryCount === 0
      ? 'No entries yet'
      : `Based on last ${Math.min(entryCount, 30)} ${entryCount === 1 ? 'entry' : 'entries'}`

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-display text-xl text-zinc-300">Performance</h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Live
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Average Daily Profit"
          value={formatUSD(avgDailyProfit)}
          sub={windowLabel}
        />
        <MetricCard
          label="Projected Monthly Profit"
          value={formatUSD(projectedMonthlyProfit)}
          sub="Daily Avg × 30"
          accent="emerald"
        />
        <MetricCard
          label="Available Capital"
          value={formatUSD(availableCapital)}
          sub="Current bank balance"
          accent="gold"
        />
      </div>
    </section>
  )
}
