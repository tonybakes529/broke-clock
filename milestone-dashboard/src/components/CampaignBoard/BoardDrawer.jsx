import { useEffect } from 'react'
import { BT, BFT, EditableText, MetricInput } from './BoardTokens.jsx'

function DrawerField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: BT.mute,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function DrawerMetric({ label, value, type, onChange }) {
  return (
    <div style={{ background: BT.graySoft, borderRadius: 8, padding: '8px 10px' }}>
      <div
        style={{
          fontSize: 9,
          color: BT.mute,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <MetricInput value={value} type={type} onChange={onChange} />
    </div>
  )
}

export function AnalyticsDrawer({ open, campaign, email, variant, onClose, onUpdate, onNavigate }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !campaign || !email || !variant) return null

  const emails = campaign.emails
  const eIdx = emails.findIndex((e) => e.id === email.id)
  const variants = email.variants
  const vIdx = variants.findIndex((v) => v.id === variant.id)
  const letter = String.fromCharCode(65 + vIdx)

  const setV = (k, v) => onUpdate({ ...variant, [k]: v })

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,31,54,0.35)',
          zIndex: 200,
          backdropFilter: 'blur(2px)',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          zIndex: 201,
          background: BT.canvasBg,
          boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: BFT,
          animation: 'drawerIn .2s ease-out',
          color: BT.ink,
        }}
      >
        <style>{`@keyframes drawerIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BT.line}`, background: BT.card }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: BT.coralDeep,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {campaign.name}
            </div>
            <button
              onClick={onClose}
              style={{
                fontSize: 18,
                background: 'transparent',
                border: 'none',
                color: BT.mute,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: eIdx === 0 ? BT.coral : BT.blue,
                color: BT.card,
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {eIdx + 1}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: BT.ink, letterSpacing: -0.3 }}>
              {email.label}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: BT.body,
                background: BT.graySoft,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              VARIANT {letter}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {variants.length > 1 &&
              variants.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => onNavigate(email.id, v.id)}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: v.id === variant.id ? BT.ink : BT.card,
                    color: v.id === variant.id ? BT.card : BT.body,
                    border: `1px solid ${v.id === variant.id ? BT.ink : BT.line}`,
                    cursor: 'pointer',
                    fontFamily: BFT,
                    letterSpacing: 0.4,
                  }}
                >
                  VAR {String.fromCharCode(65 + i)}
                </button>
              ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <DrawerField label="Role">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { k: 'winner', l: 'Winner', c: BT.green },
                { k: 'loser', l: 'Loser', c: BT.coralDeep },
                { k: 'control', l: 'Control', c: BT.gray },
              ].map((r) => (
                <button
                  key={r.k}
                  onClick={() => setV('role', variant.role === r.k ? null : r.k)}
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: variant.role === r.k ? r.c : BT.card,
                    color: variant.role === r.k ? BT.card : BT.body,
                    border: `1px solid ${variant.role === r.k ? 'transparent' : BT.line}`,
                    cursor: 'pointer',
                    fontFamily: BFT,
                  }}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </DrawerField>

          <div
            style={{
              background: BT.card,
              borderRadius: 12,
              border: `1px solid ${BT.line}`,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: BT.ink,
                marginBottom: 12,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              Email content
            </div>

            <DrawerField label="Subject line">
              <EditableText
                value={variant.subject}
                onChange={(v) => setV('subject', v)}
                style={{ fontSize: 14, fontWeight: 600, color: BT.ink, lineHeight: 1.4 }}
              />
            </DrawerField>

            <DrawerField label="Preview text (inbox snippet)">
              <EditableText
                value={variant.preview}
                onChange={(v) => setV('preview', v)}
                style={{ fontSize: 13, color: BT.body, lineHeight: 1.4 }}
                placeholder="Preview text shown under the subject in inbox…"
              />
            </DrawerField>

            <DrawerField label="Body">
              <EditableText
                value={variant.body}
                onChange={(v) => setV('body', v)}
                multiline
                style={{ fontSize: 13, color: BT.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
                placeholder="Write the full email body here. Copywriters will see this in the PDF export."
              />
            </DrawerField>

            <DrawerField label="Primary CTA">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 9, color: BT.mute, marginBottom: 3 }}>Button label</div>
                  <EditableText
                    value={variant.ctaLabel}
                    onChange={(v) => setV('ctaLabel', v)}
                    style={{ fontSize: 12, fontWeight: 600, color: BT.ink }}
                    placeholder="e.g. Create free access"
                  />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: BT.mute, marginBottom: 3 }}>Destination URL</div>
                  <EditableText
                    value={variant.ctaUrl}
                    onChange={(v) => setV('ctaUrl', v)}
                    style={{ fontSize: 11, color: BT.blue, wordBreak: 'break-all' }}
                    placeholder="https://directlend.ai/..."
                  />
                </div>
              </div>
              {variant.ctaUrl && (
                <a
                  href={variant.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    color: BT.blue,
                    marginTop: 6,
                    textDecoration: 'none',
                  }}
                >
                  Open link ↗
                </a>
              )}
            </DrawerField>
          </div>

          <div
            style={{
              background: BT.card,
              borderRadius: 12,
              border: `1px solid ${BT.line}`,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: BT.ink,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                Analytics
              </div>
              <div style={{ fontSize: 10, color: BT.mute }}>Click any value to edit</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              <DrawerMetric label="Sent" value={variant.sent} type="num" onChange={(v) => setV('sent', v)} />
              <DrawerMetric label="Open rate" value={variant.open} type="pct" onChange={(v) => setV('open', v)} />
              <DrawerMetric label="CTR" value={variant.ctr} type="pct" onChange={(v) => setV('ctr', v)} />
              <DrawerMetric label="Conv" value={variant.conv} type="pct" onChange={(v) => setV('conv', v)} />
              <DrawerMetric label="Reply" value={variant.reply} type="pct" onChange={(v) => setV('reply', v)} />
              <DrawerMetric label="Unsub" value={variant.unsub} type="pct" onChange={(v) => setV('unsub', v)} />
            </div>
            <div
              style={{
                background: BT.greenSoft,
                borderRadius: 8,
                padding: '10px 12px',
                border: `1px solid ${BT.green}`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: BT.green,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                Revenue generated
              </div>
              <MetricInput value={variant.revenue} type="money" onChange={(v) => setV('revenue', v)} />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 22px',
            borderTop: `1px solid ${BT.line}`,
            background: BT.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: BT.mute }}>Esc to close</div>
          <button
            onClick={onClose}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 8,
              background: BT.ink,
              color: BT.card,
              border: 'none',
              cursor: 'pointer',
              fontFamily: BFT,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
