import { useState } from 'react'

function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

export default function DailyEntry({
  entries,
  onAdd,
  onDelete,
  bankBalance,
  onBankBalanceChange,
}) {
  const [date, setDate] = useState(todayISO())
  const [revenue, setRevenue] = useState('')
  const [expense, setExpense] = useState('')
  const [error, setError] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    setError('')
    const rev = parseFloat(revenue)
    const exp = parseFloat(expense)
    if (!date) return setError('Pick a date.')
    if (Number.isNaN(rev) || Number.isNaN(exp)) return setError('Enter valid numbers.')
    if (rev < 0 || exp < 0) return setError('Values must be non-negative.')
    onAdd({ date, revenue: rev, expense: exp })
    setRevenue('')
    setExpense('')
  }

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5)

  return (
    <section className="card card-glow p-5 md:p-7">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-zinc-50">Daily Entry</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Log today's numbers. Consistency is the discipline behind the approval.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="field mt-1.5"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Daily Revenue ($)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="field mt-1.5"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Daily Operating Expense ($)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="field mt-1.5"
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            + Add Entry
          </button>
        </div>
        {error && (
          <div className="md:col-span-4 text-sm text-red-400">{error}</div>
        )}
      </form>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <label className="label">Current Total Bank Balance ($)</label>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-display text-2xl text-gold">$</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="field font-display text-2xl md:text-3xl py-3"
            value={bankBalance}
            onChange={(e) => onBankBalanceChange(e.target.value)}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Updated in real-time. Used to evaluate the 10x Rule against every milestone.
        </p>
      </div>

      {sorted.length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="label">Recent Entries</span>
            <span className="text-xs text-zinc-500">{entries.length} total</span>
          </div>
          <ul className="divide-y divide-zinc-800/70 text-sm">
            {sorted.map((entry) => {
              const profit = entry.revenue - entry.expense
              return (
                <li key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-zinc-400 tabular-nums w-24 shrink-0">{entry.date}</span>
                  <div className="flex-1 grid grid-cols-3 gap-3 text-right tabular-nums">
                    <span className="text-zinc-300">
                      ${entry.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-zinc-500">
                      -${entry.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => onDelete(entry.id)}
                    className="text-zinc-600 hover:text-red-400 text-xs px-2"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
