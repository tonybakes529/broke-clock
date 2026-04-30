import { useMemo } from 'react'
import { useOutreachStore, DAILY_GOAL } from '../hooks/useOutreachStore.js'

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', accent: 'sky' },
  { id: 'instagram', label: 'Instagram', accent: 'fuchsia' },
  { id: 'twitter', label: 'Twitter', accent: 'zinc' },
  { id: 'tiktok', label: 'TikTok', accent: 'rose' },
]

// Tailwind needs full class strings to compile, so we map per accent.
const ACCENT = {
  sky: {
    text: 'text-sky-400',
    bar: 'bg-sky-500',
    btn: 'bg-sky-500 hover:bg-sky-400 text-zinc-950',
  },
  fuchsia: {
    text: 'text-fuchsia-400',
    bar: 'bg-fuchsia-500',
    btn: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950',
  },
  zinc: {
    text: 'text-zinc-200',
    bar: 'bg-zinc-300',
    btn: 'bg-zinc-200 hover:bg-zinc-100 text-zinc-950',
  },
  rose: {
    text: 'text-rose-400',
    bar: 'bg-rose-500',
    btn: 'bg-rose-500 hover:bg-rose-400 text-zinc-950',
  },
}

function PlatformTile({ platform, count, onIncrement, onDecrement }) {
  const a = ACCENT[platform.accent]
  const pct = Math.min(100, (count / DAILY_GOAL) * 100)
  const reached = count >= DAILY_GOAL
  return (
    <div className="card card-glow p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="label">{platform.label}</span>
        {reached ? (
          <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-400 font-medium">
            Goal Hit ✓
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
            Goal {DAILY_GOAL}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className={`font-display text-5xl tracking-tight tabular-nums ${a.text}`}>
          {count}
        </span>
        <span className="text-zinc-500 mb-1.5 text-sm">/ {DAILY_GOAL}</span>
      </div>

      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`h-full ${a.bar} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onIncrement(platform.id)}
          className={`flex-1 py-3 rounded-lg font-medium text-sm tracking-wide transition-colors ${a.btn}`}
        >
          + Sent
        </button>
        <button
          type="button"
          onClick={() => onDecrement(platform.id)}
          disabled={count === 0}
          aria-label={`Undo last ${platform.label} message`}
          className="px-4 py-3 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
      </div>
    </div>
  )
}

function dayLabel(key, today) {
  if (key === today) return 'Today'
  const t = new Date(today)
  t.setDate(t.getDate() - 1)
  const yKey = t.toISOString().slice(0, 10)
  if (key === yKey) return 'Yesterday'
  // Render in local time — parse as a local date
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function OutreachTab() {
  const { data, today, todaysCounts, increment, decrement, reset } = useOutreachStore()

  const totalToday = useMemo(
    () => PLATFORMS.reduce((sum, p) => sum + (todaysCounts[p.id] || 0), 0),
    [todaysCounts],
  )
  const totalGoal = DAILY_GOAL * PLATFORMS.length

  const recentDays = useMemo(() => {
    const days = []
    const [yy, mm, dd] = today.split('-').map(Number)
    for (let i = 0; i < 7; i++) {
      const d = new Date(yy, mm - 1, dd)
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${da}`
      const counts = data[key] || {}
      days.push({
        key,
        counts,
        total: PLATFORMS.reduce((s, p) => s + (counts[p.id] || 0), 0),
      })
    }
    return days
  }, [data, today])

  const friendlyToday = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [today])

  return (
    <section className="space-y-6 md:space-y-10">
      <div>
        <div className="flex items-baseline justify-between mb-3 px-1 gap-3">
          <div>
            <h2 className="font-display text-2xl text-zinc-100">Outreach</h2>
            <p className="text-xs text-zinc-500">
              {friendlyToday} —{' '}
              <span className="text-zinc-300 font-medium">{totalToday}</span> / {totalGoal} sent
              today
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            disabled={totalToday === 0}
            className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Reset today's counts"
          >
            Reset Today
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORMS.map((p) => (
            <PlatformTile
              key={p.id}
              platform={p}
              count={Number(todaysCounts[p.id]) || 0}
              onIncrement={increment}
              onDecrement={decrement}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h3 className="font-display text-xl text-zinc-300">Last 7 days</h3>
          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            green = goal hit
          </span>
        </div>
        <div className="card card-glow overflow-hidden">
          <div className="hidden md:grid grid-cols-7 gap-2 px-5 py-3 border-b border-zinc-800/80 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
            <div className="col-span-2">Day</div>
            {PLATFORMS.map((p) => (
              <div key={p.id} className="text-right">
                {p.label}
              </div>
            ))}
            <div className="text-right">Total</div>
          </div>
          <ul className="divide-y divide-zinc-800/60">
            {recentDays.map((day) => (
              <li
                key={day.key}
                className="grid grid-cols-2 md:grid-cols-7 gap-2 px-5 py-3 items-center text-sm"
              >
                <div className="md:col-span-2 text-zinc-300 font-medium">
                  {dayLabel(day.key, today)}
                </div>
                {PLATFORMS.map((p) => {
                  const c = Number(day.counts[p.id]) || 0
                  const hit = c >= DAILY_GOAL
                  return (
                    <div
                      key={p.id}
                      className={`md:text-right tabular-nums ${
                        hit
                          ? 'text-emerald-400 font-medium'
                          : c > 0
                            ? 'text-zinc-200'
                            : 'text-zinc-600'
                      }`}
                    >
                      <span className="md:hidden text-zinc-500 mr-1">{p.label}:</span>
                      {c}
                    </div>
                  )
                })}
                <div className="md:text-right tabular-nums font-medium text-zinc-100">
                  <span className="md:hidden text-zinc-500 mr-1">Total:</span>
                  {day.total}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
