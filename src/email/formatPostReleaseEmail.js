const { formatAllCotLines } = require('../ai/currencyIntelligence');

function formatPostReleaseEmail(event, actual, promptNode, aiNode, newsNode, subscribers) {
  const decision = aiNode?.finalDecision?.decision || 'HOLD';
  const conviction = aiNode?.finalDecision?.conviction || 5;
  const thesis = aiNode?.finalDecision?.thesis || 'Insufficient data for a strong read.';

  const fundamentalsView = aiNode?.agents?.fundamentals?.output?.reasoning || '';
  const sentimentView = aiNode?.agents?.sentiment?.output?.reasoning || '';
  const mergedReasoning = [fundamentalsView, sentimentView].filter(Boolean).join(' ');

  const cotLines = formatAllCotLines(promptNode?.cotData || []);
  const cotHtml = cotLines.length
    ? cotLines.map((line) => `<p style="font-size:13px;color:#333;margin:0 0 6px;">${line}</p>`).join('')
    : '<p style="font-size:13px;color:#888;margin:0;">No current COT positioning data.</p>';

  const decisionColor = decision === 'LONG' ? '#1A8A42' : decision === 'SHORT' ? '#CC2200' : '#777';

  const html = `
  <div style="background:#F4F4F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;border:1px solid #EBEBEB;padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#888;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Just Released</p>
      <h1 style="font-size:20px;color:#111;margin:0 0 6px;">${event.currency} - ${event.event}</h1>
      <p style="font-size:16px;color:#111;margin:0 0 20px;">Actual: <strong>${actual}</strong> (Forecast: ${event.forecast || '\u2014'})</p>

      <div style="background:${decisionColor}12;border-left:4px solid ${decisionColor};padding:16px;border-radius:6px;margin-bottom:20px;">
        <p style="font-size:11px;font-weight:700;color:${decisionColor};letter-spacing:1px;text-transform:uppercase;margin:0 0 6px;">${decision} - conviction ${conviction}/10</p>
        <p style="font-size:14px;color:#222;margin:0;">${thesis}</p>
      </div>

      <h3 style="font-size:14px;color:#111;margin:0 0 8px;">What's Driving It</h3>
      <p style="font-size:13px;color:#333;line-height:1.7;margin:0 0 20px;">${mergedReasoning || 'Market reaction still forming.'}</p>

      <h3 style="font-size:14px;color:#111;margin:0 0 8px;">Positioning</h3>
      ${cotHtml}
    </div>
  </div>`;

  const subject = `${event.currency} ${event.event}: ${actual} - ${decision}`;
  const list = Array.isArray(subscribers) ? subscribers : [];
  return list.map((s) => {
    const email = typeof s === 'string' ? s : (s.email || s.Email || '');
    return { to: email, subject, html };
  }).filter((i) => !!i.to);
}

module.exports = { formatPostReleaseEmail };
