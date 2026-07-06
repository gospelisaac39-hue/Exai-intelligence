// ============================================================
// EXAI PARSE EVENTS
// Calendar : ALL events (high + medium + bank holidays)
// Anticipation : USD high impact only
// Gold flag : USD, JPY, CHF, EUR, GBP, CNY, AUD
// Oil flag  : USD, CAD, CNY, NOK + OPEC/EIA keywords
// Chain     : PPI → CPI → Retail → PMI → NFP → Rates
// ============================================================

function parseEvents(rawEvents) {
  console.log('=== EXAI PARSE EVENTS START ===');
  let events = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.events || rawEvents?.data || rawEvents?.items || []);

  console.log('Total events received:', events.length);

const now        = new Date();

// IMPORTANT: "today" must be computed in WAT (Africa/Lagos), not the
// server's local timezone. Railway/most hosts run containers in UTC,
// and WAT is UTC+1 — close enough that this bug stays hidden most of
// the day, but any event falling in that ~1hr seam near midnight WAT
// gets silently misclassified (shows in the wrong day, or vanishes
// from both today's calendar AND the week-ahead view). We derive the
// WAT calendar date by formatting `now` in en-CA (yields YYYY-MM-DD)
// under the Africa/Lagos timezone, which sidesteps locale/DST quirks
// that toLocaleString('en-US') string-parsing can introduce.
const WAT_TZ = 'Africa/Lagos';
function getWatDateKey(date) {
  // en-CA formats as YYYY-MM-DD, which is what we want as a comparable key
  return date.toLocaleDateString('en-CA', { timeZone: WAT_TZ });
}
const todayWatKey = getWatDateKey(now);

// ============================================================
// GOLD / OIL FLAGS
// ============================================================
const GOLD_CURRENCIES = ['USD','JPY','CHF','EUR','GBP','CNY','AUD'];
const OIL_CURRENCIES  = ['USD','CAD','CNY','NOK'];
const OIL_KEYWORDS    = ['opec','crude','oil','inventory','eia','petroleum','brent','wti'];

function isGoldRelevant(currency) {
  return GOLD_CURRENCIES.includes(currency);
}
function isOilRelevant(currency, title) {
  const t = (title || '').toLowerCase();
  return OIL_CURRENCIES.includes(currency) || OIL_KEYWORDS.some(k => t.includes(k));
}

// ============================================================
// CLASSIFY IMPACT
// FF sends: "High", "Medium", "Low", "Holiday", "Non-Economic"
// ============================================================
function classifyImpact(raw) {
  const r = (raw || '').toLowerCase().trim();
  if (r === 'high')                            return 'high';
  if (r === 'medium' || r === 'med')           return 'medium';
  if (r === 'holiday' || r === 'non-economic') return 'holiday';
  return 'low';
}

// ============================================================
// CLEAN ACTUAL VALUE
// FF returns "" for unreleased, or "1.8%" or "1.8" for released
// ============================================================
function cleanActual(val) {
  if (val === undefined || val === null) return 'Pending';
  const s = val.toString().trim();
  if (s === '' || s === 'null' || s === 'undefined') return 'Pending';
  return s;
}

function cleanValue(val) {
  if (val === undefined || val === null) return 'N/A';
  const s = val.toString().trim();
  if (s === '' || s === 'null' || s === 'undefined') return 'N/A';
  return s;
}

// ============================================================
// CHAIN POSITION
// ============================================================
function getChainPosition(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('ppi'))
    return { step: 1, label: 'Step 1 — PPI feeds next month\'s CPI' };
  if (t.includes('cpi') || (t.includes('inflation') && !t.includes('ppi')))
    return { step: 2, label: 'Step 2 — CPI: cross-check last month\'s PPI' };
  if (t.includes('pce'))
    return { step: 2, label: 'Step 2 variant — PCE: Fed\'s preferred inflation gauge' };
  if (t.includes('retail'))
    return { step: 3, label: 'Step 3 — Retail Sales: determined by PPI+CPI outcomes' };
  if (t.includes('pmi') || t.includes('ism'))
    return { step: 4, label: 'Step 4 — PMI: above 50 expansion, below 50 contraction' };
  if (t.includes('non-farm') || t.includes('nfp') || t.includes('adp') || t.includes('jolts'))
    return { step: 5, label: 'Step 5 — Jobs data: feeds Fed rate decision' };
  if (t.includes('interest rate') || t.includes('fomc') || t.includes('federal fund'))
    return { step: 6, label: 'Step 6 — Rate Decision: final link in the chain' };
  return null;
}

