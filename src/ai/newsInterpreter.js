const { callGroqJSON } = require('./groq');
const { ASSET_CATALOG } = require('../assetCatalog');

const IMPACT_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];

/**
 * Turns raw filtered headlines into the AI News Feed's structured
 * shape (spec Section 4.2): impact tag, one-line interpretation, and
 * which assets it affects and in which direction. One batched call for
 * up to ~15 headlines rather than one call per headline.
 */
async function interpretNews(articles) {
  const items = (articles || []).slice(0, 15);
  if (items.length === 0) return [];

  const symbols = ASSET_CATALOG.map((a) => a.symbol).join(', ');
  const headlinesText = items.map((a, i) => `${i + 1}. ${a.title}`).join('\n');

  const prompt = `You are EXAI's news interpretation engine. For each headline below, assess its market impact and which of these assets it affects: ${symbols}.

Fed/central bank speakers have NO fixed direction — direction depends on tone versus what's already priced in, never a default like "always dovish." Only tag an asset as affected if there's a real transmission mechanism (e.g. USD news affects Gold/DXY/major pairs; oil news affects CAD/energy names; risk-off headlines affect JPY/CHF/Gold/indices).

HEADLINES:
${headlinesText}

Return ONLY valid JSON in this exact shape:
{
  "items": [
    {
      "headlineIndex": 1,
      "impact": "HIGH",
      "oneLineWhy": "...",
      "affectedAssets": [{ "symbol": "XAU/USD", "direction": "up" }]
    }
  ]
}`;

  try {
    const parsed = await callGroqJSON(prompt);
    const results = Array.isArray(parsed.items) ? parsed.items : [];

    return results
      .map((r) => {
        const source = items[(r.headlineIndex || 1) - 1];
        if (!source) return null;
        return {
          title: source.title,
          link: source.link || null,
          source: source.source || null,
          pubDate: source.pubDate || null,
          impact: IMPACT_LEVELS.includes(r.impact) ? r.impact : 'LOW',
          oneLineWhy: (r.oneLineWhy || '').slice(0, 300),
          affectedAssets: Array.isArray(r.affectedAssets)
            ? r.affectedAssets
                .filter((a) => a.symbol)
                .map((a) => ({ symbol: a.symbol, direction: a.direction === 'down' ? 'down' : 'up' }))
            : [],
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('[NewsInterpreter] Failed:', err.message);
    return [];
  }
}

module.exports = { interpretNews };
