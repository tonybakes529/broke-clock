import { useState, useEffect, useRef, useMemo } from 'react'
import { BT, BFT, bfmt, bmoney } from './BoardTokens.jsx'
import { BOARD_SECTIONS, BOARD_W, BOARD_H, COL_W } from './boardData.js'
import { CampaignColumn } from './BoardCard.jsx'
import { AnalyticsDrawer } from './BoardDrawer.jsx'
import { openCampaignPrintView } from './boardPrint.js'
import { useCampaignStore } from '../../hooks/useCampaignStore.js'

function Toolbar({
  onAdd,
  onExport,
  onReset,
  filter,
  setFilter,
  showArchived,
  setShowArchived,
  zoomIn,
  zoomOut,
  zoomReset,
  zoom,
  stats,
}) {
  const btn = {
    fontFamily: BFT,
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: 8,
    background: BT.card,
    color: BT.ink,
    border: `1px solid ${BT.line}`,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  }
  const btnPrimary = { ...btn, background: BT.blue, color: BT.card, border: `1px solid ${BT.blue}` }
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: 10,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        border: `1px solid ${BT.line}`,
        boxShadow: '0 8px 24px -12px rgba(0,0,0,0.12)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 8px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BT.ink, letterSpacing: -0.3 }}>
            Campaign Board
          </div>
          <div style={{ fontSize: 11, color: BT.mute }}>DirectLend AI</div>
        </div>
        <div style={{ width: 1, height: 24, background: BT.line }} />
        <button style={btnPrimary} onClick={onAdd}>
          + New campaign
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            ...btn,
            paddingRight: 24,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          <option value="all">All sections</option>
          {BOARD_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              ↳ {s.name}
            </option>
          ))}
        </select>
        <label style={{ ...btn, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ margin: 0, cursor: 'pointer' }}
          />
          Archived
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 18, fontSize: 11, color: BT.body }}>
          <div>
            <span style={{ color: BT.mute }}>Campaigns </span>
            <span style={{ fontWeight: 700, color: BT.ink }}>{stats.campaigns}</span>
          </div>
          <div>
            <span style={{ color: BT.mute }}>Emails </span>
            <span style={{ fontWeight: 700, color: BT.ink }}>{stats.emails}</span>
          </div>
          <div>
            <span style={{ color: BT.mute }}>Sent </span>
            <span style={{ fontWeight: 700, color: BT.ink }}>{bfmt(stats.sent)}</span>
          </div>
          <div>
            <span style={{ color: BT.mute }}>Revenue </span>
            <span style={{ fontWeight: 700, color: BT.green }}>{bmoney(stats.revenue)}</span>
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: BT.line }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={{ ...btn, padding: '6px 10px' }} onClick={zoomOut}>
            −
          </button>
          <button
            style={{ ...btn, padding: '6px 10px', minWidth: 54, justifyContent: 'center' }}
            onClick={zoomReset}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button style={{ ...btn, padding: '6px 10px' }} onClick={zoomIn}>
            +
          </button>
        </div>
        <button style={btn} onClick={onExport}>
          Export JSON
        </button>
        <button style={btn} onClick={onReset} title="Reset to empty board">
          Reset
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 12, opacity: 0.3 }}>✉</div>
      <div
        style={{ fontSize: 22, fontWeight: 700, color: BT.ink, letterSpacing: -0.4, marginBottom: 6 }}
      >
        No campaigns yet
      </div>
      <div style={{ fontSize: 13, color: BT.body, marginBottom: 20, maxWidth: 360 }}>
        Start a new campaign column, tag it to a landing-page section, and add the cold open + follow-up
        emails.
      </div>
      <button
        onClick={onAdd}
        style={{
          fontFamily: BFT,
          fontSize: 14,
          fontWeight: 600,
          padding: '12px 20px',
          borderRadius: 10,
          background: BT.blue,
          color: BT.card,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        + New campaign
      </button>
    </div>
  )
}

