import { useEffect, useState } from 'react'

export const BT = {
  canvasBg:  '#FAFAF7',
  ink:       '#1A1F36',
  body:      '#4B5563',
  mute:      '#9CA3AF',
  line:      '#E5E7EB',
  lineSoft:  '#F0EEE9',
  card:      '#FFFFFF',
  blue:      '#1E52C9',
  blueDeep:  '#173FA0',
  blueSoft:  '#E8EEFB',
  coral:     '#F24E3E',
  coralDeep: '#D93B2C',
  coralSoft: '#FDE7E4',
  cream:     '#F8D9C6',
  green:     '#2E7D4F',
  greenSoft: '#E4F2EA',
  amber:     '#B4691E',
  amberSoft: '#FAEBD7',
  gray:      '#6B7280',
  graySoft:  '#F3F4F6',
}

export const BFT = "'Poppins', -apple-system, sans-serif"

export function bfmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return String(Math.round(n))
}

export function bpct(n) {
  if (n == null) return '—'
  return (n * 100).toFixed(1) + '%'
}

export function bmoney(n) {
  if (!n) return '$0'
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return '$' + n
}

export function RolePill({ role }) {
  if (!role) return null
  const st = {
    winner: { bg: BT.greenSoft, fg: BT.green, label: 'WINNER' },
    loser: { bg: BT.coralSoft, fg: BT.coralDeep, label: 'LOSER' },
    control: { bg: BT.graySoft, fg: BT.gray, label: 'CONTROL' },
  }[role]
  if (!st) return null
  return (
    <span
      style={{
        background: st.bg,
        color: st.fg,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.8,
      }}
    >
      {st.label}
    </span>
  )
}

export function StatusDot({ status }) {
  const c =
    status === 'sent'
      ? BT.green
      : status === 'sending'
        ? BT.amber
        : status === 'archived'
          ? BT.mute
          : BT.gray
  const label =
    status === 'sent'
      ? 'Sent'
      : status === 'sending'
        ? 'Sending'
        : status === 'archived'
          ? 'Archived'
          : 'Draft'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: BT.body, fontWeight: 500 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: c,
          boxShadow: status === 'sending' ? `0 0 0 4px ${BT.amberSoft}` : 'none',
        }}
      />
      {label}
    </span>
  )
}

export function EditableText({ value, onChange, style, multiline = false, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    setDraft(value)
  }, [value])
  if (editing) {
    const Tag = multiline ? 'textarea' : 'input'
    return (
      <Tag
        autoFocus
        value={draft || ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft !== value) onChange(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault()
            e.target.blur()
          }
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        style={{
          ...style,
          fontFamily: BFT,
          width: '100%',
          background: BT.blueSoft,
          border: `1px solid ${BT.blue}`,
          borderRadius: 6,
          padding: '4px 6px',
          outline: 'none',
          resize: multiline ? 'vertical' : 'none',
          minHeight: multiline ? 60 : 'auto',
          color: BT.ink,
        }}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      style={{ ...style, cursor: 'text', minHeight: 16, borderRadius: 4, padding: '2px 4px', margin: '-2px -4px' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = BT.lineSoft)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {value || <span style={{ color: BT.mute, fontStyle: 'italic' }}>{placeholder || 'Click to edit'}</span>}
    </div>
  )
}

export function MetricInput({ value, onChange, type = 'pct', small }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const display = type === 'pct' ? bpct(value) : type === 'money' ? bmoney(value) : bfmt(value)
  const startEdit = () => {
    setDraft(type === 'pct' ? ((value || 0) * 100).toFixed(1) : String(value || 0))
    setEditing(true)
  }
  const commit = () => {
    setEditing(false)
    const n = parseFloat(draft)
    if (isNaN(n)) return
    onChange(type === 'pct' ? n / 100 : n)
  }
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          fontFamily: BFT,
          fontSize: small ? 11 : 13,
          fontWeight: 600,
          width: '100%',
          background: BT.blueSoft,
          border: `1px solid ${BT.blue}`,
          borderRadius: 4,
          padding: '2px 4px',
          outline: 'none',
          color: BT.ink,
        }}
      />
    )
  }
  return (
    <div
      onClick={startEdit}
      style={{
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        color: BT.ink,
        cursor: 'text',
        padding: '1px 4px',
        margin: '-1px -4px',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = BT.lineSoft)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {display}
    </div>
  )
}

export function DelayEditor({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          const n = parseInt(draft, 10)
          if (!isNaN(n)) onChange(n)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          fontFamily: BFT,
          fontSize: 10,
          fontWeight: 700,
          width: 44,
          background: BT.blueSoft,
          border: `1px solid ${BT.blue}`,
          borderRadius: 999,
          padding: '2px 6px',
          outline: 'none',
          color: BT.ink,
        }}
      />
    )
  }
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        setDraft(String(value))
        setEditing(true)
      }}
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: BT.blue,
        background: BT.blueSoft,
        borderRadius: 999,
        padding: '2px 8px',
        cursor: 'pointer',
        letterSpacing: 0.4,
      }}
      title="Click to edit delay (days after previous email)"
    >
      +{value}d
    </span>
  )
}