// ============================================================
// PAIRS TO WATCH
// ============================================================
function getPairs(currency, title) {
  const t = (title || '').toLowerCase();
  const map = {
    'USD': ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'DXY'],
    'EUR': ['EUR/USD', 'EUR/GBP', 'EUR/JPY'],
    'GBP': ['GBP/USD', 'EUR/GBP', 'GBP/JPY'],
    'JPY': ['USD/JPY', 'EUR/JPY', 'GBP/JPY'],
    'CAD': ['USD/CAD', 'CAD/JPY'],
    'AUD': ['AUD/USD', 'AUD/JPY', 'AUD/NZD'],
    'NZD': ['NZD/USD', 'NZD/JPY'],
    'CHF': ['USD/CHF', 'EUR/CHF'],
    'CNY': ['AUD/USD', 'NZD/USD']
  };
  const isKeyGoldEvent = t.includes('nfp') || t.includes('non-farm') ||
                         t.includes('fomc') || t.includes('interest rate') ||
                         t.includes('cpi')  || t.includes('ppi');
  const base = map[currency] || [currency + ' pairs'];
  if (isKeyGoldEvent && currency === 'USD') {
    return [...new Set([...base, 'XAU/USD'])];
  }
  return base;
}

// ============================================================
// MARKET ANTICIPATION — USD HIGH IMPACT ONLY
// ============================================================
function getAnticipation(event) {
  const title      = (event.title    || '').toLowerCase();
  const forecastRaw = cleanValue(event.forecast);
  const previousRaw = cleanValue(event.previous);
  const forecast    = parseFloat(forecastRaw);
  const previous    = parseFloat(previousRaw);
  const canCompare  = !isNaN(forecast) && !isNaN(previous);

  const isRateDecision = title.includes('interest rate') || title.includes('fomc') ||
                         title.includes('rate decision')  || title.includes('federal fund');
  const isNFP          = title.includes('non-farm') || title.includes('nfp');
  const isJobsPreview  = title.includes('adp') || title.includes('jolts');
  const isCPI          = title.includes('cpi') || (title.includes('inflation') && !title.includes('ppi'));
  const isPPI          = title.includes('ppi');
  const isPCE          = title.includes('pce');
  const isPMI          = title.includes('pmi') || title.includes('ism');
  const isRetail       = title.includes('retail');
  const isGDP          = title.includes('gdp');
  const isUnemployment = title.includes('unemployment') || title.includes('jobless');
  const isFlashPMI     = title.includes('flash');

  const noSurprise = 'If Actual = Forecast → no surprise → sell the rumour, buy the news. Institutions reverse the pre-release direction.';

  let anticipation = '';
  let bullCase     = '';
  let bearCase     = '';

  if (isRateDecision) {
    bullCase = 'Rate hold when cut was expected → Dollar pumps. Gold sells.';
    bearCase = 'Rate cut larger than expected → Dollar dumps. Gold buys strongly.';
    if (!canCompare) {
      anticipation = `Fed rate decision. If Actual matches Forecast — no surprise — institutions buy the Dollar back after selling the rumour. Powell press conference drives market MORE than the decision itself.`;
    } else if (forecast < previous) {
      anticipation = `Rate cut expected (${previousRaw} → ${forecastRaw}). Dollar has been selling ahead — sell the rumour phase. If cut delivered exactly as forecast — institutions BUY Dollar back. Only a bigger-than-expected cut drives genuine USD weakness.`;
    } else if (forecast > previous) {
      anticipation = `Rate hike expected (${previousRaw} → ${forecastRaw}). Dollar bid ahead of release. If hike matches forecast — sell the rumour done, watch for reversal.`;
    } else {
      anticipation = `Rate hold expected at ${forecastRaw}. If held as expected — sell the rumour done — institutions buy the news. USD may recover. Watch Powell press conference.`;
    }

  } else if (isNFP) {
    bullCase = 'Actual > Forecast → Dollar pumps. Gold sells temporarily.';
    bearCase = 'Actual < Forecast → Dollar tanks. Gold buys into sustained bull run. Fed cut confirmed.';
    if (!canCompare) {
      anticipation = `NFP — most volatile USD monthly event. A miss confirms Fed will cut rates → Gold enters sustained bull run. USD/JPY dumps simultaneously.`;
    } else if (forecast > previous) {
      anticipation = `NFP forecast (${forecastRaw}) above previous (${previousRaw}). Strong jobs expected — Dollar positive bias. Beat → Dollar pumps, Gold sells. Miss → Dollar tanks, Gold buys — Fed cut confirmed.`;
    } else {
      anticipation = `NFP forecast (${forecastRaw}) below previous (${previousRaw}). Weak jobs expected — Dollar under pressure. Miss confirms Fed must cut → Gold sustained bull run. USD/JPY and Gold both move as risk-off safe havens.`;
    }

  } else if (isJobsPreview) {
    bullCase = 'Beats forecast → positive NFP preview → Dollar slightly up.';
    bearCase = 'Misses forecast → negative NFP preview → increases probability of NFP miss.';
    if (!canCompare) {
      anticipation = `Jobs data — directional preview for Friday NFP. A big miss increases probability of NFP miss and Fed cut narrative.`;
    } else if (forecast > previous) {
      anticipation = `Forecast (${forecastRaw}) above previous (${previousRaw}). Positive NFP preview — Dollar slight positive bias.`;
    } else {
      anticipation = `Forecast (${forecastRaw}) below previous (${previousRaw}). Negative NFP preview — watch for Dollar weakness and Gold buying Friday.`;
    }

  } else if (isCPI) {
    bullCase = 'Actual > Forecast → Hot inflation → Dollar up. Gold dips short term.';
    bearCase = 'Actual < Forecast → Cooling inflation → Rate cut bets rise → Dollar weakens → Gold buys.';
    const isCore = title.includes('core');
    if (!canCompare) {
      anticipation = `${isCore ? 'Core CPI' : 'CPI'} release. Check last month's PPI first. PPI rising + CPI beats → HIGH INFLATION confirmed → Dollar strong. PPI rose but CPI misses → inflation controlled → Dollar weakens, Gold buys.`;
    } else if (forecast > previous) {
      anticipation = `${isCore ? 'Core CPI' : 'CPI'} forecast (${forecastRaw}) above previous (${previousRaw}). Rising inflation expected — Dollar positive bias. Cross-check last month's PPI for chain confirmation.`;
    } else {
      anticipation = `${isCore ? 'Core CPI' : 'CPI'} forecast (${forecastRaw}) below previous (${previousRaw}). Cooling inflation expected — Dollar negative bias. Rate cut expectations rise → Dollar weakens, Gold buys.`;
    }

  } else if (isPPI) {
    bullCase = 'Actual > Forecast → Producer costs rising → Dollar up. CPI likely to follow next month.';
    bearCase = 'Actual < Forecast → Producer costs easing → Dollar softens. CPI may cool next month.';
    if (!canCompare) {
      anticipation = `PPI — Step 1 of the chain. This reading feeds next month's CPI direction. Higher than forecast → Dollar up. Gold may dip slightly — momentum gathering, not reversal.`;
    } else if (forecast > previous) {
      anticipation = `PPI forecast (${forecastRaw}) above previous (${previousRaw}). Producer costs rising — signals CPI will likely follow next month. Dollar positive bias.`;
    } else {
      anticipation = `PPI forecast (${forecastRaw}) below previous (${previousRaw}). Producer cost pressures easing — CPI may cool next month. Dollar may soften.`;
    }

  } else if (isPCE) {
    bullCase = 'Actual > Forecast → Fed\'s gauge running hot → Dollar up. Rate cut timeline pushed back.';
    bearCase = 'Actual < Forecast → Gauge cooling → Rate cut probability rises → Dollar down → Gold buys.';
    if (!canCompare) {
      anticipation = `PCE — Fed's preferred inflation measure. A surprise here directly affects the rate decision timeline.`;
    } else if (forecast > previous) {
      anticipation = `PCE forecast (${forecastRaw}) above previous (${previousRaw}). Fed's gauge running hot — Dollar positive bias. Rate cut timeline may be pushed back.`;
    } else {
      anticipation = `PCE forecast (${forecastRaw}) below previous (${previousRaw}). Gauge cooling — rate cut probability rises → Dollar weakens → Gold buys.`;
    }

  } else if (isPMI) {
    const fcLabel = !isNaN(forecast)
      ? (forecast >= 50 ? `${forecastRaw} — above 50 (expansion)` : `${forecastRaw} — below 50 (contraction)`)
      : 'pending';
    const isManuf = title.includes('manufacturing') || title.includes('ism');
    bullCase = `Actual > 50 and beats Forecast → Economy expanding → Dollar up.${isManuf ? ' ISM Manufacturing carries more weight than ISM Services.' : ''}`;
    bearCase = 'Actual < 50 or misses Forecast → Contraction → Dollar down. Below 48 = recession fear.';
    if (isFlashPMI) {
      anticipation = `Flash PMI — PRE-RELEASE estimate only. Shows expectations, not confirmed data.${title.includes('german') ? ' German Flash PMI below 50 affects both EUR and GBP.' : ''}`;
    } else if (!canCompare) {
      anticipation = `PMI release. Above 50 = expansion → Dollar up. Below 50 = contraction → Dollar down. Below 48 = recession fear.`;
    } else if (forecast > previous) {
      anticipation = `PMI forecast ${fcLabel}, above previous (${previousRaw}). Business conditions improving — Dollar positive bias.`;
    } else {
      anticipation = `PMI forecast ${fcLabel}, below previous (${previousRaw}). Business conditions weakening — Dollar under pressure.`;
    }

  } else if (isRetail) {
    bullCase = 'Actual > Forecast → Consumer spending strong → Dollar up.';
    bearCase = 'Actual < Forecast → Consumer spending weak → Dollar down.';
    if (!canCompare) {
      anticipation = `Retail Sales — Step 3 of the chain. High PPI+CPI = consumers priced out → miss likely. Controlled inflation → beat likely.`;
    } else if (forecast > previous) {
      anticipation = `Retail Sales forecast (${forecastRaw}) above previous (${previousRaw}). Consumer spending picking up — Dollar positive bias.`;
    } else {
      anticipation = `Retail Sales forecast (${forecastRaw}) below previous (${previousRaw}). Consumer spending slowing — Dollar negative bias.`;
    }

  } else if (isGDP) {
    bullCase = 'Actual > Forecast → Economy growing → Dollar up.';
    bearCase = 'Actual < Forecast → Slowdown → Dollar down. Negative print = recession risk = Gold, JPY, CHF bid.';
    if (!canCompare) {
      anticipation = `GDP release. Beat → Dollar up. Miss → Dollar down. Negative print = recession fear → safe havens (Gold, JPY, CHF) bid aggressively.`;
    } else if (forecast > previous) {
      anticipation = `GDP forecast (${forecastRaw}) above previous (${previousRaw}). Economy expected to grow — Dollar positive bias.`;
    } else {
      anticipation = `GDP forecast (${forecastRaw}) below previous (${previousRaw}). Growth slowing — Dollar negative bias. Negative print = recession narrative → Gold, JPY, CHF bid.`;
    }

  } else if (isUnemployment) {
    bullCase = 'Actual < Forecast → Fewer unemployed → Dollar up.';
    bearCase = 'Actual > Forecast → More unemployed → Dollar down. Raises Fed cut expectations.';
    if (!canCompare) {
      anticipation = `Unemployment release. Lower than forecast → Dollar up. Higher → Dollar down. Cross-reference with NFP for full picture.`;
    } else if (forecast < previous) {
      anticipation = `Unemployment forecast (${forecastRaw}) below previous (${previousRaw}). Labour market improving — Dollar positive bias.`;
    } else {
      anticipation = `Unemployment forecast (${forecastRaw}) above previous (${previousRaw}). More jobless expected — Dollar negative bias. If both NFP and unemployment miss → Fed cut confirmed → Gold buys.`;
    }

  } else {
    bullCase = 'Actual > Forecast → USD positive.';
    bearCase = 'Actual < Forecast → USD negative.';
    if (!canCompare) {
      anticipation = `USD high impact event. Monitor Actual vs Forecast on release for direction.`;
    } else if (forecast > previous) {
      anticipation = `Forecast (${forecastRaw}) above previous (${previousRaw}). USD has positive bias ahead of release.`;
    } else if (forecast < previous) {
      anticipation = `Forecast (${forecastRaw}) below previous (${previousRaw}). USD has negative bias ahead of release.`;
    } else {
      anticipation = `Forecast matches previous (${previousRaw}). No directional bias — Actual vs Forecast will set direction.`;
    }
  }

  return { anticipation, bullCase, bearCase, noSurprise };
}

