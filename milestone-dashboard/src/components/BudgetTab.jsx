import { useState } from 'react'
import { useBudgetStore } from '../hooks/useBudgetStore.js'
import BudgetSection from './BudgetSection.jsx'
import MonthlyReview from './MonthlyReview.jsx'

const SCOPES = [
  { id: 'business', label: 'Business' },
  { id: 'personal', label: 'Personal' },
  { id: 'review', label: 'Review' },
]

const CATEGORIES = ['income', 'expenses', 'accounts', 'cards']

function formatUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function MetricCard({ label, value, sub, accent = 'zinc' }) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'red'
        ? 'text-red-400'
        : accent === 'gold'
          ? 'text-gold'
          : accent === 'amber'
            ? 'text-amber-300'
            : 'text-zinc-100'
  return (
    <div className="card card-glow p-4 md:p-5 flex flex-col justify-between min-h-[110px]">
      <span className="label">{label}</span>
      <div>
        <div
          className={`font-display text-2xl md:text-3xl tabular-nums tracking-tight ${accentClass}`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function BudgetTab() {
  const { state, metrics, addItem, updateItem, removeItem } = useBudgetStore()
  const [activeScope, setActiveScope] = useState('business')

  const isReview = activeScope === 'review'
  const scopeData = isReview ? null : state[activeScope]
  const scopeMetricsForActive = isReview ? null : metrics[activeScope]
  const combined = metrics.combined

  const leftoverTone =
    combined.monthlyLeftover > 0
      ? 'emerald'
      : combined.monthlyLeftover < 0
        ? 'red'
        : 'zinc'

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header + scope toggle */}
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2 className="font-display text-xl text-zinc-300">Budget</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Combined source of truth
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Budget scope"
          className="flex gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80 w-fit"
        >
          {SCOPES.map((scope) => {
            const active = scope.id === activeScope
            return (
              <button
                key={scope.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveScope(scope.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors ${
                  active
                    ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {scope.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Combined summary */}
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h3 className="font-display text-lg text-zinc-300">Combined totals</h3>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Business + Personal
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <MetricCard
            label="Monthly Income"
            value={formatUSD(combined.monthlyIncome)}
            accent="emerald"
          />
          <MetricCard
            label="Monthly Outflow"
            value={formatUSD(combined.monthlyOutflow)}
            sub={`${formatUSD(combined.monthlyExpenses)} exp + ${formatUSD(combined.monthlyCardMinimums)} card mins`}
            accent="red"
          />
          <MetricCard
            label="Monthly Leftover"
            value={formatUSD(combined.monthlyLeftover)}
            sub="Drives projected profit + ETAs"
            accent={leftoverTone}
          />
          <MetricCard
            label="Total Cash"
            value={formatUSD(combined.totalCash)}
            sub="Drives bank balance"
            accent="gold"
          />
          <MetricCard
            label="Total Card Debt"
            value={formatUSD(combined.totalCardDebt)}
            accent="amber"
          />
          <MetricCard
            label="Net Position"
            value={formatUSD(combined.totalCash - combined.totalCardDebt)}
            sub="Cash − card debt"
            accent={
              combined.totalCash - combined.totalCardDebt >= 0 ? 'emerald' : 'red'
            }
          />
        </div>
      </section>

      {/* Active scope sections */}
      {isReview ? (
        <MonthlyReview />
      ) : (
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h3 className="font-display text-lg text-zinc-300">
              {SCOPES.find((s) => s.id === activeScope)?.label} details
            </h3>
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 tabular-nums">
              Leftover{' '}
              <span
                className={
                  scopeMetricsForActive.monthlyLeftover >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }
              >
                {formatUSD(scopeMetricsForActive.monthlyLeftover)}
              </span>{' '}
              / mo
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {CATEGORIES.map((category) => {
              const items = scopeData[category]
              const total =
                category === 'income'
                  ? scopeMetricsForActive.monthlyIncome
                  : category === 'expenses'
                    ? scopeMetricsForActive.monthlyExpenses
                    : category === 'accounts'
                      ? scopeMetricsForActive.totalCash
                      : scopeMetricsForActive.totalCardDebt
              return (
                <BudgetSection
                  key={category}
                  category={category}
                  items={items}
                  total={total}
                  onAdd={() => addItem(activeScope, category)}
                  onUpdate={(id, patch) =>
                    updateItem(activeScope, category, id, patch)
                  }
                  onRemove={(id) => removeItem(activeScope, category, id)}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
