const TIERS = [500, 2500, 5000, 12000, 30000, 100000, 500000]

function formatUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function evaluateStatus({ price, monthlyProfit, bankBalance }) {
  const profitGoal = price * 3
  const balanceGoal = price * 10
  const profitOk = monthlyProfit >= profitGoal
  const balanceOk = bankBalance >= balanceGoal

  if (profitOk && balanceOk) {
    return {
      key: 'approved',
      label: 'APPROVED',
      tone: 'emerald',
    }
  }
  if (balanceOk && !profitOk) {
    return { key: 'income', label: 'STRENGTHEN INCOME', tone: 'yellow' }
  }
  if (profitOk && !balanceOk) {
    return { key: 'savings', label: 'STRENGTHEN SAVINGS', tone: 'yellow' }
  }
  return { key: 'saving', label: 'SAVING', tone: 'red' }
}

function StatusPill({ status }) {
  const toneMap = {
    emerald:
      'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 shadow-emerald',
    yellow: 'bg-amber-400/10 text-amber-300 border-amber-500/40',
    red: 'bg-red-500/10 text-red-300 border-red-500/40',
  }
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap ${
        toneMap[status.tone]
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status.tone === 'emerald'
            ? 'bg-emerald-400'
            : status.tone === 'yellow'
              ? 'bg-amber-400'
              : 'bg-red-400'
        }`}
      />
      {status.label}
    </span>
  )
}

function ProgressBar({ value, tone }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  const toneColor =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'gold'
        ? 'bg-gold'
        : 'bg-zinc-500'
  return (
    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={`h-full ${toneColor} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function MilestoneTable({
  names,
  onNameChange,
  monthlyProfit,
  bankBalance,
}) {
  const rows = TIERS.map((price) => {
    const status = evaluateStatus({ price, monthlyProfit, bankBalance })
    return {
      price,
      profitGoal: price * 3,
      balanceGoal: price * 10,
      profitProgress: price > 0 ? monthlyProfit / (price * 3) : 0,
      balanceProgress: price > 0 ? bankBalance / (price * 10) : 0,
      status,
    }
  })

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-display text-xl text-zinc-300">Milestones</h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          3× Monthly Profit · 10× Bank Balance
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block card card-glow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="label font-medium px-5 py-4 bg-zinc-900/80 border-b border-zinc-800">
                Milestone
              </th>
              <th className="label font-medium px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 text-right">
                Target Price
              </th>
              <th className="label font-medium px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 text-right">
                Monthly Profit Goal (3×)
              </th>
              <th className="label font-medium px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 text-right">
                Bank Balance Goal (10×)
              </th>
              <th className="label font-medium px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.price}
                className={`border-b border-zinc-800/70 last:border-b-0 transition-colors ${
                  row.status.key === 'approved' ? 'bg-emerald-500/[0.04]' : ''
                }`}
              >
                <td className="px-5 py-4 align-middle">
                  <input
                    type="text"
                    placeholder="Name this milestone…"
                    className="field"
                    value={names[i] ?? ''}
                    onChange={(e) => onNameChange(i, e.target.value)}
                  />
                </td>
                <td className="px-5 py-4 align-middle text-right">
                  <div className="font-display text-xl text-zinc-100 tabular-nums">
                    {formatUSD(row.price)}
                  </div>
                </td>
                <td className="px-5 py-4 align-middle text-right">
                  <div className="text-zinc-200 tabular-nums">
                    {formatUSD(row.profitGoal)}
                  </div>
                  <div className="mt-2 w-40 ml-auto">
                    <ProgressBar value={row.profitProgress} tone="emerald" />
                  </div>
                </td>
                <td className="px-5 py-4 align-middle text-right">
                  <div className="text-zinc-200 tabular-nums">
                    {formatUSD(row.balanceGoal)}
                  </div>
                  <div className="mt-2 w-40 ml-auto">
                    <ProgressBar value={row.balanceProgress} tone="gold" />
                  </div>
                </td>
                <td className="px-5 py-4 align-middle text-center">
                  <StatusPill status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden grid grid-cols-1 gap-3">
        {rows.map((row, i) => (
          <div
            key={row.price}
            className={`card card-glow p-4 ${
              row.status.key === 'approved' ? 'ring-1 ring-emerald-500/30' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="font-display text-2xl text-zinc-50 tabular-nums">
                {formatUSD(row.price)}
              </div>
              <StatusPill status={row.status} />
            </div>
            <input
              type="text"
              placeholder="Name this milestone…"
              className="field mb-4"
              value={names[i] ?? ''}
              onChange={(e) => onNameChange(i, e.target.value)}
            />
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Monthly Profit Goal (3×)</span>
                  <span className="text-zinc-200 tabular-nums">
                    {formatUSD(row.profitGoal)}
                  </span>
                </div>
                <ProgressBar value={row.profitProgress} tone="emerald" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Bank Balance Goal (10×)</span>
                  <span className="text-zinc-200 tabular-nums">
                    {formatUSD(row.balanceGoal)}
                  </span>
                </div>
                <ProgressBar value={row.balanceProgress} tone="gold" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