// ============================================================
// PROCESS ALL EVENTS
// ============================================================
const allTodayEvents = [];
const weekAhead      = [];
const bankHolidays   = [];
// Full-week calendar for the Monday week-ahead email: every future
// high/medium impact event, any currency (not just USD). Holidays are
// handled separately via bankHolidays/bankHolidaysWeek below.
const weekCalendarAll = [];

events.forEach(event => {
  if (!event || !event.date) return;

  const d        = new Date(event.date);
  const impact   = classifyImpact(event.impact);
  const currency = (event.country || '').toUpperCase().trim();
  const title    = event.title || '';

  // Strip low impact
  if (impact === 'low') return;

  const isToday = getWatDateKey(d) === todayWatKey;
  const isFuture = d > now && !isToday;

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos'
  });
  const dayLabel = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Africa/Lagos'
  });

  // ── BANK HOLIDAYS ─────────────────────────────────────────
  if (impact === 'holiday') {
    bankHolidays.push({
      day:      isToday ? 'Today' : dayLabel,
      ts:       d.getTime(),
      currency,
      event:    title || 'Bank Holiday',
      isToday,
      note:     'Low volatility expected. Market may stop moving or close early for this currency.'
    });
    return;
  }

  // ── FLAGS ─────────────────────────────────────────────────
  const isUSDHigh    = impact === 'high' && currency === 'USD';
  const goldRelevant = isGoldRelevant(currency);
  const oilRelevant  = isOilRelevant(currency, title);
  const chainPos     = isUSDHigh ? getChainPosition(title) : null;
  const analysis     = isUSDHigh ? getAnticipation(event) : null;
  const pairs        = isUSDHigh ? getPairs(currency, title) : [];

  // ── ACTUAL — handle all FF edge cases ─────────────────────
  const actualRaw = event.actual;
  const actual    = cleanActual(actualRaw);

  // ── FORECAST BIAS ─────────────────────────────────────────
  let forecastBias = null;
  if (isUSDHigh) {
    const f = parseFloat(cleanValue(event.forecast));
    const p = parseFloat(cleanValue(event.previous));
    const t = title.toLowerCase();
    const isDownGood = t.includes('unemployment') || t.includes('jobless') ||
                       t.includes('interest rate') || t.includes('fomc');
    if (!isNaN(f) && !isNaN(p)) {
      if (isDownGood) {
        forecastBias = f < p ? 'bullish' : f > p ? 'bearish' : 'neutral';
      } else {
        forecastBias = f > p ? 'bullish' : f < p ? 'bearish' : 'neutral';
      }
    } else {
      forecastBias = 'neutral';
    }
  }

  const entry = {
    day:           isToday ? 'Today' : dayLabel,
    time:          timeStr,
    ts:            d.getTime(),
    currency,
    event:         title || 'Unknown',
    impact,
    // ── CLEAN ALL THREE DATA FIELDS ──────────────────────
    forecast:      cleanValue(event.forecast),
    previous:      cleanValue(event.previous),
    actual,
    // ── FLAGS ─────────────────────────────────────────────
    goldRelevant,
    oilRelevant,
    isUSDHigh,
    chainPosition: chainPos ? chainPos.label : null,
    chainStep:     chainPos ? chainPos.step  : null,
    pairs,
    forecastBias,
    anticipation:  isUSDHigh ? analysis.anticipation : null,
    bullCase:      isUSDHigh ? analysis.bullCase      : null,
    bearCase:      isUSDHigh ? analysis.bearCase      : null,
    noSurprise:    isUSDHigh ? analysis.noSurprise    : null,
  };

  if (isToday)                    allTodayEvents.push(entry);
  else if (isFuture && isUSDHigh) weekAhead.push(entry);

  // Week-ahead calendar (Monday email): every future high/medium event,
  // any currency. Today's events are excluded — they belong to today's
  // briefing, not the week-ahead view.
  if (isFuture && (impact === 'high' || impact === 'medium')) {
    weekCalendarAll.push(entry);
  }
});

