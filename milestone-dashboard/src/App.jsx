import { useMemo } from 'react'
import DailyEntry from './components/DailyEntry.jsx'
import MetricsPanel from './components/MetricsPanel.jsx'
import MilestoneTable from './components/MilestoneTable.jsx'
import { useDashboardStore } from './hooks/useDashboardStore.js'

// Auth is intentionally disabled for now — data lives in browser localStorage only.
// To re-enable: restore the useAuth import and the AuthScreen gate (see git history),
// or import { useAuth } from './hooks/useAuth.js' and wrap App accordingly.

export default function App() {
  return <Dashboard user={null} onSignOut={null} />
}

function Dashboard({ user, onSignOut }) {
  const {
    entries,
    bankBalanceRaw,
    names,
    loading,
    error,
    isCloud,
    addEntry,
    deleteEntry,
    setBankBalance,
    setName,
  } = useDashboardStore(user)

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
    return { avgDailyProfit: avg, projectedMonthlyProfit: avg * 30 }
  }, [entries])

  const safeNames = (Array.isArray(names) ? names : []).slice(0, 7)
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
          <div className="flex items-center gap-3 text-xs">
            {isCloud ? (
              <span className="hidden sm:flex items-center gap-2 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Synced
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-2 text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                Local only
              </span>
            )}
            {user && (
              <>
                <span className="hidden md:inline text-zinc-500">{user.email}</span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4">
          <div className="border border-red-500/40 bg-red-500/10 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-10">
        {loading ? (
          <div className="card card-glow p-10 text-center text-zinc-500 text-sm tracking-widest animate-pulse">
            LOADING YOUR DATA…
          </div>
        ) : (
          <>
            <DailyEntry
              entries={entries}
              onAdd={addEntry}
              onDelete={deleteEntry}
              bankBalance={bankBalanceRaw}
              onBankBalanceChange={setBankBalance}
            />

            <MetricsPanel
              avgDailyProfit={avgDailyProfit}
              projectedMonthlyProfit={projectedMonthlyProfit}
              availableCapital={bankBalance}
              entryCount={entries.length}
            />

            <MilestoneTable
              names={safeNames}
              onNameChange={setName}
              monthlyProfit={projectedMonthlyProfit}
              bankBalance={bankBalance}
            />
          </>
        )}

        <footer className="pt-8 pb-4 text-center text-xs text-zinc-600">
          Approval requires <span className="text-emerald-400">3× monthly profit</span> and{' '}
          <span className="text-gold">10× bank balance</span> against the target price.
        </footer>
      </main>
    </div>
  )
}
