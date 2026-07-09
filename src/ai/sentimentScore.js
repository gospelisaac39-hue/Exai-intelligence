// Deterministic 0-100 sentiment score — spec Section 4.5 says this is
// "computed by the pipeline," not necessarily another LLM call. Built
// from the already-interpreted news (safe-haven vs risk-asset
// direction, weighted by impact) plus the existing sentiment agent's
// tone when a deep single-instrument run has one available.
// 0-20 Panic Selling · 20-40 Fear · 40-60 Neutral · 60-80 Optimism · 80-100 Speculative Euphoria

const SAFE_HAVENS = new Set(['XAU/USD', 'XAG/USD', 'USD/JPY', 'USD/CHF']);
const RISK_ASSETS = new Set(['US500', 'US100', 'US30', 'BTC/USD', 'ETH/USD', 'SOL/USD']);
const IMPACT_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const THEME_LABELS = {
  trump: 'Trade Policy',
  geopolitics: 'Geopolitics',
  fed_rates: 'Central Banks',
  usd_forex: 'USD & Markets',
  gold_commodities: 'Commodities',
};

function sentimentLabel(score) {
  if (score <= 20) return 'Panic Selling';
  if (score <= 40) return 'Fear';
  if (score <= 60) return 'Neutral';
  if (score <= 80) return 'Optimism';
  return 'Speculative Euphoria';
}

function computeSentimentScore(newsItems, sentimentAgentTone, newsBuckets) {
  let score = 50;
  const factors = [];

  (newsItems || []).forEach((item) => {
    const weight = IMPACT_WEIGHT[item.impact] || 1;
    item.affectedAssets.forEach((a) => {
      if (SAFE_HAVENS.has(a.symbol) && a.direction === 'up') score -= weight;
      if (RISK_ASSETS.has(a.symbol) && a.direction === 'up') score += weight;
      if (RISK_ASSETS.has(a.symbol) && a.direction === 'down') score -= weight;
    });
  });

  const tone = (sentimentAgentTone || '').toLowerCase();
  if (tone.includes('risk-off')) {
    score -= 10;
    factors.push('Sentiment analyst: risk-off tone');
  } else if (tone.includes('risk-on')) {
    score += 10;
    factors.push('Sentiment analyst: risk-on tone');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Dominant theme = whichever news category has the most matched articles
  let dominantTheme = null;
  if (newsBuckets) {
    const [topKey] = Object.entries(newsBuckets).sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0))[0] || [];
    if (topKey && newsBuckets[topKey]?.length > 0) dominantTheme = THEME_LABELS[topKey] || topKey;
  }
  if (dominantTheme) factors.unshift(`Dominant theme: ${dominantTheme}`);

  return {
    score,
    label: sentimentLabel(score),
    dominantTheme,
    factors: factors.slice(0, 2),
  };
}

module.exports = { computeSentimentScore };
