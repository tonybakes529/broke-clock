import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Daily outbound-message tally per platform.
// Schema: { "YYYY-MM-DD": { linkedin: 5, instagram: 2, twitter: 0, tiktok: 0 } }
const LS_KEY = 'milestone-outreach-counts-v1'
export const OUTREACH_UPDATE_EVENT = 'outreach:update'

export const PLATFORMS = ['linkedin', 'instagram', 'twitter', 'tiktok']
export const DAILY_GOAL = 25

export function todayKey() {
  // Local-time YYYY-MM-DD (not UTC) — the day rolls over at the user's midnight.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function readLSRaw() {
  try {
    return window.localStorage.getItem(LS_KEY) || ''
  } catch {
    return ''
  }
}

function readLS() {
  const raw = readLSRaw()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLS(data) {
  try {
    const next = JSON.stringify(data)
    if (readLSRaw() === next) return
    window.localStorage.setItem(LS_KEY, next)
    window.dispatchEvent(new Event(OUTREACH_UPDATE_EVENT))
  } catch {
    /* ignore quota errors */
  }
}

export function useOutreachStore() {
  const [data, setData] = useState(readLS)
  const serializedRef = useRef(JSON.stringify(data))

  useEffect(() => {
    const next = JSON.stringify(data)
    if (serializedRef.current === next) return
    serializedRef.current = next
    writeLS(data)
  }, [data])

  useEffect(() => {
    const refresh = () => {
      const raw = readLSRaw()
      if (raw === serializedRef.current) return
      serializedRef.current = raw
      setData(readLS())
    }
    const onStorage = (e) => {
      if (e.key === LS_KEY) refresh()
    }
    window.addEventListener(OUTREACH_UPDATE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(OUTREACH_UPDATE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const today = todayKey()

  const increment = useCallback((platform) => {
    if (!PLATFORMS.includes(platform)) return
    setData((prev) => {
      const day = todayKey()
      const dayData = prev[day] || {}
      return {
        ...prev,
        [day]: { ...dayData, [platform]: (Number(dayData[platform]) || 0) + 1 },
      }
    })
  }, [])

  const decrement = useCallback((platform) => {
    if (!PLATFORMS.includes(platform)) return
    setData((prev) => {
      const day = todayKey()
      const dayData = prev[day] || {}
      const current = Number(dayData[platform]) || 0
      return {
        ...prev,
        [day]: { ...dayData, [platform]: Math.max(0, current - 1) },
      }
    })
  }, [])

  const reset = useCallback((platform) => {
    setData((prev) => {
      const day = todayKey()
      const dayData = prev[day] || {}
      if (platform) {
        return { ...prev, [day]: { ...dayData, [platform]: 0 } }
      }
      // Reset all platforms for today
      const cleared = {}
      PLATFORMS.forEach((p) => { cleared[p] = 0 })
      return { ...prev, [day]: cleared }
    })
  }, [])

  const todaysCounts = useMemo(() => data[today] || {}, [data, today])

  return { data, today, todaysCounts, increment, decrement, reset }
}
