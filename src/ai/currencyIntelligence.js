/**
 * Currency-commodity/geopolitical correlation map.
 * Used across fundamentals, sentiment, and COT reasoning so EXAI
 * understands cross-asset effects (e.g. oil spike = AUD/CAD/NOK relevant).
 */
const CURRENCY_INTELLIGENCE = {
  USD: { tag: 'Reserve currency', note: 'Moves inverse to gold. Driven by Fed policy and rate expectations.' },
  AUD: { tag: 'Gold & iron ore exporter', note: 'Tied to China trade demand and gold prices.' },
  CAD: { tag: 'Oil exporter', note: 'Moves with crude oil prices.' },
  NZD: { tag: 'Agriculture exporter', note: 'Dairy-linked, trades as a risk-on/risk-off currency.' },
  JPY: { tag: 'Safe haven', note: 'Strengthens in global fear, weakens in risk-on periods.' },
  CHF: { tag: 'Safe haven', note: 'Moves alongside gold in risk-off periods.' },
  NOK: { tag: 'Oil exporter', note: 'Norway - moves with crude oil prices.' },
  GBP: { tag: 'Rate-driven', note: 'Less commodity-linked, moves mostly on UK rates and economic data.' },
  EUR: { tag: 'Energy-import dependent', note: 'Sensitive to European energy prices.' },
};

function getCurrencyIntel(currency) {
  return CURRENCY_INTELLIGENCE[(currency || '').toUpperCase()] || { tag: '', note: '' };
}

/**
 * Formats a single COT entry into one clear, direct line.
 * e.g. "EUR/USD: institutions net long, leaning bullish."
 */
function formatCotLine(cotEntry) {
  if (!cotEntry) return null;
  const instrument = cotEntry.instrument || cotEntry.pair || 'Unknown';
  const netLong = cotEntry.netLong || 0;
  const direction = netLong > 0 ? 'net long' : netLong < 0 ? 'net short' : 'balanced';
  const lean = netLong > 0 ? 'leaning bullish' : netLong < 0 ? 'leaning bearish' : 'no clear lean';
  return `${instrument}: institutions ${direction}, ${lean}.`;
}

function formatAllCotLines(cotData = []) {
  return cotData.map(formatCotLine).filter(Boolean);
}

module.exports = { CURRENCY_INTELLIGENCE, getCurrencyIntel, formatCotLine, formatAllCotLines };
