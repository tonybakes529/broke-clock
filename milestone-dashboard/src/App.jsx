import { useMemo, useRef, useState } from 'react'
import DailyEntry from './components/DailyEntry.jsx'
import MetricsPanel from './components/MetricsPanel.jsx'
import MilestoneTable from './components/MilestoneTable.jsx'
import GoalsTab from './components/GoalsTab.jsx'
import BudgetTab from './components/BudgetTab.jsx'
import CampaignBoard from './components/CampaignBoard/CampaignBoard.jsx'
import ActiveCampaignsPanel from './components/ActiveCampaignsPanel.jsx'
import OutreachTab from './components/OutreachTab.jsx'
import { useDashboardStore } from './hooks/useDashboardStore.js'
import { exportBackup, importBackupFromFile } from './utils/backup.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'budget', label: 'Budget' },
  { id: 'goals', label: 'Goals' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'outreach', label: 'Outreach' },
]

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
    budgetMetrics,
  } = useDashboardStore(user)

  const manualBankBalance = useMemo(() => {
    const n = parseFloat(bankBalanceRaw)
    return Number.isFinite(n) ? n : 0
  }, [bankBalanceRaw])

  const { avgDailyProfit, entryProjectedMonthlyProfit } = useMemo(() => {
    if (!entries.length) {
      return { avgDailyProfit: 0, entryProjectedMonthlyProfit: 0 }
    }
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))
    const window = sorted.slice(0, 30)
    const totalProfit = window.reduce(
      (sum, e) => sum + (Number(e.revenue) - Number(e.expense)),
      0,
    )
    const avg = totalProfit / window.length
    return { avgDailyProfit: avg, entryProjectedMonthlyProfit: avg * 30 }
  }, [entries])

  // Budget tab is the source of truth when present; daily-entries + manual
  // bank balance are the legacy fallback.
  const budgetActive = Boolean(budgetMetrics)
  const projectedMonthlyProfit = budgetActive
    ? budgetMetrics.combined.monthlyLeftover
    : entryProjectedMonthlyProfit
  const bankBalance = budgetActive
    ? budgetMetrics.combined.totalCash
    : manualBankBalance

  const safeNames = (Array.isArray(names) ? names : []).slice(0, 7)
  while (safeNames.length < 7) safeNames.push('')

  const [activeTab, setActiveTab] = useState('dashboard')
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saved' | 'restoring' | 'restored' | 'error'
  const [saveMsg, setSaveMsg] = useState('')
  const fileInputRef = useRef(null)

  function flashStatus(state, msg = '', ms = 1800) {
    setSaveState(state)
    setSaveMsg(msg)
    window.clearTimeout(flashStatus._t)
    flashStatus._t = window.setTimeout(() => {
      setSaveState('idle')
      setSaveMsg('')
    }, ms)
  }

  function handleSave() {
    try {
      exportBackup()
      flashStatus('saved', 'Backup downloaded')
    } catch (err) {
      flashStatus('error', err?.message || 'Save failed', 3000)
    }
  }

  async function handleRestoreFile(file) {
    if (!file) return
    setSaveState('restoring')
    setSaveMsg('Restoring…')
    try {
      const result = await importBackupFromFile(file)
      flashStatus('restored', `Restored ${result.restored} item${result.restored === 1 ? '' : 's'}`)
    } catch (err) {
      flashStatus('error', err?.message || 'Restore failed', 3500)
    }
  }

  return (
    <div className="min-h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          handleRestoreFile(file)
          e.target.value = '' // allow re-selecting the same file later
        }}
      />
      <header className="border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold via-gold-soft to-gold-deep shadow-gold flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-xl md:text-2xl tracking-tight">
                Milestone Dashboard
              </h1>
              <p className="text-xs text-zinc-500 -mt-0.5">
                Your financial gatekeeper
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs flex-shrink-0">
            {saveState === 'saved' || saveState === 'restored' ? (
              <span className="hidden sm:flex items-center gap-2 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {saveMsg || 'Saved ✓'}
              </span>
            ) : saveState === 'restoring' ? (
              <span className="hidden sm:flex items-center gap-2 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                {saveMsg || 'Restoring…'}
              </span>
            ) : saveState === 'error' ? (
              <span className="hidden sm:flex items-center gap-2 text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {saveMsg || 'Error'}
              </span>
            ) : isCloud ? (
              <span className="hidden sm:flex items-center gap-2 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Synced
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-2 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                Auto-saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-gold text-zinc-950 font-medium text-xs py-1.5 px-3 hover:bg-gold-soft transition-colors shadow-gold"
              title="Download a backup of all your dashboard data"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-50 hover:border-zinc-500 text-xs py-1.5 px-3 transition-colors"
              title="Restore from a backup file"
            >
              Restore
            </button>
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
            <nav
              role="tablist"
              aria-label="Sections"
              className="flex gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80 w-fit"
            >
              {TABS.map((tab) => {
                const active = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors ${
                      active
                        ? 'bg-zinc-800 text-zinc-50 shadow-inner'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </nav>

            {activeTab === 'dashboard' && (
              <>
                <DailyEntry
                  entries={entries}
                  onAdd={addEntry}
                  onDelete={deleteEntry}
                  bankBalance={bankBalanceRaw}
                  onBankBalanceChange={setBankBalance}
                  budgetActive={budgetActive}
                  syncedBankBalance={bankBalance}
                />

                <MetricsPanel
                  avgDailyProfit={avgDailyProfit}
                  projectedMonthlyProfit={projectedMonthlyProfit}
                  availableCapital={bankBalance}
                  entryCount={entries.length}
                />

                <ActiveCampaignsPanel />

                <MilestoneTable
                  names={safeNames}
                  onNameChange={setName}
                  monthlyProfit={projectedMonthlyProfit}
                  bankBalance={bankBalance}
                />
              </>
            )}

            {activeTab === 'budget' && <BudgetTab />}

            {activeTab === 'goals' && (
              <GoalsTab
                names={safeNames}
                monthlyProfit={projectedMonthlyProfit}
                bankBalance={bankBalance}
              />
            )}

            {activeTab === 'campaigns' && <CampaignBoard />}

            {activeTab === 'outreach' && <OutreachTab />}
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
