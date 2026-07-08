// ============================================================
// EXAI PREPARE PROMPT v4 — MULTI-AGENT CONTEXT SLICING
// ============================================================
// Returns three agent-specific context objects instead of one mega prompt

function preparePrompt(eventsData, cotNode, fedwatchNode, actualsNode, newsNode) {
  console.log('=== PREPARE PROMPT v4 (MULTI-AGENT) START ===');
  eventsData = eventsData || {};
  cotNode = cotNode || {};
  fedwatchNode = fedwatchNode || {};
  actualsNode = actualsNode || {};
  newsNode = newsNode || {};

const {
  date              = new Date().toISOString().split('T')[0],
  dateFormatted     = '',
  dayOfWeek         = '',
  totalEvents       = 0,
  highImpactCount   = 0,
  mediumImpactCount = 0,
  allEvents         = [],
  highImpactEvents  = [],
  mediumImpactEvents= [],
  currenciesAffected= [],
  chainContextToday = [],
  weekAnticipation  = [],
} = eventsData;

const cotData      = cotNode.cotData      || [];
const cotAvailable = cotNode.cotAvailable || false;

const fedNarrative = fedwatchNode.narrative         || null;
const nextMeeting  = fedwatchNode.nextMeeting       || null;
const allMeetings  = fedwatchNode.allMeetings       || [];
const fedAvailable = fedwatchNode.fedwatchAvailable || false;

// ── PARSE / CLASSIFY HELPERS — the "Exai Indicators" sheet stores raw
// actual/forecast strings (with %, K, M suffixes) and never populates a
// quality/strength/outcome verdict, so we derive it here ─────────────
function parseNumeric(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || /^(pending|n\/a)$/i.test(s)) return null;
  const mult = /k$/i.test(s) ? 1e3 : /m$/i.test(s) ? 1e6 : /b$/i.test(s) ? 1e9 : 1;
  const num = parseFloat(s.replace(/[,%kmb]/gi, ''));
  return Number.isNaN(num) ? null : num * mult;
}

const LOWER_IS_BETTER = /unemployment|jobless|claims|interest rate|fomc/i;

function classifyActual(a) {
  const actual   = parseNumeric(a.actual);
  const forecast = parseNumeric(a.forecast);
  if (actual === null || forecast === null || actual === forecast) {
    return { outcome: 'In Line', quality: 'Neutral', strength: 'Neutral' };
  }
  const lowerIsBetter = LOWER_IS_BETTER.test(a.event || '');
  const beat = lowerIsBetter ? actual < forecast : actual > forecast;
  return {
    outcome:  beat ? 'Beat' : 'Miss',
    quality:  beat ? 'Good Data' : 'Bad Data',
    strength: 'Strong Data',
  };
}

// ── CLEAN ACTUALS — today's releases only, noise stripped ────────────
const rawActualsToday = (actualsNode.actualsData || []).filter(a => a.event_date === date);

const cleanedActuals = rawActualsToday
  .map(a => ({ ...a, event: a.event_name }))
  .filter(a => {
    // Skip events where actual is "0" AND forecast is "0" — these are speeches/non-numeric
    const actualNum   = parseFloat(a.actual);
    const forecastNum = parseFloat(a.forecast);
    if (actualNum === 0 && forecastNum === 0) return false;
    // Skip if actual is literally "0" and previous is also "0" — no data
    if (a.actual === '0' && a.previous === '0') return false;
    // Must have a real currency and a released actual value
    if (!a.currency || a.currency === '') return false;
    if (!a.actual || a.actual === '') return false;
    return true;
  })
  .map(a => ({ ...a, ...classifyActual(a) }));

console.log(`Actuals: ${actualsNode.actualsData?.length || 0} total in sheet | ${rawActualsToday.length} today → ${cleanedActuals.length} clean`);
cleanedActuals.forEach(a =>
  console.log(`  ${a.currency} | ${a.event} | actual: ${a.actual} | outcome: ${a.outcome}`)
);

