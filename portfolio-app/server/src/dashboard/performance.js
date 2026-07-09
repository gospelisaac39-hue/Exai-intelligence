const db = require('../db');

const PERIOD_DAYS = { '7d': 7, '30d': 30, ytd: null };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function periodStartKey(period) {
  if (period === 'ytd') {
    return `${new Date().getFullYear()}-01-01`;
  }
  const days = PERIOD_DAYS[period] ?? 7;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Risk tag derived from volatility (stddev of day-over-day equity % change)
// and worst peak-to-trough drawdown over the available snapshot history —
// not a marketing label, just a plain-language bucket over real numbers.
function computeRiskTag(snapshots) {
  if (snapshots.length < 3) return 'Unrated';

  const returns = [];
  let peak = snapshots[0].equity;
  let maxDrawdownPct = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].equity;
    const curr = snapshots[i].equity;
    if (prev > 0) returns.push((curr - prev) / prev);
    peak = Math.max(peak, curr);
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, ((peak - curr) / peak) * 100);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length || 1);
  const stddevPct = Math.sqrt(variance) * 100;

  if (maxDrawdownPct > 20 || stddevPct > 2) return 'High';
  if (maxDrawdownPct > 8 || stddevPct > 0.5) return 'Moderate';
  return 'Low';
}

function getAccountPerformance(account, period) {
  const startKey = periodStartKey(period);
  const snapshots = db
    .prepare(
      `SELECT snapshot_date, equity FROM daily_snapshots
       WHERE connected_account_id = ? ORDER BY snapshot_date ASC`
    )
    .all(account.id)
    .map((r) => ({ date: r.snapshot_date, equity: r.equity }));

  const inRange = snapshots.filter((s) => s.date >= startKey);
  let returnPct = null;
  if (inRange.length >= 1) {
    const baseline = inRange[0].equity;
    const latest = snapshots[snapshots.length - 1]?.equity ?? baseline;
    if (baseline > 0) returnPct = ((latest - baseline) / baseline) * 100;
  }

  return {
    returnPct,
    riskTag: computeRiskTag(snapshots),
    hasHistory: snapshots.length > 0,
  };
}

module.exports = { getAccountPerformance, todayKey, PERIOD_DAYS };
