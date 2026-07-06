// ============================================================
// EXAI NEWS FILTER v3 — Telegram Only (ported from n8n)
// MIN_SCORE = 1 for geopolitics, 2 for others
// Expanded gate to catch geopolitical market-movers
// ============================================================

function filterAndCategorizeNews(telegramArticles) {
// ============================================================
// EXAI NEWS FILTER v3 — Telegram Only
// MIN_SCORE = 1 for geopolitics, 2 for others
// Expanded gate to catch geopolitical market-movers
// ============================================================

const allRaw = telegramArticles || [];

console.log(`Total raw articles: ${allRaw.length}`);

// ── HARD EXCLUSIONS ───────────────────────────────────────────
const EXCLUDE_KEYWORDS = [
  'celebrity', 'entertainment', 'football', 'cricket', 'tennis',
  'oscar', 'grammy', 'netflix', 'movie', 'film', 'music chart',
  'weather forecast', 'recipe', 'travel tips', 'fashion',
  'obituary', 'university ranking', 'health tip',
  'lifestyle', 'wellness', 'diet', 'fitness', 'horoscope',
  'royal family', 'prince harry', 'meghan',
  'environment award', 'animal', 'wildlife',
  'art exhibition', 'museum', 'book review',
  'job scheme', 'apprenticeship', 'welfare',
  'housing benefit', 'school funding', 'council budget',
  'trade union', 'pay dispute',
  'court ruling', 'criminal', 'fraud case', 'police arrest',
  'tiktok ban', 'instagram', 'facebook outage',
  'crypto scam', 'ponzi', 'nft',
];

// ── FOREX GATE — expanded to catch geopolitical movers ───────
// Any article matching ONE of these is allowed through
const FOREX_GATE = [
  // Direct FX/macro
  'dollar', 'usd', 'fed ', 'federal reserve', 'interest rate', 'rate cut',
  'rate hike', 'rate hold', 'rate decision', 'monetary policy',
  'inflation', 'cpi', 'ppi', 'pce', 'nfp', 'non-farm', 'payroll',
  'fomc', 'powell', 'treasury yield', 'bond yield',
  'gdp', 'recession', 'soft landing',
  'gold price', 'gold rally', 'gold drops', 'gold hits', 'xau', 'bullion',
  'oil price', 'crude oil', 'brent', 'wti', 'opec',
  'euro ', 'eur/usd', 'pound ', 'gbp/usd', 'yen ', 'usd/jpy',
  'dollar index', 'dxy', 'forex', 'fx market', 'currency',
  'central bank', 'ecb', 'boe', 'boj', 'boc', 'rba', 'rbnz',
  'hawkish', 'dovish', 'rate path',
  'tariff', 'trade war', 'trade deal', 'sanctions',
  'wall street', 'nasdaq', 's&p 500', 'dow jones', 'stock market',
  'risk-off', 'risk appetite', 'safe haven',
  'capital flow', 'carry trade', 'yield curve',
  'imf', 'world bank', 'brics', 'de-dollarization',
  'trump tariff', 'trump trade', 'trump signs', 'trump imposes',
  'china economy', 'uk economy', 'us economy', 'eurozone',
  'jackson hole', 'quantitative', 'balance sheet',
  'commodity', 'copper price', 'silver price', 'natural gas',
  'bitcoin price', 'crypto market',
  'petrodollar', 'yuan reserve',
  'strait of hormuz', 'red sea', 'houthi',
  'swift ban', 'financial sanctions', 'oil embargo',
  // ── GEOPOLITICAL MARKET MOVERS — these always affect Gold/Oil/USD
  'nato', 'trump leaving', 'trump threatens', 'trump announces',
  'iran', 'iran war', 'iran nuclear', 'iran strikes',
  'israel', 'gaza', 'middle east war', 'gulf states',
  'russia', 'ukraine', 'kremlin', 'putin',
  'north korea', 'taiwan', 'south china sea',
  'war', 'military strike', 'airstrike', 'escalation',
  'nuclear', 'missile', 'conflict',
  'g7', 'g20', 'world bank', 'debt crisis',
  'trump', 'white house', 'president trump',
];

// ── CATEGORIES ────────────────────────────────────────────────
const CATEGORIES = {

  trump: {
    label: 'Trump & US Policy', emoji: '🇺🇸', color: '#CC2200',
    keywords: [
      'trump tariff', 'trump signs', 'trump imposes', 'trump threatens',
      'trump executive order', 'trump trade', 'trump sanctions',
      'white house trade', 'us tariff', 'american tariff',
      'trade war', 'import tax', 'retaliatory tariff', 'counter-tariff',
      'trade deal', 'trade policy', 'protectionism', 'trade barrier',
      'trump dollar', 'trump fed', 'trump powell', 'trump china',
      'doge spending', 'us budget cut', 'us debt ceiling',
      'section 232', 'section 301', 'wto dispute',
      'trump inflation', 'trump economy', 'trump market',
      'white house announces', 'us imposes', 'trump leaves',
      'trump nato', 'trump says', 'president trump',
    ]
  },

  geopolitics: {
    label: 'Geopolitics & Tensions', emoji: '🌍', color: '#1A8A42',
    keywords: [
      'russia ukraine', 'nato', 'kremlin sanctions',
      'iran nuclear', 'iran sanctions', 'iran oil', 'iran war', 'iran strikes',
      'israel gaza', 'middle east', 'gulf states',
      'south china sea', 'taiwan strait', 'taiwan',
      'north korea missile', 'nuclear threat', 'nuclear',
      'swift ban', 'swift exclusion', 'financial sanctions',
      'us sanctions', 'eu sanctions', 'oil embargo',
      'brics currency', 'brics dollar', 'de-dollarization',
      'yuan reserve', 'petrodollar', 'opec geopolitics',
      'supply chain disruption', 'commodity shock', 'shipping route',
      'strait of hormuz', 'red sea attack', 'houthi',
      'g7 sanctions', 'g20 currency', 'imf emergency',
      'sovereign debt crisis', 'currency war', 'capital controls',
      'political crisis economy', 'government shutdown',
      'war economy', 'military escalation', 'military strike',
      'airstrike', 'conflict market', 'war',
    ]
  },

  fed_rates: {
    label: 'Fed & Central Banks', emoji: '🏦', color: '#1A6FC4',
    keywords: [
      'federal reserve', 'fed rate', 'fomc', 'jerome powell',
      'rate cut', 'rate hike', 'rate hold', 'rate decision',
      'interest rate decision', 'monetary policy',
      'cpi inflation', 'core cpi', 'us inflation', 'pce inflation',
      'non-farm payroll', 'nfp', 'us jobs report', 'unemployment rate',
      'us gdp', 'gdp growth', 'recession risk',
      'ecb rate', 'lagarde', 'bank of england rate', 'boe rate',
      'bank of japan rate', 'boj rate', 'boj intervention',
      'rba rate', 'rbnz rate', 'boc rate', 'snb rate',
      'central bank balance sheet', 'quantitative tightening',
      'treasury yield', '10-year yield', 'yield curve inversion',
      'hawkish', 'dovish', 'fed pivot', 'rate path',
      'fomc minutes', 'fed minutes', 'dot plot',
      'stagflation', 'soft landing', 'hard landing',
      'us retail sales', 'us pmi', 'ism manufacturing', 'ism services',
      'jolts', 'adp employment', 'consumer confidence',
      'jackson hole', 'powell speech', 'fed chair',
    ]
  },

  usd_forex: {
    label: 'USD & Forex Markets', emoji: '📈', color: '#7B3FC4',
    keywords: [
      'dollar index', 'dxy', 'dollar strength', 'dollar weakness',
      'dollar rally', 'dollar drop', 'dollar surge', 'dollar tumbles',
      'dollar weakens', 'dollar strengthens', 'greenback',
      'eur/usd', 'gbp/usd', 'usd/jpy', 'usd/cad', 'usd/chf',
      'aud/usd', 'nzd/usd', 'usd/mxn', 'usd/cnh',
      'forex volatility', 'fx market', 'currency pair',
      'pound sterling rate', 'euro rate', 'yen rate',
      'currency intervention', 'fx intervention', 'boj intervention',
      'safe haven demand', 'risk-off', 'risk appetite',
      's&p 500', 'nasdaq drop', 'dow jones', 'wall street selloff',
      'stock market crash', 'equity selloff', 'market correction',
      'vix spike', 'volatility index', 'market volatility',
      'capital outflow', 'capital inflow', 'carry trade',
      'yield spread', 'bond market', 'us treasury',
      'dollar reserve', 'reserve currency', 'forex reserve',
    ]
  },

  gold_commodities: {
    label: 'Gold & Commodities', emoji: '💰', color: '#C8860A',
    keywords: [
      'gold price', 'gold record', 'gold all-time high', 'gold rally',
      'gold safe haven', 'xau/usd', 'gold central bank', 'gold drops',
      'gold hits', 'gold surges', 'gold falls',
      'silver price', 'silver rally',
      'crude oil price', 'oil rally', 'oil drop', 'brent crude',
      'wti crude', 'opec cut', 'opec output', 'opec meeting',
      'oil supply', 'oil demand', 'energy prices spike',
      'oil surges', 'oil plunges', 'oil rises',
      'natural gas price', 'gas supply',
      'copper price', 'copper demand china',
      'commodity inflation', 'commodity prices surge',
      'bitcoin price', 'crypto market', 'btc rally', 'btc drop',
      'gold inflation hedge', 'bullion demand',
    ]
  }
};

// ── GEOPOLITICAL SINGLE-MATCH CATEGORIES ─────────────────────
// These categories only need 1 keyword match because
// geopolitical events are inherently market-moving
const LOW_THRESHOLD_CATEGORIES = ['geopolitics', 'trump'];

// ── CHECKS ────────────────────────────────────────────────────
function isExcluded(article) {
  const text = (article.title + ' ' + article.description).toLowerCase();
  return EXCLUDE_KEYWORDS.some(kw => text.includes(kw));
}

function passesForexGate(article) {
  const text = (article.title + ' ' + article.description).toLowerCase();
  return FOREX_GATE.some(kw => text.includes(kw));
}

function classify(article) {
  const text = (article.title + ' ' + article.description).toLowerCase();
  const matched = [];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (text.includes(kw)) score++;
    }
    // Geopolitics + Trump only need 1 match — they are always market-moving
    const threshold = LOW_THRESHOLD_CATEGORIES.includes(key) ? 1 : 2;
    if (score >= threshold) matched.push({ key, score });
  }
  return matched;
}