// ── BUILD ACTUALS BLOCK FOR PROMPT ────────────────────────────
let actualsBlock = '';
if (cleanedActuals.length > 0) {

  // Separate by quality signal
  const beats  = cleanedActuals.filter(a => a.quality === 'Good Data' && a.strength === 'Strong Data');
  const misses = cleanedActuals.filter(a => a.quality === 'Bad Data');
  const inline = cleanedActuals.filter(a => a.quality !== 'Good Data' || a.strength !== 'Strong Data')
                               .filter(a => a.quality !== 'Bad Data');

  const formatActual = (a) =>
    `  • ${a.currency} | ${a.event}: Actual ${a.actual} | Forecast ${a.forecast} | Previous ${a.previous} → ${a.outcome} [${a.strength}]`;

  const sections = [];

  if (beats.length > 0)
    sections.push(`BEATS (Actual better than forecast):\n${beats.map(formatActual).join('\n')}`);
  if (misses.length > 0)
    sections.push(`MISSES (Actual worse than forecast):\n${misses.map(formatActual).join('\n')}`);
  if (inline.length > 0)
    sections.push(`IN LINE / OTHER:\n${inline.map(formatActual).join('\n')}`);

  actualsBlock = `
📋 LAYER 0 — TODAY'S RELEASED ACTUALS (already printed data):
${sections.join('\n\n')}

INSTRUCTION: These events have ALREADY released today. Do NOT speculate about what might happen — instead:
1. State what actually happened and whether it beat, missed, or matched expectations.
2. Explain the immediate market implication of each release.
3. Use the outcome to adjust your forward-looking analysis for events still pending.
4. If a beat/miss changes the FedWatch probability narrative, say so explicitly.
5. Cross-reference with COT positioning — if specs were positioned against the actual outcome, name the forced-unwind risk.`.trim();

} else {
  actualsBlock = `📋 LAYER 0 — ACTUALS: No released data yet today. All events still pending.`;
}

// ── BUILD CALENDAR SUMMARY ────────────────────────────────────
// Merge actuals into calendar events for display
const actualsMap = {};
for (const a of cleanedActuals) {
  const key = `${a.currency}|${a.event}`.toUpperCase();
  actualsMap[key] = a;
}

function getActualForEvent(ev) {
  const key = `${ev.currency}|${ev.event}`.toUpperCase();
  if (actualsMap[key]) return actualsMap[key].actual;
  // Fuzzy: check if event name contains or is contained
  for (const [k, v] of Object.entries(actualsMap)) {
    const evName = ev.event.toUpperCase();
    const acName = v.event.toUpperCase();
    if (evName.includes(acName) || acName.includes(evName)) return v.actual;
  }
  return null;
}

const createEventList = (events) => {
  if (!events || events.length === 0) return 'None scheduled.';
  return events.map(e => {
    const jbActual = getActualForEvent(e);
    const actualStr = (e.actual && e.actual !== 'Pending')
      ? ` | ACTUAL: ${e.actual}`
      : jbActual
        ? ` | ACTUAL: ${jbActual}`
        : '';
    return `• ${e.time} WAT | ${e.currency} | ${e.event}\n  Forecast: ${e.forecast} | Previous: ${e.previous}${actualStr}`;
  }).join('\n');
};

const calendarSummary = [
  `📅 ${dateFormatted}`,
  ``,
  `📊 TODAY'S ECONOMIC CALENDAR:`,
  `• Total Events: ${totalEvents}`,
  `• High Impact: ${highImpactCount}`,
  `• Medium Impact: ${mediumImpactCount}`,
  currenciesAffected.length > 0 ? `\n🌍 CURRENCIES IN FOCUS:\n${currenciesAffected.join(' | ')}` : '',
  highImpactCount > 0 ? `\n🔴 HIGH IMPACT EVENTS (${highImpactCount}):\n${createEventList(highImpactEvents)}` : '',
  mediumImpactCount > 0 ? `\n🟡 MEDIUM IMPACT EVENTS (${mediumImpactCount}):\n${createEventList(mediumImpactEvents.slice(0, 8))}` : '',
].filter(Boolean).join('\n').trim();

// ── LAYER 2: FEDWATCH BLOCK ───────────────────────────────────
let fedwatchBlock = '';
if (fedAvailable && nextMeeting) {
  const upcoming = allMeetings.slice(0, 4).map(m =>
    `  ${m.date}: Cut ${m.cut.toFixed(0)}% | Hold ${m.hold.toFixed(0)}% | Hike ${m.hike.toFixed(0)}%`
  ).join('\n');

  fedwatchBlock = `
📉 LAYER 2 — CME FEDWATCH (live rate probabilities):
${fedNarrative}

Upcoming FOMC meetings:
${upcoming}

INSTRUCTION: Use FedWatch data to explain how much of any expected rate move is already PRICED INTO the market.
- If cut probability is >75%, the Dollar has already sold — a delivered cut may cause a Dollar RALLY (sell-the-rumour, buy-the-news).
- If cut probability is 40-60%, the market is uncertain — the actual print will cause a large directional move.
- Cross-reference with today's released actuals — did any release shift the implied rate path?
Always connect FedWatch probabilities to specific currency pairs in your analysis.`.trim();
} else {
  fedwatchBlock = `📉 LAYER 2 — FEDWATCH: Data unavailable today. Skip rate probability analysis.`;
}

