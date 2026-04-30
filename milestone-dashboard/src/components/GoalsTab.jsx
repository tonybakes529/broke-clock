import { useMemo } from 'react'

const TIERS = [500, 2500, 5000, 12000, 30000, 100000, 500000]
const PROJECTION_MONTHS = 24

function formatUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function formatCompactUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return `$${Math.round(n)}`
}

function formatMonths(m) {
  if (!Number.isFinite(m) || m <= 0) return 'Now'
  if (m < 12) return `${Math.ceil(m)} mo`
  const years = Math.floor(m / 12)
  const months = Math.ceil(m % 12)
  if (months === 0) return `${years} yr`
  return `${years} yr ${months} mo`
}

function tierLabel(idx, name) {
  if (name && name.trim()) return name.trim()
  return `Tier ${idx + 1}`
}

function evaluateGoal({ price, monthlyProfit, bankBalance }) {
  const balanceTarget = price * 10
  const profitTarget = price * 3
  const balanceMet = bankBalance >= balanceTarget
  const profitMet = monthlyProfit >= profitTarget

  let monthsToBalance = null
  if (balanceMet) {
    monthsToBalance = 0
  } else if (monthlyProfit > 0) {
    monthsToBalance = (balanceTarget - bankBalance) / monthlyProfit
  } else {
    monthsToBalance = Infinity
  }

  let status, tone
  if (balanceMet && profitMet) {
    status = 'Approved now'
    tone = 'emerald'
  } else if (profitMet && !balanceMet) {
    status = `Save for ${formatMonths(monthsToBalance)}`
    tone = 'gold'
  } else if (balanceMet && !profitMet) {
    const gap = profitTarget - monthlyProfit
    status = `Need +${formatCompactUSD(gap)}/mo income`
    tone = 'amber'
  } else if (monthlyProfit <= 0) {
    status = 'Negative trajectory'
    tone = 'red'
  } else {
    status = `${formatMonths(monthsToBalance)} + income gap`
    tone = 'amber'
  }

  return {
    balanceTarget,
    profitTarget,
    balanceMet,
    profitMet,
    monthsToBalance,
    status,
    tone,
  }
}

