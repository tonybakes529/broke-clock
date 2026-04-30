import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { deriveCombinedMetrics, hasAnyBudgetData } from '../utils/budgetMath.js'
import {
  BUDGET_STORAGE_KEY,
  BUDGET_UPDATE_EVENT,
} from './useBudgetStore.js'

const LS_KEYS = {
  entries: 'md.entries.v1',
  bank: 'md.bankBalance.v1',
  names: 'md.milestoneNames.v1',
}

const DEFAULT_NAMES = Array(7).fill('')

function readBudgetMetrics() {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    if (!hasAnyBudgetData(state)) return null
    return deriveCombinedMetrics(state)
  } catch {
    return null
  }
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/**
 * Single source of truth for dashboard data.
 * - When a user is signed in: reads/writes Supabase, mirrors to localStorage as a cache.
 * - When no user (or Supabase not configured): falls back to localStorage only.
 */
export function useDashboardStore(user) {
  const isCloud = Boolean(supabaseConfigured && user)
  const userId = user?.id ?? null

  const [entries, setEntries] = useState(() => readLS(LS_KEYS.entries, []))
  const [bankBalanceRaw, setBankBalanceRaw] = useState(() => readLS(LS_KEYS.bank, ''))
  const [names, setNames] = useState(() => readLS(LS_KEYS.names, DEFAULT_NAMES))
  const [budgetMetrics, setBudgetMetrics] = useState(() => readBudgetMetrics())
  const [loading, setLoading] = useState(isCloud)
  const [error, setError] = useState(null)

  // Stay in sync with the Budget tab. Same-tab edits dispatch a custom event;
  // cross-tab edits fire the standard `storage` event.
  useEffect(() => {
    const refresh = () => setBudgetMetrics(readBudgetMetrics())
    const onStorage = (e) => {
      if (e.key === BUDGET_STORAGE_KEY) refresh()
    }
    window.addEventListener(BUDGET_UPDATE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(BUDGET_UPDATE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Cache to localStorage on every change (works in both modes)
  useEffect(() => writeLS(LS_KEYS.entries, entries), [entries])
  useEffect(() => writeLS(LS_KEYS.bank, bankBalanceRaw), [bankBalanceRaw])
  useEffect(() => writeLS(LS_KEYS.names, names), [names])

  // Initial load from cloud when signed in
  const loadedForUser = useRef(null)
  useEffect(() => {
    if (!isCloud || !userId) {
      setLoading(false)
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [entriesRes, bankRes, milestonesRes] = await Promise.all([
          supabase
            .from('daily_entries')
            .select('id, entry_date, revenue, expense')
            .order('entry_date', { ascending: false }),
          supabase.from('bank_balance').select('amount').maybeSingle(),
          supabase.from('milestones').select('idx, name').order('idx'),
        ])
        if (cancelled) return
        if (entriesRes.error) throw entriesRes.error
        if (bankRes.error) throw bankRes.error
        if (milestonesRes.error) throw milestonesRes.error

        setEntries(
          (entriesRes.data ?? []).map((r) => ({
            id: r.id,
            date: r.entry_date,
            revenue: Number(r.revenue),
            expense: Number(r.expense),
          })),
        )
        setBankBalanceRaw(
          bankRes.data?.amount != null ? String(bankRes.data.amount) : '',
        )
        const nextNames = [...DEFAULT_NAMES]
        for (const row of milestonesRes.data ?? []) {
          if (row.idx >= 0 && row.idx < 7) nextNames[row.idx] = row.name ?? ''
        }
        setNames(nextNames)
      } catch (e) {
        if (!cancelled) setError(e.message ?? String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isCloud, userId])

  // ------- Mutations -------

  const addEntry = useCallback(
    async ({ date, revenue, expense }) => {
      if (isCloud) {
        const { data, error } = await supabase
          .from('daily_entries')
          .insert({ user_id: userId, entry_date: date, revenue, expense })
          .select('id, entry_date, revenue, expense')
          .single()
        if (error) {
          setError(error.message)
          return
        }
        setEntries((prev) => [
          {
            id: data.id,
            date: data.entry_date,
            revenue: Number(data.revenue),
            expense: Number(data.expense),
          },
          ...prev,
        ])
      } else {
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        setEntries((prev) => [{ id, date, revenue, expense }, ...prev])
      }
    },
    [isCloud, userId],
  )

  const deleteEntry = useCallback(
    async (id) => {
      if (isCloud) {
        const { error } = await supabase.from('daily_entries').delete().eq('id', id)
        if (error) {
          setError(error.message)
          return
        }
      }
      setEntries((prev) => prev.filter((e) => e.id !== id))
    },
    [isCloud],
  )

  // Bank balance — debounced upsert when cloud
  const bankDebounce = useRef(null)
  const setBankBalance = useCallback(
    (next) => {
      setBankBalanceRaw(next)
      if (!isCloud) return
      const num = parseFloat(next)
      if (!Number.isFinite(num)) return
      clearTimeout(bankDebounce.current)
      bankDebounce.current = setTimeout(async () => {
        const { error } = await supabase
          .from('bank_balance')
          .upsert({ user_id: userId, amount: num }, { onConflict: 'user_id' })
        if (error) setError(error.message)
      }, 500)
    },
    [isCloud, userId],
  )

  // Milestone names — debounced upsert per index when cloud
  const nameTimers = useRef({})
  const setName = useCallback(
    (index, value) => {
      setNames((prev) => {
        const next = [...prev]
        while (next.length < 7) next.push('')
        next[index] = value
        return next
      })
      if (!isCloud) return
      clearTimeout(nameTimers.current[index])
      nameTimers.current[index] = setTimeout(async () => {
        const { error } = await supabase
          .from('milestones')
          .upsert(
            { user_id: userId, idx: index, name: value },
            { onConflict: 'user_id,idx' },
          )
        if (error) setError(error.message)
      }, 500)
    },
    [isCloud, userId],
  )

  return {
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
  }
}
