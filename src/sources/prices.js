const axios = require('axios');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Fetches a single symbol's quote + a same-day 15-min close series
 * (for a sparkline) directly from Yahoo Finance's chart endpoint —
 * no API key required. The batch quote endpoint (v7/finance/quote)
 * now requires a cookie/crumb handshake Yahoo tightened; the per-symbol
 * chart endpoint used here doesn't.
 */
async function fetchQuote(yahooSymbol) {
  const { data } = await axios.get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
    { params: { range: '1d', interval: '15m' }, headers: BROWSER_HEADERS, timeout: 10000 }
  );

  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const { meta, indicators } = result;
  const closes = (indicators?.quote?.[0]?.close || []).filter((c) => c !== null);

  return {
    price: meta.regularMarketPrice ?? null,
    previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    sparkline: closes.slice(-24),
  };
}

/**
 * Fetches quotes for every asset in the catalog (or a provided subset),
 * tolerating individual symbol failures so one bad ticker doesn't blank
 * the whole price layer.
 */
async function fetchQuotes(assets) {
  const results = await Promise.all(
    assets.map(async (asset) => {
      try {
        const quote = await fetchQuote(asset.yahoo);
        if (!quote) return null;
        return { symbol: asset.symbol, ...quote };
      } catch (err) {
        console.warn(`[Prices] ${asset.symbol} (${asset.yahoo}) fetch failed:`, err.message);
        return null;
      }
    })
  );

  return results.filter(Boolean);
}

module.exports = { fetchQuote, fetchQuotes };