export default function CampaignBoard() {
  const { campaigns, setCampaigns } = useCampaignStore()
  const [selectedId, setSelectedId] = useState(null)
  const [selectedEmailKey, setSelectedEmailKey] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 40, y: 100 })
  const [isPanning, setIsPanning] = useState(false)
  const viewportRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === 'Escape') {
        setSelectedId(null)
        setSelectedEmailKey(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEmailKey) {
          const [cid, eid] = selectedEmailKey.split(':')
          setCampaigns((cs) =>
            cs.map((c) =>
              c.id === cid ? { ...c, emails: c.emails.filter((em) => em.id !== eid) } : c,
            ),
          )
          setSelectedEmailKey(null)
          e.preventDefault()
        } else if (selectedId) {
          setCampaigns((cs) => cs.filter((c) => c.id !== selectedId))
          setSelectedId(null)
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, selectedEmailKey])

  const addCampaign = () => {
    const id = `c${Date.now()}`
    const maxX = campaigns.reduce((m, c) => Math.max(m, c.x + COL_W + 60), 60)
    const newCamp = {
      id,
      name: 'New Campaign',
      section: 'hero',
      status: 'draft',
      active: false,
      archived: false,
      x: maxX,
      emails: [],
    }
    setCampaigns((cs) => [...cs, newCamp])
    setSelectedId(id)
    setSelectedEmailKey(null)
  }

  const updateCampaign = (id, patched) => {
    setCampaigns((cs) => cs.map((c) => (c.id === id ? patched : c)))
  }

  const deleteCampaign = (id) => {
    setCampaigns((cs) => cs.filter((c) => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(campaigns, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `directlend-campaigns-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const resetBoard = () => {
    if (!confirm('Clear all campaigns? This cannot be undone.')) return
    setCampaigns([])
    setSelectedId(null)
  }

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = -e.deltaY * 0.002
      setZoom((z) => Math.min(1.5, Math.max(0.3, z + delta)))
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
  }

  const onPanStart = (e) => {
    if (e.target !== viewportRef.current && !e.target.classList?.contains('pan-bg')) return
    setIsPanning(true)
    setSelectedId(null)
    setSelectedEmailKey(null)
    const start = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    const onMove = (me) => setPan({ x: start.px + (me.clientX - start.x), y: start.py + (me.clientY - start.y) })
    const onUp = () => {
      setIsPanning(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const makeDragHandlers = (camp) => ({
    onMouseDown: (e) => {
      if (e.button !== 0) return
      e.stopPropagation()
      setSelectedId(camp.id)
      setSelectedEmailKey(null)
      const startX = e.clientX
      const startCampX = camp.x
      const onMove = (me) => {
        const dx = (me.clientX - startX) / zoom
        setCampaigns((cs) =>
          cs.map((c) => (c.id === camp.id ? { ...c, x: Math.max(20, startCampX + dx) } : c)),
        )
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
  })

  const visibleCampaigns = useMemo(
    () =>
      campaigns.filter((c) => {
        if (!showArchived && c.archived) return false
        if (filter !== 'all' && c.section !== filter) return false
        return true
      }),
    [campaigns, filter, showArchived],
  )

  const stats = useMemo(() => {
    let emails = 0
    let sent = 0
    let revenue = 0
    campaigns.forEach((c) => {
      emails += c.emails.length
      c.emails.forEach((e) =>
        e.variants.forEach((v) => {
          sent += v.sent || 0
          revenue += v.revenue || 0
        }),
      )
    })
    return { campaigns: campaigns.length, emails, sent, revenue }
  }, [campaigns])

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 180px)',
        minHeight: 620,
        overflow: 'hidden',
        position: 'relative',
        background: BT.canvasBg,
        fontFamily: BFT,
        color: BT.ink,
        borderRadius: 16,
        border: `1px solid ${BT.line}`,
        backgroundImage: `radial-gradient(circle, ${BT.line} 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <Toolbar
        onAdd={addCampaign}
        onExport={exportJson}
        onReset={resetBoard}
        filter={filter}
        setFilter={setFilter}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        zoomIn={() => setZoom((z) => Math.min(1.5, z + 0.1))}
        zoomOut={() => setZoom((z) => Math.max(0.3, z - 0.1))}
        zoomReset={() => {
          setZoom(0.75)
          setPan({ x: 40, y: 100 })
        }}
        zoom={zoom}
        stats={stats}
      />

      <div
        ref={viewportRef}
        className="pan-bg"
        onWheel={onWheel}
        onMouseDown={onPanStart}
        style={{ position: 'absolute', inset: 0, cursor: isPanning ? 'grabbing' : 'default' }}
      >
        {campaigns.length === 0 && <EmptyState onAdd={addCampaign} />}

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BOARD_W,
            height: BOARD_H,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {visibleCampaigns.map((camp) => (
            <CampaignColumn
              key={camp.id}
              campaign={camp}
              selected={selectedId === camp.id && !selectedEmailKey}
              onUpdate={(patched) => updateCampaign(camp.id, patched)}
              onDelete={() => deleteCampaign(camp.id)}
              onSelect={() => {
                setSelectedId(camp.id)
                setSelectedEmailKey(null)
              }}
              onSelectEmail={(eid) => {
                setSelectedId(camp.id)
                setSelectedEmailKey(`${camp.id}:${eid}`)
              }}
              onOpenDrawer={(cid, eid, vid) =>
                setDrawer({ campaignId: cid, emailId: eid, variantId: vid })
              }
              onPrint={(cid) => {
                const c = campaigns.find((x) => x.id === cid)
                if (c) openCampaignPrintView(c, BOARD_SECTIONS)
              }}
              selectedEmailId={
                selectedEmailKey && selectedEmailKey.startsWith(camp.id + ':')
                  ? selectedEmailKey.split(':')[1]
                  : null
              }
              dragHandlers={makeDragHandlers(camp)}
              sections={BOARD_SECTIONS}
            />
          ))}
        </div>
      </div>

      {drawer &&
        (() => {
          const camp = campaigns.find((c) => c.id === drawer.campaignId)
          if (!camp) return null
          const em = camp.emails.find((e) => e.id === drawer.emailId)
          if (!em) return null
          const v = em.variants.find((vv) => vv.id === drawer.variantId)
          if (!v) return null
          return (
            <AnalyticsDrawer
              open
              campaign={camp}
              email={em}
              variant={v}
              onClose={() => setDrawer(null)}
              onNavigate={(eid, vid) => setDrawer({ campaignId: camp.id, emailId: eid, variantId: vid })}
              onUpdate={(patchedV) => {
                updateCampaign(camp.id, {
                  ...camp,
                  emails: camp.emails.map((ee) =>
                    ee.id === em.id
                      ? {
                          ...ee,
                          variants: ee.variants.map((vv) => (vv.id === v.id ? patchedV : vv)),
                        }
                      : ee,
                  ),
                })
              }}
            />
          )
        })()}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 50,
          padding: '10px 14px',
          background: 'rgba(26, 31, 54, 0.92)',
          color: BT.card,
          borderRadius: 10,
          fontSize: 11,
          lineHeight: 1.6,
          backdropFilter: 'blur(6px)',
          maxWidth: 280,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            fontSize: 10,
            opacity: 0.7,
          }}
        >
          Shortcuts
        </div>
        <div>Drag column header to reorder · scroll to pan · ⌘/Ctrl + scroll to zoom</div>
        <div>
          Click any field to edit · <b>Delete</b> removes selected · <b>Esc</b> deselects
        </div>
      </div>
    </div>
  )
}
