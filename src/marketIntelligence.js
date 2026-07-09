const { fetchQuotes } = require('./sources/prices');
const { ASSET_CATALOG } = require('./assetCatalog');
const { generateBiasBoard } = require('./ai/biasEngine');
const { interpretNews } = require('./ai/newsInterpreter');
const { computeSentimentScore } = require('./ai/sentimentScore');

/**
 * Runs the always-on market intelligence layer: live prices for the
 * full asset catalog, a bias board (day/swing bias per asset), an
 * interpreted news feed, and a deterministic sentiment score. This is
 * the piece that must run on every branch (weekend, week-ahead,
 * standard) and every 15-min tick regardless of the major-news-day
 * gate — the gate only controls whether the deeper single-instrument
 * multi-agent debate runs, per spec Section 3's "golden rule": the UI
 * never computes analysis, it renders the latest pipeline output.
 *
 * Returns only the pieces that succeeded — a failed fetch/call is
 * OMITTED (not set to []), so dataStore's merge logic preserves
 * whatever was last successfully saved instead of blanking it out
 * (spec Section 0.2: "the module degrades, it does not disappear").
 */
async function runMarketIntelligenceLayer({ eventsResult, newsResult, cotResult, fedwatchResult, sentimentAgentTone }) {
  const [pricesOutcome, biasOutcome, newsOutcome] = await Promise.allSettled([
    fetchQuotes(ASSET_CATALOG),
    generateBiasBoard({
      highImpactEvents: eventsResult?.highImpactEvents || [],
      mediumImpactEvents: eventsResult?.mediumImpactEvents || [],
      breakingNews: newsResult?.breakingNews || [],
      cotData: cotResult?.cotData || [],
      fedwatchData: fedwatchResult?.allMeetings || [],
    }),
    interpretNews([...(newsResult?.breakingNews || []), ...(newsResult?.allFiltered || [])]),
  ]);

  const out = {};
  const now = new Date().toISOString();

  if (pricesOutcome.status === 'fulfilled') {
    out.prices = pricesOutcome.value;
    out.pricesUpdatedAt = now;
  } else {
    console.log('[Prices] fetch failed:', pricesOutcome.reason?.message);
  }

  if (biasOutcome.status === 'fulfilled') {
    out.biasBoard = biasOutcome.value;
    out.biasBoardUpdatedAt = now;
  } else {
    console.log('[BiasEngine] failed:', biasOutcome.reason?.message);
  }

  if (newsOutcome.status === 'fulfilled') {
    out.newsFeed = newsOutcome.value;
    out.newsFeedUpdatedAt = now;
    out.sentimentScore = computeSentimentScore(newsOutcome.value, sentimentAgentTone, newsResult?.buckets);
    out.sentimentScoreUpdatedAt = now;
  } else {
    console.log('[NewsInterpreter] failed:', newsOutcome.reason?.message);
  }

  console.log(
    `[MarketIntel] Prices: ${out.prices?.length ?? 'unchanged'} | Bias board: ${out.biasBoard?.length ?? 'unchanged'} | News feed: ${out.newsFeed?.length ?? 'unchanged'}` +
      (out.sentimentScore ? ` | Sentiment: ${out.sentimentScore.score} (${out.sentimentScore.label})` : ' | Sentiment: unchanged')
  );

  return out;
}

module.exports = { runMarketIntelligenceLayer };
