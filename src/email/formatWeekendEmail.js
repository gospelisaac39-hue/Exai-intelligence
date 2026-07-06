const fs = require('fs');
const path = require('path');

function getLastWeekRuns() {
  const runsDir = path.join(__dirname, '..', '..', 'data', 'runs');
  if (!fs.existsSync(runsDir)) return [];
  const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.json'));
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return files.map(f => {
    const full = path.join(runsDir, f);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < oneWeekAgo) return null;
      return JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch { return null; }
  }).filter(Boolean);
}

function getStats(runs) {
  const debateRuns = runs.filter(r => r.isMajorNewsDay);
  const decisions = debateRuns.map(r => (r.finalDecision && r.finalDecision.decision) || 'HOLD');
  const longCount = decisions.filter(d => /long|buy/i.test(d)).length;
  const shortCount = decisions.filter(d => /short|sell/i.test(d)).length;
  const holdCount = decisions.length - longCount - shortCount;
  return { debates: debateRuns.length, longCount, shortCount, holdCount };
}

function hookLine(stats) {
  if (stats.debates === 0) {
    return 'No forced trades this week. EXAI sat out every setup that did not meet its bar.';
  }
  return stats.debates + ' full debates run. Seven AI agents, arguing every call before it reached you.';
}

function impactLabel(impact) {
  if (impact === 'high') return 'HIGH';
  if (impact === 'medium') return 'MED';
  return '';
}

function formatWeekendEmail(eventsResult, subscribers) {
  const runs = getLastWeekRuns();
  const stats = getStats(runs);
  const upcoming = (eventsResult && eventsResult.weekCalendarAll) || [];
  const dashboardUrl = 'http://localhost:3000';

  const eventsHtml = upcoming.length
    ? upcoming.slice(0, 6).map(function(e) {
        return '<tr>' +
          '<td style="padding:10px 0;border-bottom:1px solid #1a2035;color:#5fb8e0;font-weight:700;font-size:11px;width:46px;">' + e.currency + '</td>' +
          '<td style="padding:10px 0;border-bottom:1px solid #1a2035;color:#e4e8f4;font-size:13px;">' + e.event + '</td>' +
          '<td style="padding:10px 0;border-bottom:1px solid #1a2035;color:#8892ab;font-size:10px;font-weight:700;text-align:center;width:42px;">' + impactLabel(e.impact) + '</td>' +
          '<td style="padding:10px 0;border-bottom:1px solid #1a2035;color:#8892ab;font-size:11px;text-align:right;white-space:nowrap;">' + e.day + '</td>' +
          '</tr>';
      }).join('')
    : '<tr><td colspan="4" style="padding:10px 0;color:#8892ab;font-size:13px;">Calendar updating - check the dashboard for the latest.</td></tr>';

  const html = `
  <div style="background:#05070D;padding:28px 14px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#0a0e1a;border:1px solid #1e2540;border-radius:14px;overflow:hidden;">

      <div style="padding:26px 28px 0;">
        <table style="width:100%;"><tr>
          <td>
            <div style="display:inline-block;width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#4facfe,#00d4ff);vertical-align:middle;"></div>
            <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.5px;vertical-align:middle;margin-left:10px;">EXAI</span>
          </td>
          <td style="text-align:right;">
            <span style="color:#5fb8e0;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Weekly Brief</span>
          </td>
        </tr></table>
      </div>

      <div style="padding:22px 28px 0;">
        <h1 style="color:#ffffff;font-size:24px;line-height:1.3;margin:0 0 10px;font-weight:700;">${hookLine(stats)}</h1>
        <p style="color:#8892ab;font-size:14px;margin:0 0 22px;">Here is what the debate produced, and what is next on the calendar.</p>
      </div>

      <div style="padding:0 28px 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:33%;background:#0d1424;border:1px solid #1e2540;border-radius:10px 0 0 10px;padding:16px 0;text-align:center;">
              <div style="color:#4facfe;font-size:26px;font-weight:800;">${stats.longCount}</div>
              <div style="color:#8892ab;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Bullish</div>
            </td>
            <td style="width:34%;background:#0d1424;border-top:1px solid #1e2540;border-bottom:1px solid #1e2540;padding:16px 0;text-align:center;">
              <div style="color:#ff6b6b;font-size:26px;font-weight:800;">${stats.shortCount}</div>
              <div style="color:#8892ab;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Bearish</div>
            </td>
            <td style="width:33%;background:#0d1424;border:1px solid #1e2540;border-radius:0 10px 10px 0;padding:16px 0;text-align:center;">
              <div style="color:#e4e8f4;font-size:26px;font-weight:800;">${stats.holdCount}</div>
              <div style="color:#8892ab;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Held</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:0 28px 26px;text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4facfe,#00d4ff);color:#05070D;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:8px;">View This Week's Full Debate</a>
      </div>

      <div style="padding:0 28px 8px;">
        <h2 style="color:#ffffff;font-size:14px;margin:0 0 12px;font-weight:700;">Next Week's Calendar</h2>
        <table style="width:100%;border-collapse:collapse;">${eventsHtml}</table>
      </div>

      <div style="padding:24px 28px 26px;">
        <div style="background:#0d1424;border:1px solid #1e2540;border-radius:10px;padding:20px;">
          <p style="color:#c2c9dd;font-size:13px;line-height:1.7;margin:0;">
            Most tools hand you data and let you guess. EXAI runs the argument first - bull case, bear case, risk case - so every call already survived a real debate before it reaches your inbox.
          </p>
        </div>
      </div>

      <div style="padding:16px 28px;border-top:1px solid #1e2540;text-align:center;">
        <p style="color:#4c5470;font-size:10px;margin:0;">EXAI Intelligence &middot; You are receiving this because you subscribed for market briefings.</p>
      </div>
    </div>
  </div>
  `;

  const stronger = stats.debates > 0
    ? stats.debates + ' calls this week - see the full breakdown'
    : 'This week: 0 forced trades. Here is why that matters';

  const subject = 'EXAI: ' + stronger;

  const list = Array.isArray(subscribers) ? subscribers : [];
  return list.map(function(s) {
    const email = typeof s === 'string' ? s : (s.email || s.Email || '');
    return { to: email, subject: subject, html: html };
  }).filter(function(item) { return !!item.to; });
}

module.exports = { formatWeekendEmail, getLastWeekRuns, getStats, hookLine };