// ── LAYER 3: COT BLOCK ────────────────────────────────────────
let cotBlock = '';
if (cotAvailable && cotData.length > 0) {
  const cotSummaries  = cotData.map(c => c.summary).join('\n');
  const squeezeRisks  = cotData.filter(c => c.squeezeRisk);
  const divergences   = cotData.filter(c => c.diverged);
  const crowdedTrades = cotData.filter(c => c.crowded);

  const signalAlerts = [
    squeezeRisks.length  > 0 ? `⚠️ SQUEEZE RISKS: ${squeezeRisks.map(c => c.label).join(', ')}` : '',
    divergences.length   > 0 ? `⚡ SMART MONEY DIVERGING FROM SPECS: ${divergences.map(c => c.label).join(', ')}` : '',
    crowdedTrades.length > 0 ? `📌 CROWDED TRADES: ${crowdedTrades.map(c => c.label).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  cotBlock = `
📊 LAYER 3 — CFTC COMMITMENT OF TRADERS (institutional positioning):
${cotSummaries}

${signalAlerts ? 'KEY SIGNALS:\n' + signalAlerts : ''}

INSTRUCTION: Use COT data to add a POSITIONING CONTEXT layer. Connect every COT signal to either:
(a) a released actual from Layer 0 — was the actual outcome consistent or against positioning?
(b) a pending event still on today's calendar — what positioning amplifies the move?`.trim();
} else {
  cotBlock = `📊 LAYER 3 — COT: Data unavailable today. Skip positioning analysis.`;
}

// ── CHAIN CONTEXT ─────────────────────────────────────────────
const chainBlock = chainContextToday.length > 0
  ? `\n🔗 FUNDAMENTAL CHAIN CONTEXT:\n${chainContextToday.join('\n')}`
  : '';

// ── ASSEMBLE FULL PROMPT ──────────────────────────────────────
const prompt = `You are EXAI, an elite institutional forex analyst delivering a daily briefing to professional traders.

Today you have access to FOUR intelligence layers. Use ALL four.

${actualsBlock}

────────────────────────────────────────
${calendarSummary}
${chainBlock}

────────────────────────────────────────
${fedwatchBlock}

────────────────────────────────────────
${cotBlock}

────────────────────────────────────────

YOUR ANALYSIS MUST COVER EXACTLY THESE SECTIONS:

1. MARKET SNAPSHOT (2 sentences)
   What has already happened today and what is the current macro tone going into the rest of the session.

2. ACTUALS REACTION (only if Layer 0 has data)
   For each released actual: what printed, did it beat or miss, what was the immediate market implication.
   Cross-reference with COT — if positioning was against the outcome, name the forced-unwind risk.

3. EVENT-BY-EVENT BREAKDOWN (pending events only)
   For each still-pending high-impact event: expected reaction, directional bias, beat vs miss implications.
   If it intersects with a COT crowded trade or divergence, say so explicitly.

4. COT POSITIONING INTELLIGENCE
   Format: "[Pair]: Specs are [bias]. If [catalyst], expect [outcome]. This is a [squeeze/divergence/reversal] setup."

5. FEDWATCH RATE PATH
   Translate cut/hold/hike probabilities into specific trade implications.
   Did any released actual today shift the implied rate path? Name the pairs most exposed.

6. THREE TRADES TO WATCH
   Format: "[Pair] | [Direction] | [Trigger] | [Why this setup has edge]"
   Each setup must combine at least two intelligence layers.

7. RISK FLAGS
   What could invalidate the analysis.

Write in the voice of a senior desk analyst — precise, direct, no hedging. 700-900 words total.
Do NOT use generic phrases like "traders should monitor" or "markets will be watching".
Name the specific pairs, the specific levels, the specific catalysts.`;

console.log(`Prompt v3 built. Actuals: ${cleanedActuals.length} | Calendar: ${highImpactCount} high | FedWatch: ${fedAvailable} | COT: ${cotData.length} instruments`);

  return {
    prompt,
    date,
    dateFormatted,
    dayOfWeek,
    totalEvents,
    highImpactCount,
    mediumImpactCount,
    allEvents,
    highImpactEvents,
    mediumImpactEvents,
    currenciesAffected,
    calendarSummary,
    chainContextToday,
    weekAnticipation,
    cotData,
    fedNextMeeting:   nextMeeting,
    fedNarrative,
    actualsData:      cleanedActuals,
    actualsAvailable: cleanedActuals.length > 0,
    processedAt: new Date().toISOString(),

    // ============================================================
    // MULTI-AGENT CONTEXT SLICES (new format v4)
    // ============================================================
    fundamentalsContext: {
      todayEvents: highImpactEvents.slice(0, 5),
      actuals: cleanedActuals.slice(0, 5),
      chainContext: chainContextToday.join('\n') || ''
    },
    sentimentContext: {
      breaking: (newsNode.breakingNews || []).map(a => a.title).filter(Boolean),
      bullish: [],
      bearish: [],
      summary: newsNode.stats
        ? `${newsNode.stats.matched} forex-relevant articles matched today (${newsNode.stats.breaking} breaking).`
        : ''
    },
    positioningContext: {
      cotData: cotData,
      fedwatch: allMeetings.slice(0, 4).map(m => ({
        month: m.month || '',
        hold: m.hold || 0,
        cut: m.cut || 0
      })),
      history: fedNarrative || ''
    }
  };
}

module.exports = { preparePrompt };
