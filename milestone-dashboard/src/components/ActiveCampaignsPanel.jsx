import { useMemo } from 'react'
import { useCampaignStore } from '../hooks/useCampaignStore.js'
import { aggregateCampaign, BOARD_SECTIONS } from './CampaignBoard/boardData.js'

function fmtNumber(n) {
  if (!Number.isFinite(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'k'
  return String(Math.round(n))
}

function fmtPct(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  return (n * 100).toFixed(1) + '%'
}

function fmtMoney(n) {
  if (!Number.isFinite(n) || !n) return '$0'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

const STATUS_COLORS = {
  draft: 'bg-zinc-600',
  sending: 'bg-amber-400',
  sent: 'bg-emerald-500',
}

const STATUS_LABELS = {
  draft: 'Draft',
  sending: 'Sending',
  sent: 'Sent',
}

function SummaryTile({ label, value, accent }) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'gold'
        ? 'text-gold'
        : 'text-zinc-100'
  return (
    <div className="card card-glow p-4 md:p-5 flex flex-col justify-between min-h-[96px]">
      <span className="label">{label}</span>
      <div className={`font-display text-2xl md:text-3xl tracking-tight ${color}`}>{value}</div>
    </div>
  )
}

export default function ActiveCampaignsPanel() {
  const { campaigns } = useCampaignStore()

  const active = useMemo(
    () => campaigns.filter((c) => c.active && !c.archived),
    [campaigns],
  )

  const summary = useMemo(() => {
    let sent = 0
    let revenue = 0
    let weightedOpen = 0
    active.forEach((c) => {
      c.emails.forEach((e) =>
        e.variants.forEach((v) => {
          const s = Number(v.sent) || 0
          sent += s
          revenue += Number(v.revenue) || 0
          weightedOpen += (Number(v.open) || 0) * s
        }),
      )
    })
    const openRate = sent > 0 ? weightedOpen / sent : null
    return { count: active.length, sent, revenue, openRate }
  }, [active])

  const rows = useMemo(
    () =>
      active.map((c) => {
        const section = BOARD_SECTIONS.find((s) => s.id === c.section)
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          sectionName: section ? section.name : '—',
          agg: aggregateCampaign(c),
        }
      }),
    [active],
  )

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-display text-xl text-zinc-300">Active Campaigns</h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {summary.count} active
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <SummaryTile label="Active" value={String(summary.count)} />
        <SummaryTile label="Total Sent" value={fmtNumber(summary.sent)} />
        <SummaryTile label="Open Rate" value={fmtPct(summary.openRate)} />
        <SummaryTile
          label="Revenue"
          value={fmtMoney(summary.revenue)}
          accent="emerald"
        />
      </div>

      {rows.length === 0 ? (
        <div className="card card-glow p-6 text-sm text-zinc-500 text-center">
          No campaigns marked active. Check <span className="text-zinc-300 font-medium">Active</span> on any campaign in the Campaigns tab to see it here.
        </div>
      ) : (
        <div className="card card-glow overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-800/80 text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-medium">
            <div className="col-span-5">Campaign</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Sent</div>
            <div className="col-span-1 text-right">Open</div>
            <div className="col-span-1 text-right">Conv</div>
            <div className="col-span-2 text-right">Revenue</div>
          </div>
          <ul className="divide-y divide-zinc-800/60">
            {rows.map((r) => {
              const a = r.agg
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-2 md:grid-cols-12 gap-2 px-5 py-3 items-center text-sm"
                >
                  <div className="col-span-2 md:col-span-5 min-w-0">
                    <div className="font-medium text-zinc-100 truncate">{r.name}</div>
                    <div className="text-[11px] text-zinc-500 truncate">↳ {r.sectionName}</div>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[r.status] || 'bg-zinc-600'}`} />
                    {STATUS_LABELS[r.status] || 'Draft'}
                  </div>
                  <div className="md:col-span-1 md:text-right text-zinc-200 tabular-nums">
                    {a ? fmtNumber(a.sent) : '—'}
                  </div>
                  <div className="md:col-span-1 md:text-right text-zinc-200 tabular-nums">
                    {a ? fmtPct(a.open) : '—'}
                  </div>
                  <div className="md:col-span-1 md:text-right text-zinc-200 tabular-nums">
                    {a ? fmtPct(a.conv) : '—'}
                  </div>
                  <div className="md:col-span-2 md:text-right text-emerald-400 font-medium tabular-nums">
                    {a ? fmtMoney(a.revenue) : '$0'}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
