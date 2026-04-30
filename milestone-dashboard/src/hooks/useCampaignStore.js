import { useCallback, useEffect, useRef, useState } from 'react'
import { LS_KEY } from '../components/CampaignBoard/boardData.js'

// Same-tab broadcast so the Campaign Board and the Dashboard panel can
// see each other's edits without prop drilling.
export const CAMPAIGN_UPDATE_EVENT = 'campaigns:update'

function normalizeCampaigns(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((c) => ({
    active: false,
    archived: false,
    ...c,
  }))
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
  if (!raw) return []
  try {
    return normalizeCampaigns(JSON.parse(raw))
  } catch {
    return []
  }
}

function writeLS(campaigns) {
  try {
    const next = JSON.stringify(campaigns)
    // Skip write + broadcast if nothing actually changed. Prevents a feedback
    // loop when multiple hook instances (e.g. CampaignBoard + ActiveCampaignsPanel)
    // each receive the custom event and call setState with a new array reference.
    if (readLSRaw() === next) return
    window.localStorage.setItem(LS_KEY, next)
    window.dispatchEvent(new Event(CAMPAIGN_UPDATE_EVENT))
  } catch {
    /* ignore quota errors */
  }
}

export function useCampaignStore() {
  const [campaigns, setCampaignsState] = useState(readLS)
  const serializedRef = useRef(JSON.stringify(campaigns))

  useEffect(() => {
    const next = JSON.stringify(campaigns)
    if (serializedRef.current === next) return
    serializedRef.current = next
    writeLS(campaigns)
  }, [campaigns])

  useEffect(() => {
    const refresh = () => {
      const raw = readLSRaw()
      if (raw === serializedRef.current) return
      serializedRef.current = raw
      setCampaignsState(readLS())
    }
    const onStorage = (e) => {
      if (e.key === LS_KEY) refresh()
    }
    window.addEventListener(CAMPAIGN_UPDATE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CAMPAIGN_UPDATE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setCampaigns = useCallback((updater) => {
    setCampaignsState((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const updateCampaign = useCallback((id, patch) => {
    setCampaignsState((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const toggleActive = useCallback((id) => {
    setCampaignsState((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  }, [])

  return { campaigns, setCampaigns, updateCampaign, toggleActive }
}