function StatusBadge({ tone, children }) {
  const toneMap = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    gold: 'bg-gold/10 text-gold border-gold/40',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-500/40',
    red: 'bg-red-500/10 text-red-300 border-red-500/40',
    zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide whitespace-nowrap ${toneMap[tone] ?? toneMap.zinc}`}
    >
      {children}
    </span>
  )
}

function ProjectionChart({ bankBalance, monthlyProfit, names }) {
  const months = PROJECTION_MONTHS
  // SVG coordinate space — scales fluidly via viewBox
  const W = 880
  const H = 320
  const pad = { top: 24, right: 96, bottom: 40, left: 72 }

  const slope = monthlyProfit
  const points = Array.from({ length: months + 1 }, (_, i) => ({
    month: i,
    balance: Math.max(0, bankBalance + i * slope),
  }))
  const trajectoryEnd = points[points.length - 1].balance

  // Determine which milestone tiers to plot — keep the chart readable.
  // Show tiers within reach: bounded by the trajectory + the next unreached tier.
  const nextUnreached =
    TIERS.find((t) => 10 * t > bankBalance) ?? TIERS[TIERS.length - 1]
  const yMax = Math.max(
    trajectoryEnd * 1.15,
    10 * nextUnreached * 1.15,
    bankBalance * 1.15,
    100,
  )
  const yMin = 0
  const visibleTiers = TIERS.map((t, idx) => ({ price: t, idx })).filter(
    ({ price }) => 10 * price <= yMax,
  )

  const xScale = (m) =>
    pad.left + (m / months) * (W - pad.left - pad.right)
  const yScale = (v) =>
    pad.top + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.top - pad.bottom)

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.balance)}`)
    .join(' ')
  const areaPath = `${linePath} L ${xScale(months)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`

  // Y-axis tick values (4 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax * i) / 4)
  // X-axis ticks every 3 months
  const xTicks = Array.from({ length: months / 3 + 1 }, (_, i) => i * 3)

  const isFlat = slope <= 0

  return (
    <div className="card card-glow p-4 md:p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-zinc-200">
          Bank Balance Projection
        </h3>
        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {months} months at {formatCompactUSD(slope)}/mo
        </span>
      </div>

      {isFlat && (
        <div className="mb-3 text-xs text-amber-300/90 bg-amber-400/5 border border-amber-500/30 rounded-lg px-3 py-2">
          Trajectory is flat or negative. Add profitable entries to project growth.
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Projected bank balance over the next 24 months"
      >
        <defs>
          <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y gridlines + labels */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line
              x1={pad.left}
              y1={yScale(tick)}
              x2={W - pad.right}
              y2={yScale(tick)}
              stroke="#27272a"
              strokeDasharray={i === 0 ? '0' : '2 4'}
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#71717a"
              fontFamily="Inter, sans-serif"
            >
              {formatCompactUSD(tick)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xTicks.map((m) => (
          <text
            key={`x-${m}`}
            x={xScale(m)}
            y={H - pad.bottom + 18}
            textAnchor="middle"
            fontSize="11"
            fill="#71717a"
            fontFamily="Inter, sans-serif"
          >
            {m === 0 ? 'Now' : `${m}mo`}
          </text>
        ))}

        {/* Milestone threshold lines */}
        {visibleTiers.map(({ price, idx }) => {
          const yt = yScale(10 * price)
          const label = tierLabel(idx, names?.[idx])
          const reached = bankBalance >= 10 * price
          const stroke = reached ? '#10b981' : '#3f3f46'
          return (
            <g key={`tier-${price}`} opacity={reached ? 0.55 : 0.85}>
              <line
                x1={pad.left}
                y1={yt}
                x2={W - pad.right}
                y2={yt}
                stroke={stroke}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={W - pad.right + 6}
                y={yt + 3}
                fontSize="10"
                fill={reached ? '#10b981' : '#a1a1aa'}
                fontFamily="Inter, sans-serif"
              >
                <tspan fontWeight="600">{label}</tspan>
                <tspan fill="#71717a"> · {formatCompactUSD(10 * price)}</tspan>
              </text>
            </g>
          )
        })}

        {/* Area + line */}
        <path d={areaPath} fill="url(#balance-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Today marker */}
        <circle
          cx={xScale(0)}
          cy={yScale(bankBalance)}
          r="4"
          fill="#D4AF37"
          stroke="#0a0a0a"
          strokeWidth="2"
        />
        {/* End marker */}
        <circle
          cx={xScale(months)}
          cy={yScale(trajectoryEnd)}
          r="4"
          fill="#D4AF37"
          stroke="#0a0a0a"
          strokeWidth="2"
        />
        <text
          x={xScale(months) - 4}
          y={yScale(trajectoryEnd) - 10}
          textAnchor="end"
          fontSize="11"
          fill="#D4AF37"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {formatCompactUSD(trajectoryEnd)}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-gold" /> Projected balance
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-emerald-500" /> Reached 10× threshold
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-zinc-600" /> Pending 10× threshold
        </span>
      </div>
    </div>
  )
}

function GoalRow({ idx, price, name, monthlyProfit, bankBalance }) {
  const evalResult = evaluateGoal({ price, monthlyProfit, bankBalance })
  const balanceProgress = Math.min(1, bankBalance / evalResult.balanceTarget)
  const profitProgress =
    evalResult.profitTarget > 0
      ? Math.min(1, monthlyProfit / evalResult.profitTarget)
      : 0

  return (
    <div className="card card-glow p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-base md:text-lg text-zinc-100 truncate">
              {tierLabel(idx, name)}
            </h4>
            <span className="text-xs text-zinc-500 tabular-nums">
              {formatUSD(price)}
            </span>
          </div>
        </div>
        <StatusBadge tone={evalResult.tone}>{evalResult.status}</StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-zinc-500">Balance · 10×</span>
            <span className="text-zinc-300 tabular-nums">
              {formatCompactUSD(bankBalance)} / {formatCompactUSD(evalResult.balanceTarget)}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${evalResult.balanceMet ? 'bg-emerald-500' : 'bg-gold'}`}
              style={{ width: `${balanceProgress * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-zinc-500">Income · 3×/mo</span>
            <span className="text-zinc-300 tabular-nums">
              {formatCompactUSD(monthlyProfit)} / {formatCompactUSD(evalResult.profitTarget)}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${evalResult.profitMet ? 'bg-emerald-500' : 'bg-zinc-500'}`}
              style={{ width: `${profitProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GoalsTab({ names, monthlyProfit, bankBalance }) {
  const safeNames = (Array.isArray(names) ? names : []).slice(0, 7)
  while (safeNames.length < 7) safeNames.push('')

  const summary = useMemo(() => {
    const reached = TIERS.filter(
      (t) => bankBalance >= 10 * t && monthlyProfit >= 3 * t,
    ).length
    const nextUnreachedIdx = TIERS.findIndex(
      (t) => !(bankBalance >= 10 * t && monthlyProfit >= 3 * t),
    )
    const next = nextUnreachedIdx === -1 ? null : {
      idx: nextUnreachedIdx,
      price: TIERS[nextUnreachedIdx],
      name: safeNames[nextUnreachedIdx],
      ...evaluateGoal({
        price: TIERS[nextUnreachedIdx],
        monthlyProfit,
        bankBalance,
      }),
    }
    return { reached, next }
  }, [bankBalance, monthlyProfit, safeNames])

  return (
    <div className="space-y-6 md:space-y-8">
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2 className="font-display text-xl text-zinc-300">Goals</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {summary.reached} / {TIERS.length} approved
          </span>
        </div>

        {summary.next && (
          <div className="card card-glow p-4 md:p-5 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">
                  Next milestone
                </div>
                <div className="font-display text-lg md:text-xl text-zinc-100">
                  {tierLabel(summary.next.idx, summary.next.name)}{' '}
                  <span className="text-zinc-500 text-sm font-normal">
                    · {formatUSD(summary.next.price)}
                  </span>
                </div>
              </div>
              <StatusBadge tone={summary.next.tone}>{summary.next.status}</StatusBadge>
            </div>
          </div>
        )}
      </section>

      <ProjectionChart
        bankBalance={bankBalance}
        monthlyProfit={monthlyProfit}
        names={safeNames}
      />

      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h3 className="font-display text-lg text-zinc-300">All goals</h3>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            ETA at current pace
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {TIERS.map((price, i) => (
            <GoalRow
              key={price}
              idx={i}
              price={price}
              name={safeNames[i]}
              monthlyProfit={monthlyProfit}
              bankBalance={bankBalance}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
