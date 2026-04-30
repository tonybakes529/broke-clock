export function openCampaignPrintView(campaign, sections) {
  const section = sections.find((s) => s.id === campaign.section)
  const sectionName = section ? section.name : '—'
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const esc = (s) =>
    String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>')

  const statusLabel = campaign.archived
    ? 'Archived'
    : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)

  const emailsHtml = campaign.emails
    .map((em, i) => {
      const variantsHtml = em.variants
        .map((v, vi) => {
          const letter = String.fromCharCode(65 + vi)
          const roleBadge = v.role ? `<span class="role role-${v.role}">${v.role.toUpperCase()}</span>` : ''
          return `
        <div class="variant">
          <div class="var-head">
            <span class="var-letter">Variant ${letter}</span>
            ${roleBadge}
          </div>
          <div class="field">
            <div class="fl">Subject</div>
            <div class="fv subject">${esc(v.subject) || '<em>(empty)</em>'}</div>
          </div>
          <div class="field">
            <div class="fl">Preview</div>
            <div class="fv">${esc(v.preview) || '<em>(empty)</em>'}</div>
          </div>
          <div class="field">
            <div class="fl">Body</div>
            <div class="fv body">${v.body ? nl2br(v.body) : '<em>(not written yet)</em>'}</div>
          </div>
          <div class="field cta-field">
            <div class="fl">Primary CTA</div>
            <div class="fv">
              <span class="cta-label">${esc(v.ctaLabel) || '<em>(no button)</em>'}</span>
              ${v.ctaUrl ? `<a class="cta-url" href="${esc(v.ctaUrl)}">${esc(v.ctaUrl)}</a>` : ''}
            </div>
          </div>
        </div>
      `
        })
        .join('')

      return `
      <section class="email">
        <div class="email-head">
          <div class="email-num ${i === 0 ? 'cold' : 'follow'}">${i + 1}</div>
          <div class="email-title">
            <div class="el">${esc(em.label)}</div>
            <div class="edelay">${i === 0 ? 'Day 0 · Cold open' : `Send +${em.delay} day${em.delay === 1 ? '' : 's'} after previous`}</div>
          </div>
        </div>
        <div class="variants">${variantsHtml}</div>
      </section>
    `
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(campaign.name)} — DirectLend Campaign Brief</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Poppins', -apple-system, sans-serif; color: #1A1F36; background: #F5F3EE; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 780px; margin: 0 auto; padding: 48px 56px; background: #fff; min-height: 100vh; }
  .brand { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; border-bottom: 2px solid #1E52C9; margin-bottom: 28px; }
  .brand .logo { font-size: 14px; font-weight: 800; letter-spacing: -0.3px; color: #1E52C9; }
  .brand .logo span { color: #F24E3E; }
  .brand .meta { font-size: 10px; color: #6B7280; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 600; }

  h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.8px; margin: 0 0 8px; line-height: 1.1; }
  .subtitle { font-size: 13px; color: #4B5563; margin-bottom: 24px; line-height: 1.5; }

  .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 32px; }
  .pill { font-size: 10px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; }
  .pill.section { background: #E8EEFB; color: #1E52C9; }
  .pill.status { background: #F3F4F6; color: #374151; }
  .pill.emails { background: #F8D9C6; color: #D93B2C; }

  .brief-note { background: #FAEBD7; border-left: 3px solid #B4691E; padding: 12px 14px; border-radius: 4px; margin-bottom: 32px; font-size: 12px; color: #1A1F36; line-height: 1.6; }
  .brief-note b { color: #B4691E; text-transform: uppercase; letter-spacing: 0.4px; font-size: 10px; }

  .email { border: 1px solid #E5E7EB; border-radius: 12px; margin-bottom: 20px; page-break-inside: avoid; overflow: hidden; }
  .email-head { background: #F3F4F6; padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
  .email-num { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 14px; }
  .email-num.cold { background: #F24E3E; }
  .email-num.follow { background: #1E52C9; }
  .el { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
  .edelay { font-size: 11px; color: #6B7280; margin-top: 2px; font-weight: 500; }

  .variants { padding: 14px 18px; }
  .variant { border-top: 1px dashed #E5E7EB; padding: 16px 0; }
  .variant:first-child { border-top: none; padding-top: 4px; }
  .var-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .var-letter { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; color: #374151; background: #F3F4F6; padding: 3px 8px; border-radius: 4px; }
  .role { font-size: 9px; font-weight: 800; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 999px; }
  .role-winner { background: #E4F2EA; color: #2E7D4F; }
  .role-loser { background: #FDE7E4; color: #D93B2C; }
  .role-control { background: #F3F4F6; color: #6B7280; }

  .field { margin-bottom: 10px; }
  .fl { font-size: 9px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: #9CA3AF; margin-bottom: 3px; }
  .fv { font-size: 13px; color: #1A1F36; line-height: 1.55; }
  .fv.subject { font-size: 15px; font-weight: 600; }
  .fv.body { white-space: pre-wrap; padding: 12px 14px; background: #FAFAF7; border-radius: 8px; border: 1px solid #F0EEE9; font-size: 12px; line-height: 1.7; }
  .cta-field .fv { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .cta-label { display: inline-block; padding: 6px 14px; background: #1E52C9; color: #fff; border-radius: 6px; font-weight: 600; font-size: 12px; }
  .cta-url { font-size: 11px; color: #1E52C9; word-break: break-all; text-decoration: none; }

  .foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; letter-spacing: 0.4px; }

  .print-bar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 99; }
  .print-bar button { font-family: 'Poppins'; font-size: 12px; font-weight: 600; padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 12px -4px rgba(0,0,0,0.2); }
  .print-bar .primary { background: #1E52C9; color: #fff; }
  .print-bar .secondary { background: #fff; color: #1A1F36; border: 1px solid #E5E7EB; }

  @media print {
    body { background: #fff; }
    .page { padding: 0; max-width: none; }
    .print-bar { display: none; }
    .email { box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="print-bar">
    <button class="primary" onclick="window.print()">Save as PDF</button>
    <button class="secondary" onclick="window.close()">Close</button>
  </div>
  <div class="page">
    <div class="brand">
      <div class="logo">Direct<span>Lend</span> AI</div>
      <div class="meta">Campaign Brief · ${esc(today)}</div>
    </div>

    <h1>${esc(campaign.name)}</h1>
    <div class="subtitle">Copywriter brief — full sequence with subject lines, preview text, body copy and CTAs for every variant.</div>

    <div class="pills">
      <span class="pill section">↳ ${esc(sectionName)}</span>
      <span class="pill status">Status: ${esc(statusLabel)}</span>
      <span class="pill emails">${campaign.emails.length} email${campaign.emails.length === 1 ? '' : 's'}</span>
    </div>

    <div class="brief-note">
      <b>For the copywriter</b><br>
      Each email below shows subject line, preview text, and full body copy. Where multiple variants exist, A/B test each against the "Winner" (if tagged) and maintain voice consistency across the sequence. CTAs link to DirectLend signup unless noted.
    </div>

    ${emailsHtml || '<p style="color:#9CA3AF;font-style:italic;">No emails in this campaign yet.</p>'}

    <div class="foot">
      DirectLend AI · Campaign brief generated ${esc(today)} · Confidential
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow popups to download the campaign PDF.')
    return
  }
  win.document.write(html)
  win.document.close()
}
