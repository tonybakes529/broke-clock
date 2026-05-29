// Centralised list of every localStorage key the dashboard owns.
// Used by the Save (export) and Restore (import) flows in the header.
export const BACKUP_KEYS = [
  'md.entries.v1', // daily entries
  'md.bankBalance.v1', // manual bank balance fallback
  'md.milestoneNames.v1', // milestone tier names
  'md.budget.v1', // Budget tab
  'md.review.v1', // Monthly Review
  'directlend-campaign-board-v6', // Campaigns
  'milestone-outreach-counts-v1', // Outreach tally
]

// Custom events broadcast by the various stores. Dispatching them after
// an import nudges every mounted hook to re-read localStorage so the UI
// updates without a page reload.
const REFRESH_EVENTS = ['campaigns:update', 'outreach:update', 'budget:update', 'review:update']

function todayStamp() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function collectBackup() {
  const data = {}
  for (const key of BACKUP_KEYS) {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) data[key] = raw
    } catch {
      /* ignore */
    }
  }
  return {
    app: 'milestone-dashboard',
    version: 1,
    savedAt: new Date().toISOString(),
    data,
  }
}

export function exportBackup() {
  const payload = collectBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `milestone-dashboard-backup-${todayStamp()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return payload
}

export function importBackupFromText(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  // Accept either { app, data: {...} } or a bare object of LS keys.
  const data = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file is missing data.')
  }
  let restored = 0
  for (const [key, value] of Object.entries(data)) {
    if (!BACKUP_KEYS.includes(key)) continue
    if (typeof value !== 'string') continue
    try {
      window.localStorage.setItem(key, value)
      restored += 1
    } catch {
      /* ignore quota errors */
    }
  }
  // Wake every store up.
  for (const ev of REFRESH_EVENTS) {
    try {
      window.dispatchEvent(new Event(ev))
    } catch {
      /* ignore */
    }
  }
  return { restored, savedAt: parsed.savedAt || null }
}

export function importBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.onload = () => {
      try {
        resolve(importBackupFromText(String(reader.result || '')))
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}
