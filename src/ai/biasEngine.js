const { callGroqJSON } = require('./groq');
const { ASSET_CATALOG } = require('../assetCatalog');

const BIAS_LEVELS = ['Bearish', 'Slightly Bearish', 'Neutral', 'Slightly Bullish', 'Bullish'];

// Spec Section 10.1 corrections baked directly into the prompt, since
// the underlying reference doc (Market Logic Framework) had these as
// hardcoded rules. This is the analysis engine's rulebook, not a
// per-asset agent — see AUDIT_REPORT.md Section 3 for what was wrong
// before: NFP miss auto-labeled "sustained bull run" with no
// confirmation gate, ISM Manufacturing hardcoded to outweigh Services,
// and the fundamental chain treated as calendar-ordered instead of
// causal.
const RULEBOOK = `Apply these corrected rules — do not use the naive/incorrect versions:
- King Rule polarity: Actual > Forecast is only bullish for NORMAL-polarity indicators (NFP, GDP, Retail Sales, PMI, CPI/PPI in a rate-sensitive regime). For INVERTED indicators (Unemployment Rate, Jobless/Claims, Crude Oil Inventories, Natural Gas Storage) a higher actual is BAD for the currency/asset.
- Fed speakers (Powell etc.) have NO fixed direction. They are volatility events; direction depends on tone versus what's already priced in, not "always dovish" or any other default.
- A single NFP miss is a bullish gold IMPULSE, not automatically a "sustained bull run" — only call it a sustained trend if there are 2+ consecutive soft labor prints or a material shift in rate-cut odds.
- Weight ISM Manufacturing AND Services roughly equally — Services is ~3/4 of the US economy and often moves markets more. Never state Manufacturing "carries more weight."
- The fundamental chain (PPI→CPI→Retail Sales→PMI→NFP→Rate Decision) is CAUSAL, not date-ordered — releases do not arrive in that sequence within a month. Use it to explain WHY, not to assume order.
- FOMC's real "forecast" is market-implied pricing, not the calendar forecast — a delivered cut can be hawkish if the market had priced more.
- Tag confidence "low" for anecdotal/low-reliability calls (e.g. any single politician's economic commentary moving a specific asset) rather than stating them as fact.`;

function buildContextBlock(context) {
  const { highImpactEvents = [], mediumImpactEvents = [], breakingNews = [], cotData = [], fedwatchData = [] } = context;

  const eventsText = [...highImpactEvents, ...mediumImpactEvents]
    .slice(0, 15)
    .map((e) => `- ${e.currency} ${e.event} (${e.impact}): forecast ${e.forecast || 'N/A'}, previous ${e.previous || 'N/A'}, actual ${e.actual || 'Pending'}`)
    .join('\n') || 'No high/medium impact events today.';

  const newsText = breakingNews
    .slice(0, 10)
    .map((a) => `- ${a.title}`)
    .join('\n') || 'No breaking headlines.';

  const cotText = cotData
    .map((c) => `- ${c.label}: net ${c.net >= 0 ? 'long' : 'short'} ${Math.abs(c.net).toLocaleString()}, WoW ${c.changeNetDisplay || 'N/A'} (${c.direction || 'unknown'})`)
    .join('\n') || 'No COT data available.';

  const fedwatchText = fedwatchData
    .map((f) => `- ${f.date}: hold ${f.hold}%, cut ${f.cut}%, hike ${f.hike}%`)
    .join('\n') || 'No FedWatch data available.';

  return `TODAY'S ECONOMIC CALENDAR:\n${eventsText}\n\nBREAKING HEADLINES:\n${newsText}\n\nCOT POSITIONING:\n${cotText}\n\nFED RATE PROBABILITIES:\n${fedwatchText}`;
}

/**
 * Generates a day-bias and swing-bias for every asset in the catalog in
 * ONE batched Groq call (not one call per asset) — keeps this cheap
 * enough to run every 15 minutes without exhausting Groq's rate limits,
 * per spec Section 3's "batch headlines per run" guidance applied to
 * the bias board too.
 */
async function generateBiasBoard(context) {
  const symbols = ASSET_CATALOG.map((a) => `${a.symbol} (${a.label})`).join(', ');
  const contextBlock = buildContextBlock(context);

  const prompt = `You are EXAI's market bias engine. ${RULEBOOK}

${contextBlock}

For EACH of these assets, assign a day-trading bias and a swing-trading bias using ONLY these 5 levels: ${BIAS_LEVELS.join(' | ')}.
Give a reason of 20 words or fewer per asset, grounded in the context above (or general cross-asset logic — e.g. Gold/JPY/CHF react to risk sentiment, Oil reacts to USD/geopolitics, indices react to yields/growth data — even where there's no direct calendar event for that asset today).

ASSETS: ${symbols}

Return ONLY valid JSON in this exact shape:
{
  "assets": [
    { "symbol": "EUR/USD", "dayBias": "Neutral", "swingBias": "Slightly Bullish", "reason": "..." }
  ]
}`;

  try {
    const parsed = await callGroqJSON(prompt);
    const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
    return assets
      .filter((a) => a.symbol)
      .map((a) => ({
        symbol: a.symbol,
        dayBias: BIAS_LEVELS.includes(a.dayBias) ? a.dayBias : 'Neutral',
        swingBias: BIAS_LEVELS.includes(a.swingBias) ? a.swingBias : 'Neutral',
        reason: (a.reason || '').slice(0, 200),
      }));
  } catch (err) {
    console.warn('[BiasEngine] Failed:', err.message);
    return [];
  }
}

module.exports = { generateBiasBoard, BIAS_LEVELS };
