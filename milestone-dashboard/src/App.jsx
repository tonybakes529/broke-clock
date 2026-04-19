import { useMemo } from 'react'
import DailyEntry from './components/DailyEntry.jsx'
import MetricsPanel from './components/MetricsPanel.jsx'
import MilestoneTable from './components/MilestoneTable.jsx'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const STORAGE_KEYS = {
  entries: 'md.entries.v1',
  bank: 'md.bankBalance.v1',
  names: 'md.milestoneNames.v1',
}

const DEFAULT_NAMES = Array(7).fill('')

export default function App() {
  const [entries, setEntries] = useLocalStorage(STORAGE_KEYS.entries, [])
  const [bankBalanceRaw, setBankBalanceRaw] = useLocalStorage(STORAGE_KEYS.bank, '')
  const [names, setNames] = useLocalStorage(STORAGE_KEYS.names, DEFAULT_NAMES)

  const bankBalance = useMemo(() => {
    const n = parseFloat(bankBalanceRaw)
    return Number.isFinite(n) ? n : 0
  }, [bankBalanceRaw])

  const { avgDailyProfit, projectedMonthlyProfit } = useMemo(() => {
    if (!entries.length) {
      return { avgDailyProfit: 0, projectedMonthlyProfit: 0 }
    }
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
    const window = sorted.slice(0, 30)
    const totalProfit = window.reduce(
      (sum, e) => sum + (Number(e.revenue) - Number(e.expense)),
      0,
    )
    const avg = totalProfit / window.length
    return {
      avgDailyProfit: avg,
      projectedMonthlyProfit: avg * 30,
    }
  }, [entries])

  const addEntry = (entry) => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setEntries((prev) => [...prev, { id, ...entry }])
  }

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const updateName = (index, value) => {
    setNames((prev) => {
      const next = [...prev]
      while (next.length < 7) next.push('')
      next[index] = value
      return next
    })
  }

  const safeNames = (Array.isArray(names) ? names : DEFAULT_NAMES).slice(0, 7)
  while (safeNames.length < 7) safeNames.push('')

  return (
    <div className="min-h-full">
      <header className="border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold via-gold-soft to-gold-deep shadow-gold" />
            <div>
              <h1 className="font-display text-xl md:text-2xl tracking-tight">
                Milestone Dashboard
              </h1>
              <p className="text-xs text-zinc-500 -mt-0.5">
                Your financial gatekeeper
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Local · Private · Saved
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-10">
        <DailyEntry
          entries={entries}
          onAdd={addEntry}
          onDelete={deleteEntry}
          bankBalance={bankBalanceRaw}
          onBankBalanceChange={setBankBalanceRaw}
        />

        <MetricsPanel
          avgDailyProfit={avgDailyProfit}
          projectedMonthlyProfit={projectedMonthlyProfit}
          availableCapital={bankBalance}
          entryCount={entries.length}
        />

        <MilestoneTable
          names={safeNames}
          onNameChange={updateName}
          monthlyProfit={projectedMonthlyProfit}
          bankBalance={bankBalance}
        />

        <footer className="pt-8 pb-4 text-center text-xs text-zinc-600">
          Approval requires <span className="text-emerald-400">3× monthly profit</span> and{' '}
          <span className="text-gold">10× bank balance</span> against the target price.
        </footer>
      </main>
    </div>
  )
}
