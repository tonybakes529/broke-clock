import { useCallback, useEffect, useMemo, useState } from 'react'
import { deriveCombinedMetrics } from '../utils/budgetMath.js'

export const BUDGET_STORAGE_KEY = 'md.budget.v1'
// Same-tab broadcast so other components (e.g. useDashboardStore) can react
// to budget edits without prop drilling.
export const BUDGET_UPDATE_EVENT = 'budget:update'

const SCOPES = ['business', 'personal']
const CATEGORIES = ['income', 'expenses', 'accounts', 'cards']

const DEFAULT_FREQUENCY = 'monthly'

function emptyScope() {
  return { income: [], expenses: [], accounts: [], cards: [] }
}

function defaultState() {
  return { business: emptyScope(), personal: emptyScope() }
}

function normalizeState(raw) {
  const next = defaultState()
  if (!raw || typeof raw !== 'object') return next
  for (const scope of SCOPES) {
    const src = raw[scope]
    if (!src || typeof src !== 'object') continue
    for (const cat of CATEGORIES) {
      if (Array.isArray(src[cat])) next[scope][cat] = src[cat]
    }
  }
  return next
}

function readLS() {
  try {
    const raw = window.localStorage.getItem(BUDGET_STORAGE_KEY)
    if (!raw) return defaultState()
    return normalizeState(JSON.parse(raw))
  } catch {
    return defaultState()
  }
}

function writeLS(state) {
  try {
    window.localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(state))
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new Event(BUDGET_UPDATE_EVENT))
  } catch {
    /* ignore quota errors */
  }
}

function freshId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${Date.now().toString(36)}-${rand}`
}

/**
 * Build a default item for the given category. Strings stay empty so the
 * input fields don't show "0" before the user types.
 */
function blankItem(category) {
  const id = freshId()
  switch (category) {
    case 'income':
    case 'expenses':
      return { id, name: '', amount: '', frequency: DEFAULT_FREQUENCY }
    case 'accounts':
      return { id, name: '', balance: '' }
    case 'cards':
      return { id, name: '', balance: '', minimum: '' }
    default:
      return { id, name: '' }
  }
}

/**
 * Hook that owns the Budget tab's data, persists to localStorage, and exposes
 * derived metrics. Other components can subscribe to BUDGET_UPDATE_EVENT to
 * stay in sync (see useDashboardStore).
 */
export function useBudgetStore() {
  const [state, setState] = useState(readLS)

  // Persist on every change.
  useEffect(() => {
    writeLS(state)
  }, [state])

  // Keep multiple instances of this hook in sync within the same tab.
  useEffect(() => {
    const refresh = () => setState(readLS())
    window.addEventListener(BUDGET_UPDATE_EVENT, refresh)
    window.addEventListener('storage', (e) => {
      if (e.key === BUDGET_STORAGE_KEY) refresh()
    })
    return () => {
      window.removeEventListener(BUDGET_UPDATE_EVENT, refresh)
      // Anonymous storage listener can't be cleanly removed; safe leak — only
      // one BudgetTab is ever mounted in this app, so it doesn't compound.
    }
  }, [])

  const addItem = useCallback((scope, category) => {
    setState((prev) => {
      const next = { ...prev, [scope]: { ...prev[scope] } }
      next[scope][category] = [...prev[scope][category], blankItem(category)]
      return next
    })
  }, [])

  const updateItem = useCallback((scope, category, id, patch) => {
    setState((prev) => {
      const list = prev[scope][category]
      const nextList = list.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      )
      return {
        ...prev,
        [scope]: { ...prev[scope], [category]: nextList },
      }
    })
  }, [])

  const removeItem = useCallback((scope, category, id) => {
    setState((prev) => {
      const nextList = prev[scope][category].filter((item) => item.id !== id)
      return {
        ...prev,
        [scope]: { ...prev[scope], [category]: nextList },
      }
    })
  }, [])

  const clearScope = useCallback((scope) => {
    setState((prev) => ({ ...prev, [scope]: emptyScope() }))
  }, [])

  const metrics = useMemo(() => deriveCombinedMetrics(state), [state])

  return {
    state,
    metrics,
    addItem,
    updateItem,
    removeItem,
    clearScope,
  }
}
