const db = require('../db');

function getUserAccountIds(userId) {
  return db
    .prepare(`SELECT id FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL`)
    .all(userId)
    .map((r) => r.id);
}

function getClosedTrades(userId, sinceMonths = 12) {
  const accountIds = getUserAccountIds(userId);
  if (accountIds.length === 0) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - sinceMonths);
  const sinceIso = since.toISOString();

  const placeholders = accountIds.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT * FROM trades WHERE connected_account_id IN (${placeholders}) AND close_time >= ? ORDER BY close_time ASC`
    )
    .all(...accountIds, sinceIso);
}

// Every number here is computed from real trade rows — the AI layer only
// ever phrases these, it never invents a figure.
function computeStats(userId) {
  const trades = getClosedTrades(userId);
  if (trades.length === 0) return null;

  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const winRate = (wins.length / trades.length) * 100;
  const avgWinner = wins.length ? wins.reduce((s, t) => s + t.profit, 0) / wins.length : 0;
  const avgLoser = losses.length ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length) : 0;
  const edgeRatio = avgLoser > 0 ? avgWinner / avgLoser : null;

  const bySymbol = {};
  for (const t of trades) {
    bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + t.profit;
  }
  const symbolPnl = Object.entries(bySymbol)
    .map(([symbol, profit]) => ({ symbol, profit }))
    .sort((a, b) => b.profit - a.profit);
  const bestSymbol = symbolPnl[0] || null;
  const worstSymbol = symbolPnl[symbolPnl.length - 1] || null;

  // Overtrading-after-a-loss: average number of trades opened within the
  // 2 hours following a losing trade's close, vs. the average trade count
  // in any random 2-hour window across the full history.
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const openTimes = trades.map((t) => new Date(t.open_time || t.close_time).getTime()).sort((a, b) => a - b);

  function countOpensInWindow(startMs, endMs) {
    return openTimes.filter((t) => t >= startMs && t < endMs).length;
  }

  let postLossCounts = [];
  for (const loss of losses) {
    const closeMs = new Date(loss.close_time).getTime();
    postLossCounts.push(countOpensInWindow(closeMs, closeMs + TWO_HOURS_MS));
  }
  const avgPostLossCount = postLossCounts.length
    ? postLossCounts.reduce((a, b) => a + b, 0) / postLossCounts.length
    : 0;

  const totalSpanMs = openTimes.length > 1 ? openTimes[openTimes.length - 1] - openTimes[0] : 0;
  const windowCount = totalSpanMs > 0 ? Math.max(1, Math.floor(totalSpanMs / TWO_HOURS_MS)) : 1;
  const baselineAvgCount = openTimes.length / windowCount;

  const overtradingRatio = baselineAvgCount > 0 ? avgPostLossCount / baselineAvgCount : null;

  return {
    totalTrades: trades.length,
    winRate,
    avgWinner,
    avgLoser,
    edgeRatio,
    bestSymbol,
    worstSymbol,
    symbolPnl,
    overtrading: {
      avgPostLossCount,
      baselineAvgCount,
      ratio: overtradingRatio,
    },
  };
}

module.exports = { computeStats, getClosedTrades };