// Sort by time
allTodayEvents.sort((a, b) => a.time.localeCompare(b.time));
weekAhead.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
weekCalendarAll.sort((a, b) => a.ts - b.ts);

// ============================================================
// GROUP WEEK CALENDAR BY DAY (for the Monday week-ahead email)
// Merges high/medium events AND holiday-only days into a single
// chronologically ordered array of { day, ts, events: [...], holidays: [...] }
// so the email template can render one day at a time without
// re-sorting or worrying about days that only have a holiday.
// ============================================================
function groupWeekByDay(events, holidays) {
  const map = {}; // day label -> { day, ts, events: [], holidays: [] }

  events.forEach((e) => {
    if (!map[e.day]) map[e.day] = { day: e.day, ts: e.ts, events: [], holidays: [] };
    map[e.day].events.push(e);
  });

  holidays.forEach((h) => {
    if (h.isToday) return; // today's holidays belong to the daily email, not week-ahead
    if (!map[h.day]) map[h.day] = { day: h.day, ts: h.ts, events: [], holidays: [] };
    map[h.day].holidays.push(h);
  });

  return Object.values(map).sort((a, b) => a.ts - b.ts);
}

const weekCalendarByDay = groupWeekByDay(weekCalendarAll, bankHolidays);

// ============================================================
// SPLIT TODAY
// ============================================================
const highImpactEvents   = allTodayEvents.filter(e => e.impact === 'high' && e.currency === 'USD');
const mediumImpactEvents = allTodayEvents.filter(e => e.impact === 'medium');

