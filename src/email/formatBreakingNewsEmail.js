// Standalone alert for headlines severe enough to move markets outside
// the normal twice-daily briefing cadence (war, central bank emergencies,
// market crashes, etc.) — see src/newsAlert.js for the severity gate.

function formatBreakingNewsEmail(articles, subscribers) {
  const items = Array.isArray(articles) ? articles : [];
  if (items.length === 0) return [];

  const rows = items
    .map(
      (a) => `
      <div style="border-left:3px solid #CC2200;padding:10px 0 10px 14px;margin-bottom:14px;">
        <a href="${a.link || '#'}" style="font-size:14px;font-weight:600;color:#111;text-decoration:none;line-height:1.5;">${a.title}</a>
        <div style="font-size:11px;color:#AAAAAA;margin-top:4px;">${a.source || ''}</div>
      </div>`
    )
    .join('');

  const html = `
  <div style="background:#F4F4F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:8px;border:1px solid #EBEBEB;padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#CC2200;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Breaking — Market Moving</p>
      <h1 style="font-size:20px;color:#111;margin:0 0 16px;">EXAI Alert</h1>
      ${rows}
      <p style="font-size:12px;color:#888;line-height:1.6;margin:16px 0 0;">Flagged outside the regular briefing because of its potential market impact. Full analysis follows in the next scheduled update.</p>
    </div>
  </div>`;

  const subject = items.length === 1 ? `⚠ ${items[0].title}` : `⚠ ${items.length} breaking headlines — market impact expected`;

  const list = Array.isArray(subscribers) ? subscribers : [];
  return list
    .map((s) => {
      const email = typeof s === 'string' ? s : s.email || s.Email || '';
      return { to: email, subject, html };
    })
    .filter((i) => !!i.to);
}

module.exports = { formatBreakingNewsEmail };
