// ============================================================
// EXAI FORMAT EMAIL v4 — WITH JBLANKED ACTUALS
// ============================================================

function formatEmail(promptNode, aiNode, newsNode, allSubscribers) {
  promptNode = promptNode || {};
  aiNode = aiNode || {};
  newsNode = newsNode || {};
  allSubscribers = allSubscribers || [];

const allEvents          = promptNode.allEvents          || [];
const highImpactEvents   = promptNode.highImpactEvents   || [];
const mediumImpactEvents = promptNode.mediumImpactEvents || [];
const currenciesAffected = promptNode.currenciesAffected || [];
const dateFormatted      = promptNode.dateFormatted      || new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const chainContextToday  = promptNode.chainContextToday  || [];
const weekAnticipation   = promptNode.weekAnticipation   || [];
const bankHolidaysToday  = promptNode.bankHolidaysToday  || [];

// ── PULL JBLANKED ACTUALS ─────────────────────────────────────
const actualsData = promptNode.actualsData || [];

// Build lookup map: "USD|UNEMPLOYMENT CLAIMS" → actual entry
const actualsMap = {};
for (const a of actualsData) {
  const key = `${a.currency}|${a.event}`.toUpperCase();
  actualsMap[key] = a;
}

// Fuzzy lookup — returns the JBlanked entry for a calendar event if found
function findActual(ev) {
  const key = `${ev.currency}|${ev.event}`.toUpperCase();
  if (actualsMap[key]) return actualsMap[key];
  for (const [k, v] of Object.entries(actualsMap)) {
    const evName = ev.event.toUpperCase();
    const acName = v.event.toUpperCase();
    if (evName.includes(acName) || acName.includes(evName)) return v;
  }
  return null;
}

const buckets      = newsNode.buckets      || {};
const breakingNews = newsNode.breakingNews || [];
const allFiltered  = newsNode.allFiltered  || [];

let aiText = '';
try { aiText = aiNode.text || aiNode.content?.[0]?.text || aiNode.message?.content || ''; } catch(e){}

const now       = new Date();
const dateShort = now.toLocaleDateString('en-US',{month:'short',day:'numeric'});

// ============================================================
// SUBJECT LINE
// ============================================================
function buildEventHook(ev) {
  const t   = (ev.event || '').toLowerCase();
  const ccy = ev.currency || 'USD';
  if (t.includes('non-farm') || t.includes('nfp'))
    return `NFP drops today — will the Dollar hold? | ${dateShort}`;
  if (t.includes('fomc') || (t.includes('interest rate') && ccy === 'USD'))
    return `Fed decides rates today — cut, hold, or surprise? | ${dateShort}`;
  if (t.includes('core cpi'))
    return `Core CPI today — is inflation still running hot? | ${dateShort}`;
  if (t.includes('cpi'))
    return `CPI today — inflation still running hot? | ${dateShort}`;
  if (t.includes('ppi'))
    return `PPI today — where is inflation heading next month? | ${dateShort}`;
  if (t.includes('pce'))
    return `PCE inflation today — Fed's own gauge under the spotlight | ${dateShort}`;
  if (t.includes('retail sales') || t.includes('retail'))
    return `Retail Sales today — are consumers still spending? | ${dateShort}`;
  if (t.includes('gdp'))
    return `GDP today — recession risk back on the table? | ${dateShort}`;
  if (t.includes('ism manufacturing') || (t.includes('manufacturing') && t.includes('pmi')))
    return `ISM Manufacturing today — expansion or contraction? | ${dateShort}`;
  if (t.includes('ism services') || (t.includes('services') && t.includes('pmi')))
    return `ISM Services today — how healthy is the US economy? | ${dateShort}`;
  if (t.includes('unemployment'))
    return `Unemployment today — cracks forming in the jobs market? | ${dateShort}`;
  if (t.includes('jolts'))
    return `JOLTS today — is the labour market tightening or loosening? | ${dateShort}`;
  if (t.includes('adp'))
    return `ADP jobs preview today — what it signals for Friday NFP | ${dateShort}`;
  if (t.includes('jobless claims'))
    return `Jobless Claims today — first look at this week's jobs picture | ${dateShort}`;
  if (t.includes('consumer confidence'))
    return `Consumer Confidence today — are Americans feeling the pressure? | ${dateShort}`;
  if (t.includes('powell') || t.includes('fed speak'))
    return `Powell speaks today — every word moves the Dollar | ${dateShort}`;
  if (t.includes('jackson hole'))
    return `Jackson Hole today — Fed sets the tone for the rest of the year | ${dateShort}`;
  return `${ev.event} today — Dollar reaction incoming | ${dateShort}`;
}

function buildMultiHook(events) {
  const names = events.slice(0, 2).map(e => {
    const t = (e.event || '').toLowerCase();
    if (t.includes('non-farm') || t.includes('nfp'))       return 'NFP';
    if (t.includes('core cpi'))                            return 'Core CPI';
    if (t.includes('cpi'))                                 return 'CPI';
    if (t.includes('ppi'))                                 return 'PPI';
    if (t.includes('fomc') || t.includes('interest rate')) return 'Fed Rate Decision';
    if (t.includes('retail'))                              return 'Retail Sales';
    if (t.includes('gdp'))                                 return 'GDP';
    if (t.includes('pmi') || t.includes('ism'))            return 'PMI';
    if (t.includes('unemployment'))                        return 'Unemployment';
    if (t.includes('adp'))                                 return 'ADP';
    if (t.includes('jolts'))                               return 'JOLTS';
    if (t.includes('pce'))                                 return 'PCE';
    return e.event.split(' ').slice(0, 2).join(' ');
  });
  if (events.length === 2)
    return `${names[0]} + ${names[1]} both due today — big Dollar moves expected | ${dateShort}`;
  return `${events.length} USD events today — ${names.join(', ')} and more | ${dateShort}`;
}

function buildSubject() {
  if (highImpactEvents.length === 1) return buildEventHook(highImpactEvents[0]);
  if (highImpactEvents.length >= 2)  return buildMultiHook(highImpactEvents);
  const forexWords = ['dollar','fed','rate','gold','oil','usd','eur','gbp','jpy','inflation','fomc','nfp','cpi','ppi','tariff','opec','powell','treasury','yield','recession','forex','dxy'];
  if (breakingNews.length > 0) {
    const fb = breakingNews.find(a => forexWords.some(w => a.title.toLowerCase().includes(w)));
    if (fb) {
      const t = fb.title.length > 65 ? fb.title.substring(0,62)+'...' : fb.title;
      return `${t} | ${dateShort}`;
    }
  }
  const topKey = ['fed_rates','trump','gold_commodities','geopolitics','usd_forex'].find(k => (buckets[k]||[]).length > 0);
  if (topKey && buckets[topKey][0]) {
    const t = buckets[topKey][0].title;
    return `${t.length > 65 ? t.substring(0,62)+'...' : t} | ${dateShort}`;
  }
  if (mediumImpactEvents.length > 0) {
    const ccys  = [...new Set(mediumImpactEvents.map(e => e.currency))].slice(0,4);
    const count = mediumImpactEvents.length;
    return `${ccys.join(', ')} in focus — ${count} market event${count > 1 ? 's' : ''} today | ${dateShort}`;
  }
  return `Light calendar today — here's what still moves markets | ${dateShort}`;
}

const subject = buildSubject();

// ============================================================
// LOGO
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

// ============================================================
// HELPERS
// ============================================================
function impactDot(i) {
  if (i === 'high')   return '#CC2200';
  if (i === 'medium') return '#D48000';
  return '#3B82F6';
}

function hasActual(val) {
  if (val === null || val === undefined) return false;
  const s = val.toString().trim();
  return s !== '' && s !== 'Pending' && s !== 'N/A' && s !== '0';
}

// Determines color and arrow based on actual vs forecast
// Uses lowerIsBetter logic for unemployment/claims
function actualStyle(actual, forecast, eventName) {
  if (!hasActual(actual)) return { color: '#BBBBBB', suffix: '' };
  const a = parseFloat(actual);
  const f = parseFloat(forecast);
  if (isNaN(a) || isNaN(f)) return { color: '#777777', suffix: ' ➡' };
  const t = (eventName || '').toLowerCase();
  const lowerIsBetter = t.includes('unemployment') || t.includes('jobless') || t.includes('claims');
  if (lowerIsBetter) {
    if (a < f) return { color: '#1A8A42', suffix: ' ▲' }; // fewer claims = good
    if (a > f) return { color: '#CC2200', suffix: ' ▼' };
  } else {
    if (a > f) return { color: '#1A8A42', suffix: ' ▲' };
    if (a < f) return { color: '#CC2200', suffix: ' ▼' };
  }
  return { color: '#777777', suffix: ' ➡' };
}

// Outcome tag HTML — shows "Beat" / "Miss" / "In Line" badge
function outcomeTag(jbEntry) {
  if (!jbEntry || !jbEntry.outcome) return '';
  const q = jbEntry.quality  || '';
  const s = jbEntry.strength || '';
  if (q === 'Good Data' && s === 'Strong Data')
    return '<span style="background:#E6F5EC;color:#1A8A42;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:6px;letter-spacing:0.5px;">BEAT</span>';
  if (q === 'Bad Data')
    return '<span style="background:#FCECEA;color:#CC2200;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:6px;letter-spacing:0.5px;">MISS</span>';
  return '<span style="background:#F5F5F5;color:#888;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:6px;letter-spacing:0.5px;">IN LINE</span>';
}

function buildHeroSubline() {
  if (!aiText) return 'Everything that moves markets — in one read.';
  const first = aiText.replace(/\*\*(.*?)\*\*/g,'$1').split(/\n+/).find(s => s.trim().length > 40);
  if (first) return first.trim().substring(0,160);
  return 'Everything that moves markets — in one read.';
}

// ============================================================
// NUMBERS TO WATCH — USD high impact only
// Merges JBlanked actuals over Forex Factory data
// ============================================================
const watchEvents = highImpactEvents.slice(0, 5);
let numbersRows = '';
if (watchEvents.length === 0) {
  numbersRows = '<tr><td colspan="4" style="padding:16px 0;font-size:13px;color:#AAAAAA;">No USD high-impact events scheduled today.</td></tr>';
} else {
  for (let i = 0; i < watchEvents.length; i++) {
    const ev     = watchEvents[i];
    const jb     = findActual(ev);

    // Use JBlanked actual if available, fall back to FF actual
    const actualVal  = (jb && hasActual(jb.actual))  ? jb.actual  : ev.actual;
    const forecastVal= (jb && jb.forecast && jb.forecast !== '0') ? jb.forecast : ev.forecast;

    const st = actualStyle(actualVal, forecastVal, ev.event);
    const tag = jb ? outcomeTag(jb) : '';

    const actualDisplay = hasActual(actualVal)
      ? '<strong style="color:' + st.color + ';">' + actualVal + st.suffix + '</strong>' + tag
      : '<span style="color:#BBBBBB;">Pending</span>';

    const bg = (i % 2 === 0) ? '#FFFFFF' : '#FAFAFA';
    numbersRows += '<tr style="background:' + bg + ';border-bottom:1px solid #F0F0F0;">'
      + '<td style="padding:11px 12px;font-size:13px;color:#111;font-weight:500;">' + ev.currency + ' — ' + ev.event + '</td>'
      + '<td style="padding:11px 8px;font-size:13px;color:#777;text-align:right;">' + (ev.previous && ev.previous !== 'N/A' ? ev.previous : '—') + '</td>'
      + '<td style="padding:11px 8px;font-size:13px;color:#777;text-align:right;">' + (forecastVal && forecastVal !== 'N/A' ? forecastVal : '—') + '</td>'
      + '<td style="padding:11px 12px;font-size:13px;text-align:right;">' + actualDisplay + '</td>'
      + '</tr>';
  }
}

// ============================================================
// ECONOMIC CALENDAR — all events today
// Merges JBlanked actuals into every calendar row
// ============================================================
const calCurrencies = ['USD','GBP','JPY','CAD','NZD','AUD','EUR','CHF'];
const calEvents = allEvents.filter(ev =>
  calCurrencies.indexOf((ev.currency||'').toUpperCase()) > -1
);

let calRows = '';
if (calEvents.length === 0) {
  calRows = '<tr><td colspan="7" style="padding:16px;font-size:12px;color:#AAAAAA;">No events for selected currencies today.</td></tr>';
} else {
  for (let i = 0; i < calEvents.length; i++) {
    const ev  = calEvents[i];
    const jb  = findActual(ev);

    // Merge: JBlanked wins if it has a real value
    const actualVal   = (jb && hasActual(jb.actual))                     ? jb.actual   : ev.actual;
    const forecastVal = (jb && jb.forecast && jb.forecast !== '0' && jb.forecast !== 'N/A') ? jb.forecast : ev.forecast;
    const tag         = jb ? outcomeTag(jb) : '';

    const st = actualStyle(actualVal, forecastVal, ev.event);
    const actualCell = hasActual(actualVal)
      ? '<strong style="color:' + st.color + ';">' + actualVal + st.suffix + '</strong>' + tag
      : '<span style="color:#CCC;">—</span>';

    const prevCell     = (ev.previous && ev.previous !== 'N/A') ? ev.previous : '—';
    const forecastCell = (forecastVal  && forecastVal  !== 'N/A') ? forecastVal  : '—';
    const bg = (i % 2 === 0) ? '#FFFFFF' : '#FAFAFA';

    calRows += '<tr style="background:' + bg + ';border-top:1px solid #F0F0F0;">'
      + '<td style="padding:9px 12px;font-size:11px;font-weight:600;color:#1A6FC4;font-family:monospace;white-space:nowrap;">' + ev.time + '</td>'
      + '<td style="padding:9px 8px;text-align:center;"><span style="display:inline-block;width:7px;height:7px;background:' + impactDot(ev.impact) + ';border-radius:50%;"></span></td>'
      + '<td style="padding:9px 8px;text-align:center;"><span style="background:#E3EFFF;color:#1255A0;font-size:10px;font-weight:700;padding:2px 5px;border-radius:3px;">' + ev.currency + '</span></td>'
      + '<td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111;">' + ev.event + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:12px;color:#888;">' + prevCell + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:12px;color:#888;">' + forecastCell + '</td>'
      + '<td style="padding:9px 8px;text-align:center;">' + actualCell + '</td>'
      + '</tr>';
  }
}

// ============================================================
// ACTUALS RELEASED TODAY — standalone section
// Shows only events that have a confirmed actual from JBlanked
// ============================================================
let actualsSection = '';
if (actualsData.length > 0) {
  let actualsRows = '';
  for (let i = 0; i < actualsData.length; i++) {
    const a  = actualsData[i];
    const st = actualStyle(a.actual, a.forecast, a.event);
    const tag = outcomeTag(a);
    const bg = (i % 2 === 0) ? '#FFFFFF' : '#FAFAFA';
    actualsRows += '<tr style="background:' + bg + ';border-top:1px solid #F0F0F0;">'
      + '<td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111;">'
        + '<span style="background:#E3EFFF;color:#1255A0;font-size:10px;font-weight:700;padding:2px 5px;border-radius:3px;margin-right:8px;">' + a.currency + '</span>'
        + a.event
      + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:12px;color:#888;">' + (a.previous !== 'N/A' && a.previous !== '0' ? a.previous : '—') + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:12px;color:#888;">' + (a.forecast !== 'N/A' && a.forecast !== '0' ? a.forecast : '—') + '</td>'
      + '<td style="padding:9px 12px;text-align:right;">'
        + '<strong style="color:' + st.color + ';">' + a.actual + st.suffix + '</strong>' + tag
      + '</td>'
      + '</tr>';
  }

  actualsSection = '<tr><td style="background:#FFFFFF;padding:0 28px 0;border-top:1px solid #F0F0F0;">'
    + '<div style="margin-top:20px;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#1A8A42;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">Released today</span>'
    + '<span style="font-size:10px;color:#AAAAAA;margin-left:10px;">Actual results from today\'s calendar</span>'
    + '</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #EBEBEB;border-radius:6px;overflow:hidden;margin-top:12px;margin-bottom:22px;">'
    + '<tr style="background:#111;">'
    + '<th style="padding:8px 12px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Event</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Prev</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Fcst</th>'
    + '<th style="padding:8px 12px;font-size:10px;font-weight:600;color:#AAA;text-align:right;letter-spacing:1px;text-transform:uppercase;">Actual</th>'
    + '</tr>'
    + actualsRows
    + '</table>'
    + '</td></tr>';
}

// ============================================================
// ANTICIPATION BLOCKS — USD high impact only
// ============================================================
let anticipationBlocks = '';
const anticipationColors = ['#CC2200','#1A6FC4','#1A8A42','#C8860A','#7B3FC4'];

if (highImpactEvents.length > 0) {
  highImpactEvents.forEach((ev, i) => {
    if (!ev.anticipation) return;
    const color  = anticipationColors[i % anticipationColors.length];
    const jb     = findActual(ev);
    const actualVal = (jb && hasActual(jb.actual)) ? jb.actual : (hasActual(ev.actual) ? ev.actual : null);

    // If actual is already released, show it prominently instead of anticipation
    if (actualVal) {
      const st  = actualStyle(actualVal, ev.forecast, ev.event);
      const tag = jb ? outcomeTag(jb) : '';
      anticipationBlocks +=
        '<div style="border-left:3px solid ' + color + ';padding:10px 0 10px 14px;margin-bottom:18px;">'
        + '<div style="font-size:10px;font-weight:700;color:' + color + ';letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">' + ev.currency + ' · ' + ev.time + ' WAT · RELEASED</div>'
        + '<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:8px;">' + ev.event + '</div>'
        + '<div style="font-size:22px;font-weight:700;color:' + st.color + ';margin-bottom:4px;">' + actualVal + st.suffix + tag + '</div>'
        + '<div style="font-size:12px;color:#888;">Forecast: ' + (ev.forecast !== 'N/A' ? ev.forecast : '—') + ' &nbsp;|&nbsp; Previous: ' + (ev.previous !== 'N/A' ? ev.previous : '—') + '</div>'
        + (jb && jb.outcome ? '<div style="font-size:11px;color:#555;margin-top:4px;">' + jb.outcome + '</div>' : '')
        + '</div>';
      return;
    }

    // Not yet released — show anticipation as before
    const pairsHtml = ev.pairs && ev.pairs.length
      ? '<div style="margin-top:8px;"><span style="font-size:10px;font-weight:700;color:' + color + ';letter-spacing:1px;text-transform:uppercase;">Watch: </span>'
        + '<span style="font-size:11px;color:#555;">' + ev.pairs.join(' · ') + '</span></div>'
      : '';
    const bullHtml = ev.bullCase
      ? '<div style="margin-top:6px;font-size:12px;color:#1A8A42;"><strong>▲ Bull:</strong> ' + ev.bullCase + '</div>'
      : '';
    const bearHtml = ev.bearCase
      ? '<div style="margin-top:4px;font-size:12px;color:#CC2200;"><strong>▼ Bear:</strong> ' + ev.bearCase + '</div>'
      : '';
    const noSurpriseHtml = ev.noSurprise
      ? '<div style="margin-top:4px;font-size:11px;color:#D48000;"><strong>↔ No Surprise:</strong> ' + ev.noSurprise + '</div>'
      : '';
    const chainHtml = ev.chainPosition
      ? '<div style="margin-top:6px;font-size:10px;color:#888;font-style:italic;">' + ev.chainPosition + '</div>'
      : '';

    anticipationBlocks +=
      '<div style="border-left:3px solid ' + color + ';padding:10px 0 10px 14px;margin-bottom:18px;">'
      + '<div style="font-size:10px;font-weight:700;color:' + color + ';letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">' + ev.currency + ' · ' + ev.time + ' WAT</div>'
      + '<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:6px;">' + ev.event + '</div>'
      + '<div style="font-size:13px;color:#333;line-height:1.7;">' + ev.anticipation + '</div>'
      + bullHtml + bearHtml + noSurpriseHtml + chainHtml + pairsHtml
      + '</div>';
  });
}

if (!anticipationBlocks) {
  anticipationBlocks = '<p style="font-size:13px;color:#888;margin:0;">No USD high-impact events today. Monitor medium-impact releases for volatility.</p>';
}

// ============================================================
// CHAIN CONTEXT STRIP
// ============================================================
let chainStrip = '';
if (chainContextToday.length > 0) {
  chainStrip = '<div style="background:#F0F4FF;border-left:3px solid #1A6FC4;padding:10px 14px;margin-bottom:18px;border-radius:0 4px 4px 0;">'
    + '<div style="font-size:10px;font-weight:700;color:#1A6FC4;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">EXAI Fundamental Chain</div>'
    + chainContextToday.map(s => '<div style="font-size:12px;color:#333;line-height:1.7;margin-bottom:2px;">' + s + '</div>').join('')
    + '</div>';
}

// ============================================================
// WEEK AHEAD STRIP
// ============================================================
let weekAheadStrip = '';
if (weekAnticipation.length > 0) {
  const weekRows = weekAnticipation.slice(0, 5).map(ev =>
    '<tr>'
    + '<td style="padding:7px 10px;font-size:11px;color:#1A6FC4;font-weight:600;white-space:nowrap;">' + ev.day + '</td>'
    + '<td style="padding:7px 10px;font-size:11px;color:#1A6FC4;font-family:monospace;">' + ev.time + '</td>'
    + '<td style="padding:7px 10px;font-size:12px;font-weight:600;color:#111;">' + ev.event + '</td>'
    + '<td style="padding:7px 10px;font-size:11px;color:#888;">' + (ev.forecast || '—') + '</td>'
    + '</tr>'
  ).join('');
  weekAheadStrip =
    '<div style="margin-bottom:22px;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#C8860A;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">Week Ahead — USD High Impact</span>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #EBEBEB;border-radius:6px;overflow:hidden;margin-top:10px;">'
    + '<tr style="background:#111;">'
    + '<th style="padding:7px 10px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Day</th>'
    + '<th style="padding:7px 10px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Time</th>'
    + '<th style="padding:7px 10px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Event</th>'
    + '<th style="padding:7px 10px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Fcst</th>'
    + '</tr>'
    + weekRows
    + '</table>'
    + '</div>';
}

// ============================================================
// BANK HOLIDAY STRIP
// ============================================================
let holidayStrip = '';
if (bankHolidaysToday.length > 0) {
  holidayStrip = '<div style="background:#F5F5F5;border-left:3px solid #999;padding:8px 14px;margin-bottom:16px;border-radius:0 4px 4px 0;">'
    + '<span style="font-size:10px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;">Bank Holidays Today: </span>'
    + bankHolidaysToday.map(h => '<span style="font-size:12px;color:#555;margin-left:8px;">' + h.currency + '</span>').join('')
    + '<div style="font-size:11px;color:#999;margin-top:4px;">Low volatility expected for affected pairs during their sessions.</div>'
    + '</div>';
}

// ============================================================
// AI INSIGHT BLOCKS
// ============================================================
const insightColors = ['#7B3FC4','#1A6FC4','#1A8A42','#C8860A','#CC2200','#1A6FC4'];
const insightLines = aiText
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .split(/\n+/)
  .filter(s => s.trim().length > 50)
  .slice(0, 5);

let insightBlocks = '';
for (let i = 0; i < insightLines.length; i++) {
  insightBlocks += '<div style="border-left:3px solid ' + insightColors[i % insightColors.length] + ';padding:0 0 0 14px;margin-bottom:16px;">'
    + '<p style="font-size:13px;color:#333;line-height:1.75;margin:0;">' + insightLines[i].replace(/^[-•*#\d.]\s*/,'') + '</p>'
    + '</div>';
}
if (!insightBlocks) {
  insightBlocks = '<div style="border-left:3px solid #7B3FC4;padding:0 0 0 14px;"><p style="font-size:13px;color:#888;margin:0;">AI analysis will appear here each morning.</p></div>';
}

// ============================================================
// HEADLINES
// ============================================================
const headlinesToShow = allFiltered.slice(0, 6);
let headlineRows = '';
if (headlinesToShow.length === 0) {
  headlineRows = '<tr><td style="padding:14px 0;font-size:13px;color:#AAAAAA;">No market-moving headlines today.</td></tr>';
} else {
  for (let i = 0; i < headlinesToShow.length; i++) {
    const a          = headlinesToShow[i];
    const isBreaking = breakingNews.some(b => b.title === a.title);
    const breakingTag = isBreaking
      ? '<span style="background:#CC2200;color:#FFF;font-size:9px;font-weight:700;padding:2px 7px;border-radius:3px;letter-spacing:1px;margin-right:8px;">BREAKING</span>'
      : '';
    const borderBottom = (i < headlinesToShow.length - 1) ? 'border-bottom:1px solid #F2F2F2;' : '';
    let timeStr = '';
    try { timeStr = new Date(a.pubDate).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); } catch(e){}
    headlineRows += '<tr><td style="padding:12px 0;' + borderBottom + '">'
      + breakingTag
      + '<a href="' + (a.link||'#') + '" style="font-size:13px;font-weight:600;color:#111;text-decoration:none;line-height:1.5;">' + a.title + '</a>'
      + '<br><span style="font-size:11px;color:#AAAAAA;">' + a.source + ' · ' + timeStr + '</span>'
      + '</td></tr>';
  }
}

// ============================================================
// CATEGORY BLOCKS
// ============================================================
function makeSectionBlock(key, label, color, bgColor, watchPairs) {
  const items = (buckets[key] || []).slice(0, 3);
  if (items.length === 0) return '';
  const dynamicHeadline = items[0].title.length > 90 ? items[0].title.substring(0,87) + '...' : items[0].title;
  let bulletHtml = '';
  for (let i = 1; i < items.length; i++) {
    const a = items[i];
    bulletHtml += '<tr><td style="padding:5px 0;">'
      + '<table cellpadding="0" cellspacing="0" border="0"><tr>'
      + '<td width="10" valign="top" style="padding-top:5px;"><div style="width:4px;height:4px;background:' + color + ';border-radius:50%;"></div></td>'
      + '<td style="padding-left:8px;"><a href="' + (a.link||'#') + '" style="font-size:12px;color:#555;text-decoration:none;line-height:1.55;">' + a.title + '</a></td>'
      + '</tr></table>'
      + '</td></tr>';
  }
  return '<div style="border-left:3px solid ' + color + ';padding-left:14px;margin-bottom:22px;">'
    + '<span style="font-size:10px;font-weight:700;color:' + color + ';letter-spacing:2px;text-transform:uppercase;">' + label + '</span>'
    + '<p style="font-size:14px;font-weight:600;color:#111;margin:5px 0 8px;line-height:1.4;">' + dynamicHeadline + '</p>'
    + (bulletHtml ? '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">' + bulletHtml + '</table>' : '')
    + '<div style="background:' + bgColor + ';border-left:2px solid ' + color + ';padding:7px 10px;margin-top:6px;">'
    + '<span style="font-size:11px;font-weight:700;color:' + color + ';letter-spacing:1px;text-transform:uppercase;">Watch: </span>'
    + '<span style="font-size:11px;color:#666;">' + watchPairs + '</span>'
    + '</div>'
    + '</div>';
}

const trumpBlock = makeSectionBlock('trump',           'US Policy',         '#CC2200', '#FFF5F5', 'USD/CAD · USD/MXN · DXY');
const geoBlock   = makeSectionBlock('geopolitics',     'Geopolitics',       '#1A8A42', '#F2FBF5', 'XAU/USD · USD/JPY · USD/CHF');
const fedBlock   = makeSectionBlock('fed_rates',       'Fed & Rates',       '#1A6FC4', '#F4F8FF', 'DXY · EUR/USD · AUD/USD');
const goldBlock  = makeSectionBlock('gold_commodities','Gold & Commodities','#C8860A', '#FFFBF0', 'XAU/USD · WTI · XAG/USD');
const fxBlock    = makeSectionBlock('usd_forex',       'Forex & Markets',   '#7B3FC4', '#F8F5FF', 'EUR/USD · GBP/USD · USD/JPY');

const allSectionBlocks = [trumpBlock, geoBlock, fedBlock, goldBlock, fxBlock]
  .filter(b => b !== '')
  .join('');

// ============================================================
// BUILD EMAIL PER SUBSCRIBER
// ============================================================
const outputItems = [];

for (let s = 0; s < allSubscribers.length; s++) {
  const userData  = allSubscribers[s];
  const firstName = userData['First Name'] || userData.firstName || userData.first_name || userData.name || 'Trader';
  const lastName  = userData['Last Name']  || userData.lastName  || userData.last_name  || '';
  const userEmail = userData.email || userData.Email || userData.EMAIL || userData['Email Address'] || '';

  if (!userEmail || !userEmail.includes('@')) continue;

  const heroSubline = buildHeroSubline();

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
    + '<span style="font-size:10px;color:#5A8AC0;letter-spacing:2px;text-transform:uppercase;">'
    + (highImpactEvents.length > 0
        ? highImpactEvents.length + ' USD high-impact event' + (highImpactEvents.length > 1 ? 's' : '') + ' today'
        : 'Daily market briefing')
    + '</span></div>'
    + '<h1 style="font-family:Barlow Condensed,sans-serif;font-size:28px;font-weight:700;line-height:1.2;margin:0 0 10px;color:#E8EFF8;">'
    + subject.replace(' | ' + dateShort, '')
    + '</h1>'
    + '<p style="font-size:13px;color:#5A8AC0;line-height:1.6;margin:0 0 22px;max-width:440px;">' + heroSubline + '</p>'
    + '<div>'
    + '<a href="#" style="display:inline-block;background:#D4A017;color:#07162A;font-size:12px;font-weight:700;padding:10px 22px;border-radius:6px;text-decoration:none;margin-right:10px;">Open dashboard</a>'
    + '<a href="#" style="display:inline-block;background:transparent;border:1px solid #2A4A6C;color:#7AAAD8;font-size:12px;padding:10px 16px;border-radius:6px;text-decoration:none;">View in browser</a>'
    + '</div>'
    + '</td></tr>'

    // GREETING
    + '<tr><td style="background:#FFFFFF;padding:22px 28px 16px;border-bottom:1px solid #F0F0F0;">'
    + '<p style="font-size:14px;color:#111;margin:0 0 6px;">Good morning, <strong>' + firstName + '</strong>.</p>'
    + '<p style="font-size:13px;color:#555;line-height:1.65;margin:0;">The market opens in a few hours. Here\'s everything you need before price moves.</p>'
    + '</td></tr>'

    // BANK HOLIDAYS
    + (holidayStrip ? '<tr><td style="background:#FFFFFF;padding:16px 28px 0;">' + holidayStrip + '</td></tr>' : '')

    // NUMBERS TO WATCH
    + '<tr><td style="background:#FFFFFF;padding:20px 28px 0;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#CC2200;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">Numbers to watch</span>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:12px;">'
    + '<tr style="border-bottom:2px solid #EEE;">'
    + '<th style="padding:7px 12px 7px 0;font-size:11px;font-weight:600;color:#999;text-align:left;">Event</th>'
    + '<th style="padding:7px 8px;font-size:11px;font-weight:600;color:#999;text-align:right;">Prev</th>'
    + '<th style="padding:7px 8px;font-size:11px;font-weight:600;color:#999;text-align:right;">Fcst</th>'
    + '<th style="padding:7px 0 7px 8px;font-size:11px;font-weight:600;color:#999;text-align:right;">Actual</th>'
    + '</tr>'
    + numbersRows
    + '</table>'
    + '<div style="height:1px;background:#EEE;margin:6px 0 22px;"></div>'
    + '</td></tr>'

    // RELEASED TODAY — new section
    + actualsSection

    // ECONOMIC CALENDAR
    + '<tr><td style="background:#FFFFFF;padding:0 28px 0;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#1A6FC4;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">Economic calendar</span>'
    + '<p style="font-size:11px;color:#AAAAAA;margin:6px 0 12px;">USD · EUR · GBP · JPY · CAD · NZD · AUD · CHF &nbsp;|&nbsp; Times in WAT (UTC+1)</p>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #EBEBEB;border-radius:6px;overflow:hidden;margin-bottom:22px;">'
    + '<tr style="background:#111;">'
    + '<th style="padding:8px 12px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Time</th>'
    + '<th style="padding:8px 6px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Imp</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">CCY</th>'
    + '<th style="padding:8px 12px;font-size:10px;font-weight:600;color:#AAA;text-align:left;letter-spacing:1px;text-transform:uppercase;">Event</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Prev</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Fcst</th>'
    + '<th style="padding:8px 8px;font-size:10px;font-weight:600;color:#AAA;text-align:center;letter-spacing:1px;text-transform:uppercase;">Actual</th>'
    + '</tr>'
    + calRows
    + '</table>'
    + '</td></tr>'

    // EXAI ANTICIPATION
    + '<tr><td style="background:#FFFFFF;padding:0 28px 0;border-top:1px solid #F0F0F0;">'
    + '<div style="margin-top:20px;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#CC2200;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">EXAI Event Anticipation</span>'
    + '</div>'
    + chainStrip
    + '<div style="margin-top:16px;margin-bottom:22px;">' + anticipationBlocks + '</div>'
    + '</td></tr>'

    // WEEK AHEAD
    + (weekAheadStrip ? '<tr><td style="background:#FFFFFF;padding:0 28px 22px;border-top:1px solid #F0F0F0;">' + weekAheadStrip + '</td></tr>' : '')

    // AI ANALYSIS
    + '<tr><td style="background:#FFFFFF;padding:0 28px 0;border-top:1px solid #F0F0F0;">'
    + '<div style="margin-top:20px;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#7B3FC4;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">EXAI Analysis</span>'
    + '</div>'
    + '<div style="margin-top:16px;margin-bottom:22px;">' + insightBlocks + '</div>'
    + '</td></tr>'

    // HEADLINES
    + '<tr><td style="background:#FFFFFF;padding:0 28px 0;border-top:1px solid #F0F0F0;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;margin-bottom:14px;"><tr>'
    + '<td><div style="display:inline-block;width:3px;height:16px;background:#1A8A42;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">Market Headlines</span></td>'
    + '<td align="right"><span style="background:#CC2200;color:#FFF;font-size:9px;font-weight:700;padding:3px 8px;border-radius:3px;letter-spacing:1px;">LIVE</span></td>'
    + '</tr></table>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0">' + headlineRows + '</table>'
    + '<div style="height:1px;background:#EEE;margin:10px 0 22px;"></div>'
    + '</td></tr>'

    // CATEGORY SECTIONS
    + '<tr><td style="background:#FFFFFF;padding:0 28px 28px;border-top:1px solid #F0F0F0;">'
    + '<div style="margin-top:20px;">'
    + '<div style="display:inline-block;width:3px;height:16px;background:#C8860A;border-radius:2px;vertical-align:middle;margin-right:8px;"></div>'
    + '<span style="font-size:11px;font-weight:700;color:#777;letter-spacing:2px;text-transform:uppercase;vertical-align:middle;">By Category</span>'
    + '</div>'
    + '<div style="margin-top:18px;">' + allSectionBlocks + '</div>'
    + '</td></tr>'

    // CTA
    + '<tr><td style="background:#07162A;padding:28px 28px;text-align:center;border-top:1px solid #0D2040;">'
    + '<p style="font-size:16px;font-weight:600;color:#E8EFF8;margin:0 0 6px;font-family:Barlow Condensed,sans-serif;letter-spacing:0.5px;">Trade the reaction live</p>'
    + '<p style="font-size:12px;color:#5A8AC0;margin:0 0 18px;line-height:1.6;">Live prices, AI signals and alerts — updated in real time</p>'
    + '<a href="#" style="display:inline-block;background:#D4A017;color:#07162A;font-size:12px;font-weight:700;padding:11px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">Open EXAI Dashboard</a>'
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

module.exports = { formatEmail };
