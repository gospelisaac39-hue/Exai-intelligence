// ============================================================
// EXAI FORMAT QUIET-DAY EMAIL
// Sent on weekdays with zero high-impact USD events. Short,
// low-effort email that still keeps the list warm and promotes
// the EXAI dashboard, instead of going silent on the subscriber.
// ============================================================

function formatQuietDayEmail(eventsResult, allSubscribers) {
  eventsResult = eventsResult || {};
  allSubscribers = allSubscribers || [];

  const dateFormatted      = eventsResult.dateFormatted     || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const mediumImpactEvents = eventsResult.mediumImpactEvents || [];
  const currenciesAffected = eventsResult.currenciesAffected || [];

  const logoSVG = '<svg width="130" height="36" viewBox="0 0 195 52" xmlns="http://www.w3.org/2000/svg">'
    + '<defs>'
    + '<linearGradient id="rH" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4A7FBF"/><stop offset="100%" style="stop-color:#2A5A8F"/></linearGradient>'
    + '<linearGradient id="cH" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#F0C040"/><stop offset="100%" style="stop-color:#C8860A"/></linearGradient>'
    + '</defs>'
    + '<circle cx="26" cy="26" r="22" fill="none" stroke="url(#rH)" stroke-width="2.5"/>'
    + '<path d="M15 24 L26 13 L37 24" fill="none" stroke="url(#cH)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M15 33 L26 22 L37 33" fill="none" stroke="url(#cH)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<text x="58" y="38" font-family="Arial Black,sans-serif" font-weight="800" font-size="34" fill="#4A9FE8">EX</text>'
    + '<text x="118" y="38" font-family="Arial Black,sans-serif" font-weight="800" font-size="34" fill="#D4A017">AI</text>'
    + '</svg>';

  let mediumRows = '';
  if (mediumImpactEvents.length > 0) {
    mediumRows = mediumImpactEvents.slice(0, 6).map((ev) =>
      '<tr style="border-bottom:1px solid #F2F2F2;">'
      + '<td style="padding:8px 10px;font-size:12px;color:#888;font-family:monospace;white-space:nowrap;">' + ev.time + ' WAT</td>'
      + '<td style="padding:8px 8px;text-align:center;"><span style="background:#FFF4E5;color:#D48000;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;">' + ev.currency + '</span></td>'
      + '<td style="padding:8px 12px;font-size:13px;color:#111;">' + ev.event + '</td>'
      + '</tr>'
    ).join('');
  }

  const mediumSection = mediumRows
    ? '<div style="margin-top:18px;">'
      + '<div style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Worth a glance — medium impact today</div>'
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0">' + mediumRows + '</table>'
      + '</div>'
    : '';

  const outputItems = [];
  const subject = 'Quiet calendar today — here\'s what\'s still on the radar';

  for (let s = 0; s < allSubscribers.length; s++) {
    const userData  = allSubscribers[s];
    const firstName = userData['First Name'] || userData.firstName || userData.first_name || userData.name || 'Trader';
    const lastName  = userData['Last Name']  || userData.lastName  || userData.last_name  || '';
    const userEmail = userData.email || userData.Email || userData.EMAIL || userData['Email Address'] || '';

    if (!userEmail || !userEmail.includes('@')) continue;

    const html = '<!DOCTYPE html>'
      + '<html lang="en">'
      + '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>EXAI Market Briefing</title>'
      + '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">'
      + '</head>'
      + '<body style="margin:0;padding:0;background:#E8EBF0;font-family:Barlow,Arial,sans-serif;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E8EBF0;">'
      + '<tr><td align="center" style="padding:20px 12px 36px;">'
      + '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">'

      // HEADER
      + '<tr><td style="background:#040E1C;border-radius:10px 10px 0 0;padding:14px 28px;">'
      + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
      + '<td valign="middle">' + logoSVG + '</td>'
      + '<td align="right" valign="middle"><span style="font-size:10px;color:#4A6A8A;letter-spacing:2px;text-transform:uppercase;">' + dateFormatted + '</span></td>'
      + '</tr></table>'
      + '</td></tr>'

      // HERO
      + '<tr><td style="background:#07162A;padding:32px 28px 28px;border-bottom:1px solid #0D2040;">'
      + '<div style="display:inline-block;background:#0A1E35;border:1px solid #1A3A5C;border-radius:20px;padding:3px 12px;margin-bottom:14px;">'
      + '<span style="font-size:10px;color:#5A8AC0;letter-spacing:2px;text-transform:uppercase;">No high-impact USD events today</span>'
      + '</div>'
      + '<h1 style="font-family:Barlow Condensed,sans-serif;font-size:26px;font-weight:700;line-height:1.25;margin:0 0 10px;color:#E8EFF8;">A quiet day on the calendar</h1>'
      + '<p style="font-size:13px;color:#5A8AC0;line-height:1.6;margin:0;max-width:460px;">No major USD releases scheduled. Good day to review positioning rather than chase headlines.</p>'
      + '</td></tr>'

      // GREETING + BODY
      + '<tr><td style="background:#FFFFFF;padding:22px 28px 8px;">'
      + '<p style="font-size:14px;color:#111;margin:0 0 6px;">Good morning, <strong>' + firstName + '</strong>.</p>'
      + '<p style="font-size:13px;color:#555;line-height:1.65;margin:0;">Today\'s calendar is light — no high-impact USD data due. ' + (currenciesAffected.length > 0 ? 'Some movement is still possible around ' + currenciesAffected.slice(0, 4).join(', ') + ' releases.' : 'Markets may stay range-bound until tomorrow.') + '</p>'
      + mediumSection
      + '</td></tr>'

      // PROMO / CTA
      + '<tr><td style="background:#FFFFFF;padding:24px 28px 28px;">'
      + '<div style="background:#F4F8FF;border:1px solid #DCE8FA;border-radius:8px;padding:20px;text-align:center;">'
      + '<p style="font-size:15px;font-weight:700;color:#111;margin:0 0 6px;font-family:Barlow Condensed,sans-serif;">Don\'t let a quiet day catch you off guard</p>'
      + '<p style="font-size:12px;color:#555;margin:0 0 16px;line-height:1.6;">EXAI tracks COT positioning, Fed rate probabilities, and breaking geopolitical headlines around the clock — so when volatility does hit, you\'re already positioned. Full daily briefings resume the moment a high-impact event is back on the calendar.</p>'
      + '<a href="#" style="display:inline-block;background:#D4A017;color:#07162A;font-size:12px;font-weight:700;padding:10px 24px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">Open EXAI Dashboard</a>'
      + '</div>'
      + '</td></tr>'

      // FOOTER
      + '<tr><td style="background:#F4F4F4;border-top:1px solid #E0E0E0;border-radius:0 0 10px 10px;padding:22px 28px;text-align:center;">'
      + '<p style="font-size:10px;color:#AAAAAA;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Intelligence · Edge · Precision</p>'
      + '<p style="font-size:11px;color:#AAAAAA;margin:0 0 6px;line-height:1.7;">Sources: BBC Business · BRICS News · Forex Factory<br>Delivered Monday–Friday at 6:00 AM WAT</p>'
      + '<p style="font-size:11px;color:#BBBBBB;margin:0 0 8px;">© 2026 EXAI Intelligence &nbsp;·&nbsp; <a href="#" style="color:#1A6FC4;text-decoration:none;">Unsubscribe</a> &nbsp;·&nbsp; <a href="#" style="color:#1A6FC4;text-decoration:none;">Preferences</a></p>'
      + '<p style="font-size:10px;color:#CCCCCC;margin:0;">For informational purposes only. Not financial advice.</p>'
      + '</td></tr>'

      + '</table>'
      + '</td></tr>'
      + '</table>'
      + '</body>'
      + '</html>';

    outputItems.push({ html, subject, to: userEmail, userName: (firstName + ' ' + lastName).trim() });
  }

  return outputItems;
}

module.exports = { formatQuietDayEmail };