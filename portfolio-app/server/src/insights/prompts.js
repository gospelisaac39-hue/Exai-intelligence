const SYSTEM_PREAMBLE =
  'You are writing a single short insight card for a trader\'s portfolio dashboard. ' +
  'Voice: institutional risk-desk analyst — direct, factual, no hype, no emojis. ' +
  'Use ONLY the numbers given below; never invent, estimate, or round a figure that ' +
  'was not provided. One to two sentences, plain text, no markdown.';

function buildPrompts(stats) {
  const prompts = [];

  if (stats.bestSymbol && stats.worstSymbol && stats.bestSymbol.symbol !== stats.worstSymbol.symbol) {
    prompts.push({
      type: 'symbol_performance',
      prompt: `${SYSTEM_PREAMBLE}\n\nData: over the trade history on file, this trader made $${stats.bestSymbol.profit.toFixed(
        2
      )} on ${stats.bestSymbol.symbol} and lost $${Math.abs(stats.worstSymbol.profit).toFixed(2)} on ${
        stats.worstSymbol.symbol
      }.\n\nWrite the insight card.`,
    });
  }

  if (stats.edgeRatio !== null) {
    prompts.push({
      type: 'edge_diagnosis',
      prompt: `${SYSTEM_PREAMBLE}\n\nData: win rate is ${stats.winRate.toFixed(
        0
      )}%, average winning trade is $${stats.avgWinner.toFixed(2)}, average losing trade is $${stats.avgLoser.toFixed(
        2
      )} (a ${stats.edgeRatio.toFixed(1)}x ratio of average winner to average loser).\n\nWrite the insight card, characterizing where the trader's edge actually comes from (win rate vs. payoff asymmetry).`,
    });
  }

  if (stats.overtrading.ratio !== null && stats.overtrading.ratio >= 1.5) {
    prompts.push({
      type: 'overtrading',
      prompt: `${SYSTEM_PREAMBLE}\n\nData: in the 2 hours following a losing trade, this trader opens an average of ${stats.overtrading.avgPostLossCount.toFixed(
        1
      )} positions, versus a baseline average of ${stats.overtrading.baselineAvgCount.toFixed(
        1
      )} positions per 2-hour window across their full history (${stats.overtrading.ratio.toFixed(1)}x).\n\nWrite the insight card about this behavioral pattern.`,
    });
  }

  return prompts;
}

module.exports = { buildPrompts };