// ============================================================
// CHAIN CONTEXT TODAY
// ============================================================
function buildChainContext(events) {
  const steps  = [];
  const titles = events.map(e => (e.event || '').toLowerCase()).join(' ');
  if (titles.includes('ppi'))
    steps.push('⚙️ Step 1 active — PPI today. Note this reading to judge next month\'s CPI direction.');
  if (titles.includes('cpi') || titles.includes('inflation'))
    steps.push('📊 Step 2 active — CPI today. Cross-check last month\'s PPI. If both rising = HIGH INFLATION confirmed.');
  if (titles.includes('pce'))
    steps.push('📊 Step 2 variant active — PCE today. Fed\'s preferred gauge. Directly affects rate decision timeline.');
  if (titles.includes('retail'))
    steps.push('🛒 Step 3 active — Retail Sales today. Cross-check PPI+CPI context.');
  if (titles.includes('pmi') || titles.includes('ism'))
    steps.push('🏭 Step 4 active — PMI today. Above 50 = expansion. Below 50 = contraction. Below 48 = recession fear.');
  if (titles.includes('non-farm') || titles.includes('nfp') || titles.includes('adp') || titles.includes('jolts'))
    steps.push('💼 Step 5 active — Jobs data today. Miss = Fed cut confirmed = Gold sustained bull run begins.');
  if (titles.includes('interest rate') || titles.includes('fomc') || titles.includes('federal fund'))
    steps.push('🏦 Step 6 active — Rate Decision today. If Actual = Forecast → sell the rumour done → institutions buy the news.');
  return steps;
}

