import { monthlyize, parseAmount } from '../utils/budgetMath.js'

function formatUSD(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

/**
 * Per-row monthly equivalent for display in the rightmost column of a flow
 * section (income/expenses). For balance sections (accounts/cards) the
 * display value is the balance itself.
 */
function rowDisplayTotal(category, item) {
  switch (category) {
    case 'income':
    case 'expenses':
      return monthlyize(item.amount, item.frequency)
    case 'accounts':
      return parseAmount(item.balance)
    case 'cards':
      return parseAmount(item.balance)
    default:
      return 0
  }
}

const CATEGORY_CONFIG = {
  income: {
    title: 'Income',
    addLabel: '+ Add income',
    placeholder: 'No income sources yet',
    accent: 'emerald',
    totalLabel: 'Monthly total',
  },
  expenses: {
    title: 'Expenses',
    addLabel: '+ Add expense',
    placeholder: 'No recurring expenses yet',
    accent: 'red',
    totalLabel: 'Monthly total',
  },
  accounts: {
    title: 'Cash Accounts',
    addLabel: '+ Add account',
    placeholder: 'No accounts yet',
    accent: 'gold',
    totalLabel: 'Total cash',
  },
  cards: {
    title: 'Credit Cards',
    addLabel: '+ Add card',
    placeholder: 'No cards yet',
    accent: 'amber',
    totalLabel: 'Total balance',
  },
}

const ACCENT_TEXT = {
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  gold: 'text-gold',
  amber: 'text-amber-300',
  zinc: 'text-zinc-200',
}

function FlowRow({ item, onChange, onRemove, monthlyValue }) {
  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0">
      <td className="py-2 pr-2">
        <input
          type="text"
          placeholder="Name"
          className="field py-2"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </td>
      <td className="py-2 px-2 w-32">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          className="field py-2 text-right tabular-nums"
          value={item.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
        />
      </td>
      <td className="py-2 px-2 w-32">
        <select
          className="field py-2"
          value={item.frequency || 'monthly'}
          onChange={(e) => onChange({ frequency: e.target.value })}
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 px-2 w-28 text-right tabular-nums text-zinc-200">
        {formatUSD(monthlyValue)}
      </td>
      <td className="py-2 pl-2 w-8 text-center">
        <button
          type="button"
          aria-label="Remove row"
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 text-sm"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

function AccountRow({ item, onChange, onRemove }) {
  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0">
      <td className="py-2 pr-2">
        <input
          type="text"
          placeholder="Account name"
          className="field py-2"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </td>
      <td className="py-2 px-2 w-40">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          className="field py-2 text-right tabular-nums"
          value={item.balance}
          onChange={(e) => onChange({ balance: e.target.value })}
        />
      </td>
      <td className="py-2 pl-2 w-8 text-center">
        <button
          type="button"
          aria-label="Remove row"
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 text-sm"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

function CardRow({ item, onChange, onRemove }) {
  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0">
      <td className="py-2 pr-2">
        <input
          type="text"
          placeholder="Card name"
          className="field py-2"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </td>
      <td className="py-2 px-2 w-32">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="Balance"
          className="field py-2 text-right tabular-nums"
          value={item.balance}
          onChange={(e) => onChange({ balance: e.target.value })}
        />
      </td>
      <td className="py-2 px-2 w-32">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="Min/mo"
          className="field py-2 text-right tabular-nums"
          value={item.minimum}
          onChange={(e) => onChange({ minimum: e.target.value })}
        />
      </td>
      <td className="py-2 pl-2 w-8 text-center">
        <button
          type="button"
          aria-label="Remove row"
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 text-sm"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

export default function BudgetSection({
  category, // 'income' | 'expenses' | 'accounts' | 'cards'
  items,
  onAdd,
  onUpdate,
  onRemove,
  total,
}) {
  const config = CATEGORY_CONFIG[category]
  const isFlow = category === 'income' || category === 'expenses'

  return (
    <div className="card card-glow p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base md:text-lg text-zinc-100">
          {config.title}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          {config.addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          {config.placeholder}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="label font-medium pb-2 pr-2">Name</th>
                {isFlow ? (
                  <>
                    <th className="label font-medium pb-2 px-2 text-right">Amount</th>
                    <th className="label font-medium pb-2 px-2">Frequency</th>
                    <th className="label font-medium pb-2 px-2 text-right">Monthly</th>
                  </>
                ) : category === 'accounts' ? (
                  <th className="label font-medium pb-2 px-2 text-right">Balance</th>
                ) : (
                  <>
                    <th className="label font-medium pb-2 px-2 text-right">Balance</th>
                    <th className="label font-medium pb-2 px-2 text-right">Minimum/mo</th>
                  </>
                )}
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const handleChange = (patch) => onUpdate(item.id, patch)
                const handleRemove = () => onRemove(item.id)
                if (isFlow) {
                  return (
                    <FlowRow
                      key={item.id}
                      item={item}
                      onChange={handleChange}
                      onRemove={handleRemove}
                      monthlyValue={rowDisplayTotal(category, item)}
                    />
                  )
                }
                if (category === 'accounts') {
                  return (
                    <AccountRow
                      key={item.id}
                      item={item}
                      onChange={handleChange}
                      onRemove={handleRemove}
                    />
                  )
                }
                return (
                  <CardRow
                    key={item.id}
                    item={item}
                    onChange={handleChange}
                    onRemove={handleRemove}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-zinc-800/70 flex items-center justify-between text-sm">
        <span className="label">{config.totalLabel}</span>
        <span
          className={`font-display text-lg tabular-nums ${ACCENT_TEXT[config.accent]}`}
        >
          {formatUSD(total)}
        </span>
      </div>
    </div>
  )
}