// ── PROCESS ───────────────────────────────────────────────────
const buckets = {
  trump: [], geopolitics: [], fed_rates: [], usd_forex: [], gold_commodities: []
};
let totalMatched = 0;

allRaw.forEach(article => {
  if (isExcluded(article)) return;
  if (!passesForexGate(article)) return;
  const cats = classify(article);
  if (cats.length > 0) {
    totalMatched++;
    cats.forEach(({ key }) => {
      if (buckets[key].length < 8) buckets[key].push(article);
    });
  }
});

// Breaking = forex gate + 2+ categories OR flagged isBreaking from Telegram
const breakingNews = allRaw
  .filter(a =>
    !isExcluded(a) &&
    passesForexGate(a) &&
    (classify(a).length >= 2 || a.isBreaking)
  )
  .slice(0, 6);

// All filtered — deduped
const seen = new Set();
const allFiltered = allRaw
  .filter(a => {
    if (isExcluded(a)) return false;
    if (!passesForexGate(a)) return false;
    if (classify(a).length === 0) return false;
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  })
  .slice(0, 20);

console.log(`Raw: ${allRaw.length} | Passed gate: ${totalMatched} | Breaking: ${breakingNews.length}`);
Object.entries(buckets).forEach(([k, v]) =>
  console.log(`  ${k}: ${v.length} articles`)
);

  return {
    buckets,
    breakingNews,
    allFiltered,
    stats: {
      raw: allRaw.length,
      excluded: allRaw.length - totalMatched,
      matched: totalMatched,
      breaking: breakingNews.length
    }
  };
}

module.exports = { filterAndCategorizeNews };

