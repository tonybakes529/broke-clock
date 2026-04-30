// Budget math utilities.
// Pure functions — no React, no localStorage. Safe to import from anywhere.

const WEEKS_PER_MONTH = 52 / 12 // 4.3333...

/**
 * Coerce a string-or-number input into a finite number.
 * Empty / non-numeric → 0 (math is forgiving; UI keeps the raw string).
 */
export function parseAmount(input) {
  if (input == null || input === '') return 0
  const n = typeof input === 'number' ? input : parseFloat(input)
  return Number.isFinite(n) ? n : 0
}

/**
 * Convert any (amount, frequency) pair into a monthly equivalent.
 * Supported: 'monthly' (passthrough), 'weekly' (× 52/12).
 */
export function monthlyize(amount, frequency) {
  const n = parseAmount(amount)
  if (frequency === 'weekly') return n * WEEKS_PER_MONTH
  return n // default: monthly
}

const EMPTY_SCOPE = { income: [], expenses: [], accounts: [], cards: [] }

function safeScope(scope) {
  if (!scope || typeof scope !== 'object') return EMPTY_SCOPE
  return {
    income: Array.isArray(scope.income) ? scope.income : [],
    expenses: Array.isArray(scope.expenses) ? scope.expenses : [],
    accounts: Array.isArray(scope.accounts) ? scope.accounts : [],
    cards: Array.isArray(scope.cards) ? scope.cards : [],
  }
}

/**
 * Compute monthly + balance metrics for a single scope (business or personal).
 *
 *   monthlyIncome           Σ income lines, normalized to monthly
 *   monthlyExpenses         Σ expense lines, normalized to monthly
 *   monthlyCardMinimums     Σ card minimum payments (treated as monthly)
 *   monthlyOutflow          monthlyExpenses + monthlyCardMinimums
 *   monthlyLeftover         monthlyIncome - monthlyOutflow
 *   totalCash               Σ account balances
 *   totalCardDebt           Σ card balances
 */
export function scopeMetrics(scope) {
  const s = safeScope(scope)

  const monthlyIncome = s.income.reduce(
    (sum, item) => sum + monthlyize(item.amount, item.frequency),
    0,
  )
  const monthlyExpenses = s.expenses.reduce(
    (sum, item) => sum + monthlyize(item.amount, item.frequency),
    0,
  )
  const monthlyCardMinimums = s.cards.reduce(
    (sum, item) => sum + parseAmount(item.minimum),
    0,
  )
  const totalCash = s.accounts.reduce(
    (sum, item) => sum + parseAmount(item.balance),
    0,
  )
  const totalCardDebt = s.cards.reduce(
    (sum, item) => sum + parseAmount(item.balance),
    0,
  )
  const monthlyOutflow = monthlyExpenses + monthlyCardMinimums
  const monthlyLeftover = monthlyIncome - monthlyOutflow

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyCardMinimums,
    monthlyOutflow,
    monthlyLeftover,
    totalCash,
    totalCardDebt,
  }
}

/**
 * Top-level entry point consumed by the Dashboard store.
 * Input shape:
 *   { business: { income, expenses, accounts, cards }, personal: { ... } }
 *
 * Output shape:
 *   { business: <metrics>, personal: <metrics>, combined: <metrics> }
 *
 * Combined is the elementwise sum of business + personal — the user's full
 * cash-flow + capital picture. The Dashboard reads `combined.monthlyLeftover`
 * (→ projected monthly profit) and `combined.totalCash` (→ available capital).
 */
export function deriveCombinedMetrics(state) {
  const business = scopeMetrics(state?.business)
  const personal = scopeMetrics(state?.personal)
  const combined = {
    monthlyIncome: business.monthlyIncome + personal.monthlyIncome,
    monthlyExpenses: business.monthlyExpenses + personal.monthlyExpenses,
    monthlyCardMinimums:
      business.monthlyCardMinimums + personal.monthlyCardMinimums,
    monthlyOutflow: business.monthlyOutflow + personal.monthlyOutflow,
    monthlyLeftover: business.monthlyLeftover + personal.monthlyLeftover,
    totalCash: business.totalCash + personal.totalCash,
    totalCardDebt: business.totalCardDebt + personal.totalCardDebt,
  }
  return { business, personal, combined }
}

/**
 * Format a number as USD with no fractional digits.
 * Used for summary totals (e.g. "$1,234").
 */
export function fmtCurrency(n) {
  if (!Number.isFinite(n)) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

/**
 * Format a number as USD preserving cents.
 * Used for transaction-level amounts where cents matter (e.g. "-$8.47").
 */
export function fmtCurrencyPrecise(n) {
  if (!Number.isFinite(n)) return '$0.00'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** True when the state has any rows in any scope/category. */
export function hasAnyBudgetData(state) {
  if (!state) return false
  for (const scopeKey of ['business', 'personal']) {
    const scope = safeScope(state[scopeKey])
    if (
      scope.income.length ||
      scope.expenses.length ||
      scope.accounts.length ||
      scope.cards.length
    ) {
      return true
    }
  }
  return false
}