const chainContextToday  = buildChainContext(highImpactEvents);
const currenciesAffected = [...new Set(allTodayEvents.map(e => e.currency).filter(c => c && c !== 'N/A'))];

// ============================================================
// DATE FORMATTING
// ============================================================
const dateFormatted = now.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Lagos'
});
const dayOfWeek = now.toLocaleDateString('en-US', {
  weekday: 'long', timeZone: 'Africa/Lagos'
});
const dateKey = todayWatKey;

console.log(`Calendar: ${allTodayEvents.length} | USD High: ${highImpactEvents.length} | Medium: ${mediumImpactEvents.length} | Week ahead (USD high): ${weekAhead.length} | Week calendar (all, high+med): ${weekCalendarAll.length} | Bank holidays: ${bankHolidays.length}`);
// Log actual status for debugging
allTodayEvents.forEach(e => {
  console.log(`  ${e.currency} | ${e.event} | forecast: ${e.forecast} | previous: ${e.previous} | actual: ${e.actual}`);
});

  return {
    date:               dateKey,
    dateFormatted,
    dayOfWeek,
    totalEvents:        allTodayEvents.length,
    highImpactCount:    highImpactEvents.length,
    mediumImpactCount:  mediumImpactEvents.length,
    lowImpactCount:     0,
    allEvents:          allTodayEvents,
    highImpactEvents,
    mediumImpactEvents,
    lowImpactEvents:    [],
    bankHolidaysToday:  bankHolidays.filter(e => e.isToday),
    bankHolidaysWeek:   bankHolidays.filter(e => !e.isToday),
    weekAnticipation:   weekAhead,
    weekCalendarAll,
    weekCalendarByDay,
    chainContextToday,
    currenciesAffected,
    processedAt:        new Date().toISOString()
  };
}

module.exports = { parseEvents };