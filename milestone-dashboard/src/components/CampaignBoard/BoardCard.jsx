import {
  BT,
  BFT,
  bfmt,
  bpct,
  bmoney,
  RolePill,
  StatusDot,
  EditableText,
  DelayEditor,
} from './BoardTokens.jsx'
import { aggregateEmail, aggregateCampaign, COL_W, EMAIL_GAP } from './boardData.js'

function VariantRow({ variant, vIndex, total, onEdit, onRole, onDelete, onOpenDrawer }) {
  const isWinner = variant.role === 'winner'
  const isLoser = variant.role === 'loser'
  const ring = isWinner ? BT.green : isLoser ? BT.coralDeep : BT.line
  const letter = String.fromCharCode(65 + vIndex)
  return (
    <div
      style={{
        background: isWinner ? BT.greenSoft : BT.card,
        border: `1px solid ${ring}`,
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: BT.body,
            background: BT.graySoft,
            padding: '2px 6px',
            borderRadius: 4,
            letterSpacing: 0.4,
          }}
        >
          VAR {letter}
        </span>
        <RolePill role={variant.role} />
        <div style={{ flex: 1 }} />
        {total > 1 && (
          <button
            onClick={onDelete}
            title="Delete variant"
            style={{
              fontSize: 11,
              background: 'transparent',
              border: 'none',
              color: BT.mute,
              cursor: 'pointer',
              padding: 2,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: BT.mute,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          Subject
        </div>
        <EditableText
          value={variant.subject}
          onChange={(v) => onEdit('subject', v)}
          style={{ fontSize: 13, fontWeight: 600, color: BT.ink, letterSpacing: -0.1, lineHeight: 1.3 }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: BT.mute,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          Preview
        </div>
        <div style={{ fontSize: 11, color: BT.body, lineHeight: 1.4 }}>
          <EditableText
            value={variant.preview}
            onChange={(v) => onEdit('preview', v)}
            placeholder="Preview text…"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {['winner', 'loser', 'control'].map((r) => (
          <button
            key={r}
            onClick={(e) => {
              e.stopPropagation()
              onRole(variant.role === r ? null : r)
            }}
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 4,
              background:
                variant.role === r
                  ? r === 'winner'
                    ? BT.green
                    : r === 'loser'
                      ? BT.coralDeep
                      : BT.gray
                  : BT.card,
              color: variant.role === r ? BT.card : BT.body,
              border: `1px solid ${variant.role === r ? 'transparent' : BT.line}`,
              cursor: 'pointer',
              fontFamily: BFT,
            }}
          >
            {r[0].toUpperCase()}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenDrawer()
          }}
          title="Open analytics & content drawer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 600,
            color: BT.blue,
            background: BT.blueSoft,
            border: `1px solid ${BT.blue}`,
            borderRadius: 6,
            padding: '3px 8px',
            cursor: 'pointer',
            fontFamily: BFT,
          }}
        >
          Details
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 1l4 4-4 4"
              stroke={BT.blue}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function EmailCard({ email, index, isCold, selected, onUpdate, onDelete, onSelect, onOpenDrawer }) {
  const agg = aggregateEmail(email)
  const setField = (k, v) => onUpdate({ ...email, [k]: v })
  const setVariant = (vi, patch) =>
    onUpdate({ ...email, variants: email.variants.map((vv, i) => (i === vi ? { ...vv, ...patch } : vv)) })
  const addVariant = () => {
    const id = `${email.id}v${Date.now()}`
    onUpdate({
      ...email,
      variants: [
        ...email.variants,
        {
          id,
          subject: 'New subject line',
          preview: '',
          body: '',
          ctaLabel: 'Create free access',
          ctaUrl: 'https://directlend.ai/signup',
          role: null,
          sent: 0,
          open: 0,
          ctr: 0,
          conv: 0,
          reply: 0,
          unsub: 0,
          revenue: 0,
        },
      ],
    })
  }
  const deleteVariant = (vi) => {
    if (email.variants.length === 1) return
    onUpdate({ ...email, variants: email.variants.filter((_, i) => i !== vi) })
  }
  const accent = isCold ? BT.coral : BT.blue
  const accentSoft = isCold ? BT.coralSoft : BT.blueSoft

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onSelect && onSelect()
      }}
      style={{
        background: BT.card,
        borderRadius: 12,
        border: `2px solid ${selected ? accent : BT.line}`,
        boxShadow: selected
          ? `0 0 0 3px ${accentSoft}, 0 12px 28px -10px rgba(0,0,0,0.18)`
          : '0 4px 14px -6px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        transition: 'box-shadow .15s, border-color .15s',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          background: accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: accent,
              color: BT.card,
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <EditableText
              value={email.label}
              onChange={(v) => setField('label', v)}
              style={{ fontSize: 13, fontWeight: 700, color: BT.ink, letterSpacing: -0.2 }}
            />
            {agg && (
              <div style={{ fontSize: 10, color: BT.body, marginTop: 1 }}>
                {bfmt(agg.sent)} sent · {bpct(agg.open)} open · {bpct(agg.conv)} conv
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isCold && <DelayEditor value={email.delay} onChange={(v) => setField('delay', v)} />}
          {!isCold && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="Delete email"
              style={{
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                color: BT.mute,
                cursor: 'pointer',
                padding: 2,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 10 }}>
        {email.variants.map((v, i) => (
          <VariantRow
            key={v.id}
            variant={v}
            vIndex={i}
            total={email.variants.length}
            onEdit={(k, val) => setVariant(i, { [k]: val })}
            onRole={(r) => setVariant(i, { role: r })}
            onDelete={() => deleteVariant(i)}
            onOpenDrawer={() => onOpenDrawer(email.id, v.id)}
          />
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation()
            addVariant()
          }}
          style={{
            width: '100%',
            fontSize: 10,
            fontWeight: 600,
            color: BT.blue,
            background: BT.blueSoft,
            border: `1px dashed ${BT.blue}`,
            borderRadius: 6,
            padding: 6,
            cursor: 'pointer',
            fontFamily: BFT,
          }}
        >
          + A/B variant
        </button>
      </div>
    </div>
  )
}

export function CampaignColumn({
  campaign,
  selected,
  onUpdate,
  onDelete,
  onSelect,
  onOpenDrawer,
  onPrint,
  onSelectEmail,
  selectedEmailId,
  dragHandlers,
  sections,
}) {
  const agg = aggregateCampaign(campaign)
  const setField = (k, v) => onUpdate({ ...campaign, [k]: v })
  const updateEmail = (ei, patched) =>
    onUpdate({ ...campaign, emails: campaign.emails.map((e, i) => (i === ei ? patched : e)) })
  const deleteEmail = (ei) =>
    onUpdate({ ...campaign, emails: campaign.emails.filter((_, i) => i !== ei) })
  const addEmail = () => {
    const id = `${campaign.id}e${Date.now()}`
    const idx = campaign.emails.length
    const newEmail = {
      id,
      label: idx === 0 ? 'Cold open' : `Follow-up ${idx}`,
      delay: idx === 0 ? 0 : 3,
      variants: [
        {
          id: `${id}v1`,
          subject: 'Subject line…',
          preview: 'Preview text…',
          body: '',
          ctaLabel: 'Create free access',
          ctaUrl: 'https://directlend.ai/signup',
          role: null,
          sent: 0,
          open: 0,
          ctr: 0,
          conv: 0,
          reply: 0,
          unsub: 0,
          revenue: 0,
        },
      ],
    }
    onUpdate({ ...campaign, emails: [...campaign.emails, newEmail] })
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: campaign.x,
        top: 20,
        width: COL_W,
        opacity: campaign.archived ? 0.55 : 1,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        style={{
          background: BT.card,
          borderRadius: 14,
          border: `2px solid ${selected ? BT.coral : BT.line}`,
          boxShadow: selected
            ? `0 0 0 3px ${BT.coralSoft}, 0 16px 36px -12px rgba(242,78,62,0.4)`
            : '0 8px 20px -8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <div
          {...dragHandlers}
          style={{
            padding: '10px 14px',
            background: campaign.archived ? BT.graySoft : BT.coralSoft,
            cursor: 'grab',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill={BT.coralDeep} style={{ flexShrink: 0 }}>
              <circle cx="3" cy="3" r="1.2" />
              <circle cx="9" cy="3" r="1.2" />
              <circle cx="3" cy="6" r="1.2" />
              <circle cx="9" cy="6" r="1.2" />
              <circle cx="3" cy="9" r="1.2" />
              <circle cx="9" cy="9" r="1.2" />
            </svg>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: BT.coralDeep,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              Campaign
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {campaign.active && (
              <span
                style={{
                  background: BT.greenSoft,
                  color: BT.green,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  border: `1px solid ${BT.green}`,
                }}
              >
                ACTIVE
              </span>
            )}
            <StatusDot status={campaign.archived ? 'archived' : campaign.status} />
          </div>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <EditableText
            value={campaign.name}
            onChange={(v) => setField('name', v)}
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: BT.ink,
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <select
              value={campaign.section}
              onChange={(e) => setField('section', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: BFT,
                fontSize: 10,
                fontWeight: 600,
                color: BT.blue,
                background: BT.blueSoft,
                border: `1px solid ${BT.blue}`,
                borderRadius: 999,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  ↳ {s.name}
                </option>
              ))}
            </select>
            <select
              value={campaign.status}
              onChange={(e) => setField('status', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: BFT,
                fontSize: 10,
                fontWeight: 600,
                color: BT.body,
                background: BT.graySoft,
                border: `1px solid ${BT.line}`,
                borderRadius: 999,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              <option value="draft">Draft</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
            </select>
            <label
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontWeight: 600,
                color: campaign.active ? BT.green : BT.body,
                background: campaign.active ? BT.greenSoft : BT.card,
                border: `1px solid ${campaign.active ? BT.green : BT.line}`,
                borderRadius: 999,
                padding: '3px 8px',
                cursor: 'pointer',
                fontFamily: BFT,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
              title="Show this campaign on the Dashboard's Active Campaigns panel"
            >
              <input
                type="checkbox"
                checked={!!campaign.active}
                onChange={(e) => setField('active', e.target.checked)}
                style={{ margin: 0, cursor: 'pointer', accentColor: BT.green }}
              />
              Active
            </label>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onPrint(campaign.id)
            }}
            style={{
              width: '100%',
              fontSize: 11,
              fontWeight: 600,
              color: BT.ink,
              background: BT.card,
              border: `1px solid ${BT.line}`,
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              fontFamily: BFT,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 10,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1v7m0 0L3 5m3 3l3-3M2 10h8"
                stroke={BT.ink}
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download PDF for copywriter
          </button>

          {agg ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
                padding: 8,
                background: BT.blueSoft,
                borderRadius: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    color: BT.blue,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Emails
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BT.ink }}>
                  {campaign.emails.length}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    color: BT.blue,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Sent
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BT.ink }}>{bfmt(agg.sent)}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    color: BT.blue,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Conv
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BT.ink }}>{bpct(agg.conv)}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    color: BT.blue,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Rev
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BT.ink }}>
                  {bmoney(agg.revenue)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: BT.mute, fontStyle: 'italic', padding: '6px 0' }}>
              {campaign.emails.length
                ? 'No analytics yet — open any email'
                : 'Add a cold email below to start'}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: EMAIL_GAP }}>
        {campaign.emails.map((em, i) => (
          <div key={em.id} style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: COL_W / 2 - 1,
                top: -EMAIL_GAP,
                width: 2,
                height: EMAIL_GAP,
                background: BT.line,
              }}
            />
            <EmailCard
              email={em}
              index={i}
              isCold={i === 0}
              selected={selectedEmailId === em.id}
              onUpdate={(patched) => updateEmail(i, patched)}
              onDelete={() => deleteEmail(i)}
              onSelect={() => onSelectEmail(em.id)}
              onOpenDrawer={(eid, vid) => onOpenDrawer(campaign.id, eid, vid)}
            />
          </div>
        ))}
        <button
          onClick={(e) => {
            e.stopPropagation()
            addEmail()
          }}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: BT.blue,
            background: BT.blueSoft,
            border: `1.5px dashed ${BT.blue}`,
            borderRadius: 10,
            padding: 12,
            cursor: 'pointer',
            fontFamily: BFT,
          }}
        >
          + Add {campaign.emails.length === 0 ? 'cold email' : 'follow-up'}
        </button>
      </div>
    </div>
  )
}
