export const BOARD_SECTIONS = [
  { id: 'hero', name: 'Hero' },
  { id: 'reviews', name: 'Reviews Marquee' },
  { id: 'how', name: 'How It Works' },
  { id: 'different', name: "How We're Different" },
  { id: 'breather', name: 'Breather Stat' },
  { id: 'compare', name: 'Head-to-Head Table' },
  { id: 'faq', name: 'FAQ' },
  { id: 'finalcta', name: 'Final CTA' },
  { id: 'none', name: 'Not linked' },
]

export const BOARD_W = 5000
export const BOARD_H = 6000
export const LS_KEY = 'directlend-campaign-board-v6'
export const COL_W = 340
export const EMAIL_GAP = 24

export function aggregateEmail(email) {
  const vs = email.variants.filter((v) => v.sent > 0)
  if (!vs.length) return null
  const tot = vs.reduce((a, v) => a + v.sent, 0)
  const w = (k) => vs.reduce((a, v) => a + v[k] * v.sent, 0) / tot
  return {
    sent: tot,
    open: w('open'),
    ctr: w('ctr'),
    conv: w('conv'),
    reply: w('reply'),
    unsub: w('unsub'),
    revenue: vs.reduce((a, v) => a + (v.revenue || 0), 0),
  }
}

export function aggregateCampaign(camp) {
  const flat = camp.emails.flatMap((e) => e.variants).filter((v) => v.sent > 0)
  if (!flat.length) return null
  const tot = flat.reduce((a, v) => a + v.sent, 0)
  const w = (k) => flat.reduce((a, v) => a + v[k] * v.sent, 0) / tot
  return {
    emails: camp.emails.length,
    sent: tot,
    open: w('open'),
    conv: w('conv'),
    revenue: flat.reduce((a, v) => a + (v.revenue || 0), 0),
  }
}
