// ============================================================
// EXAI FORMAT WEEK-AHEAD EMAIL
// Sent Monday mornings only. Shows the full week's ForexFactory
// calendar (high + medium impact, all currencies) plus bank
// holidays — no AI analysis layer, this is a reference email.
// ============================================================

function formatWeekAheadEmail(eventsResult, allSubscribers) {
  eventsResult = eventsResult || {};
  allSubscribers = allSubscribers || [];

  const dateFormatted     = eventsResult.dateFormatted    || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const weekCalendarByDay = eventsResult.weekCalendarByDay || [];

  const totalEvents = weekCalendarByDay.reduce((sum, d) => sum + d.events.length, 0);

  // ============================================================
  // LOGO (identical to formatEmail.js, for visual consistency)
  // ============================================================
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

  function impactDot(i) {
    if (i === 'high')   return '#CC2200';
    if (i === 'medium') return '#D48000';
    return '#3B82F6';
  }

  function impactLabel(i) {
    if (i === 'high')   return 'HIGH';
    if (i === 'medium') return 'MED';
    return i.toUpperCase();
  }

  // ============================================================
  // DAY-BY-DAY CALENDAR SECTIONS
  // Each dayGroup is { day, ts, events: [...], holidays: [...] },
  // already in correct chronological order from parseEvents.
  // ============================================================
  function buildDaySection(dayGroup) {
    const rows = dayGroup.events.map((ev) => {
      const dot = impactDot(ev.impact);
      return '<tr style="border-bottom:1px solid #F2F2F2;">'
        + '<td style="padding:9px 10px;font-size:12px;color:#888;font-family:monospace;white-space:nowrap;">' + ev.time + ' WAT</td>'
        + '<td style="padding:9px 8px;text-align:center;">'
          + '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + dot + ';"></span>'
          + '<span style="font-size:9px;font-weight:700;color:' + dot + ';margin-left:5px;letter-spacing:0.5px;">' + impactLabel(ev.impact) + '</span>'
        + '</td>'
        + '<td style="padding:9px 8px;text-align:center;">'
          + '<span style="background:#E3EFFF;color:#1255A0;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;">' + ev.currency + '</span>'
        + '</td>'
        + '<td style="padding:9px 12px;font-size:13px;color:#111;font-weight:500;">' + ev.event + '</td>'
        + '<td style="padding:9px 8px;text-align:right;font-size:12px;color:#888;">' + (ev.forecast && ev.forecast !== 'N/A' ? ev.forecast : '—') + '</td>'
        + '<td style="padding:9px 12px;text-align:right;font-size:12px;color:#888;">' + (ev.previous && ev.previous !== 'N/A' ? ev.previous : '—') + '</td>'
        + '</tr>';
    }).join('');

    const tableHtml = rows
      ? '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' + rows + '</table>'
      : '';

    const holidayNote = dayGroup.holidays.length > 0
      ? '<div style="background:#F5F5F5;border-left:3px solid #999;padding:7px 12px;margin-top:8px;border-radius:0 4px 4px 0;">'
        + '<span style="font-size:10px;font-weight:700;color:#777;letter-spacing:1px;text-transform:uppercase;">Bank Holiday: </span>'
        + '<span style="font-size:12px;color:#555;">' + dayGroup.holidays.map((h) => h.currency).join(', ') + '</span>'
        + '</div>'
      : '';

    return '<div style="margin-bottom:20px;">'
      + '<div style="font-size:13px;font-weight:700;color:#111;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #111;">' + dayGroup.day + '</div>'
      + tableHtml
      + holidayNote
      + '</div>';
  }

  let daySections = weekCalendarByDay.map(buildDaySection).join('');

  if (!daySections) {
    daySections = '<p style="font-size:13px;color:#888;margin:0;">No high or medium impact events scheduled this week. A quiet week ahead.</p>';
  }

  // ============================================================
  // BUILD EMAIL PER SUBSCRIBER
  // ============================================================
  const outputItems = [];
  const subject = 'Your week ahead: ' + totalEvents + ' market-moving event' + (totalEvents === 1 ? '' : 's') + ' on the calendar';

  for (let s = 0; s < allSubscribers.length; s++) {
    const userData  = allSubscribers[s];
    const firstName = userData['First Name'] || userData.firstName || userData.first_name || userData.name || 'Trader';
    const lastName  = userData['Last Name']  || userData.lastName  || userData.last_name  || '';
    const userEmail = userData.email || userData.Email || userData.EMAIL || userData['Email Address'] || '';

    if (!userEmail || !userEmail.includes('@')) continue;

    const html = '<!DOCTYPE html>'
      + '<html lang="en">'
      + '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>EXAI Week Ahead</title>'
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
      + '<td align="right" valign="middle"><span style="font-size:10px;color:#4A6A8A;letter-spacing:2px;text-transform:uppercase;">Week of ' + dateFormatted + '</span></td>'
      + '</tr></table>'
      + '</td></tr>'

      // HERO
      + '<tr><td style="background:#07162A;padding:32px 28px 28px;border-bottom:1px solid #0D2040;">'
      + '<div style="display:inline-block;background:#0A1E35;border:1px solid #1A3A5C;border-radius:20px;padding:3px 12px;margin-bottom:14px;">'
      + '<span style="font-size:10px;color:#5A8AC0;letter-spacing:2px;text-transform:uppercase;">Week-ahead briefing</span>'
      + '</div>'
      + '<h1 style="font-family:Barlow Condensed,sans-serif;font-size:26px;font-weight:700;line-height:1.25;margin:0 0 10px;color:#E8EFF8;">'
      + totalEvents + ' market-moving event' + (totalEvents === 1 ? '' : 's') + ' on this week\'s calendar'
      + '</h1>'
      + '<p style="font-size:13px;color:#5A8AC0;line-height:1.6;margin:0;max-width:460px;">Your full week, mapped out — every high and medium impact release, plus bank holidays, so you can plan ahead before Monday\'s open.</p>'
      + '</td></tr>'

      // GREETING
      + '<tr><td style="background:#FFFFFF;padding:22px 28px 16px;border-bottom:1px solid #F0F0F0;">'
      + '<p style="font-size:14px;color:#111;margin:0 0 6px;">Good morning, <strong>' + firstName + '</strong>.</p>'
      + '<p style="font-size:13px;color:#555;line-height:1.65;margin:0;">Here\'s everything on the calendar this week. Daily briefings with live analysis will follow each morning — this is your map for the week.</p>'
      + '</td></tr>'

      // WEEK CALENDAR
      + '<tr><td style="background:#FFFFFF;padding:20px 28px 0;">'
      + '<div style="display:inline-block;width:3px;height:16px;background:#1A6FC4;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
      + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">This week\'s calendar</span>'
      + '<p style="font-size:11px;color:#AAAAAA;margin:6px 0 16px;">High + medium impact, all currencies &nbsp;|&nbsp; Times in WAT (UTC+1)</p>'
      + '<div style="margin-bottom:8px;">' + daySections + '</div>'
      + '</td></tr>'

      // CTA
      + '<tr><td style="background:#07162A;padding:28px 28px;text-align:center;border-top:1px solid #0D2040;">'
      + '<p style="font-size:16px;font-weight:600;color:#E8EFF8;margin:0 0 6px;font-family:Barlow Condensed,sans-serif;letter-spacing:0.5px;">Don\'t trade the week blind</p>'
      + '<p style="font-size:12px;color:#5A8AC0;margin:0 0 18px;line-height:1.6;">Daily AI-powered briefings, live COT positioning, and Fed rate probabilities — every trading morning</p>'
      + '<a href="#" style="display:inline-block;background:#D4A017;color:#07162A;font-size:12px;font-weight:700;padding:11px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">Open EXAI Dashboard</a>'
      + '</td></tr>'

      // FOOTER
      + '<tr><td style="background:#F4F4F4;border-top:1px solid #E0E0E0;border-radius:0 0 10px 10px;padding:22px 28px;text-align:center;">'
      + '<p style="font-size:10px;color:#AAAAAA;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Intelligence · Edge · Precision</p>'
      + '<p style="font-size:11px;color:#AAAAAA;margin:0 0 6px;line-height:1.7;">Source: Forex Factory<br>Delivered every Monday morning, before the week\'s first daily briefing</p>'
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

module.exports = { formatWeekAheadEmail };