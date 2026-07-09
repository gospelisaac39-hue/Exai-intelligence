const db = require('../db');
const connectionManager = require('../metaapi/connectionManager');

function getUserAccounts(userId) {
  return db
    .prepare(`SELECT * FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL`)
    .all(userId);
}

// Currency exposure is computed in lot units, not converted notional dollars
// (that would require a live FX rate feed we don't have) — every pair's
// volume contributes equally to both sides of its currency pair, so relative
// percentages between currencies are meaningful even though the absolute
// unit isn't a dollar amount.
function computeExposure(userId) {
  const accounts = getUserAccounts(userId);
  const positions = accounts.flatMap((account) =>
    connectionManager.getPositions(account.id).map((pos) => ({ ...pos, accountId: account.id }))
  );

  const net = {}; // currency -> signed exposure
  const touches = {}; // currency -> [{symbol, sign}]

  for (const pos of positions) {
    if (!pos.symbol || pos.symbol.length < 6) continue;
    const base = pos.symbol.slice(0, 3).toUpperCase();
    const quote = pos.symbol.slice(3, 6).toUpperCase();
    const sign = pos.type === 'POSITION_TYPE_BUY' ? 1 : -1;
    const volume = pos.volume || 0;

    net[base] = (net[base] || 0) + sign * volume;
    net[quote] = (net[quote] || 0) - sign * volume;

    (touches[base] ||= []).push({ symbol: pos.symbol, sign });
    (touches[quote] ||= []).push({ symbol: pos.symbol, sign: -sign });
  }

  const totalGross = Object.values(net).reduce((sum, v) => sum + Math.abs(v), 0);

  const breakdown = Object.entries(net)
    .map(([currency, exposure]) => ({
      currency,
      exposure,
      direction: exposure > 0 ? 'long' : exposure < 0 ? 'short' : 'flat',
      pct: totalGross > 0 ? (Math.abs(exposure) / totalGross) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Concentration warning: currency touched by 3+ distinct symbols all on
  // the same net side, which is easy to miss when scanning positions one
  // at a time.
  const concentrationWarnings = [];
  for (const [currency, list] of Object.entries(touches)) {
    const symbols = [...new Set(list.map((t) => t.symbol))];
    if (symbols.length < 3) continue;
    const netSign = Math.sign(net[currency] || 0);
    if (netSign === 0) continue;
    const sameSideSymbols = [...new Set(list.filter((t) => Math.sign(t.sign) === netSign).map((t) => t.symbol))];
    if (sameSideSymbols.length >= 3) {
      concentrationWarnings.push({
        currency,
        direction: netSign > 0 ? 'long' : 'short',
        symbolCount: sameSideSymbols.length,
        symbols: sameSideSymbols,
        message: `You are net ${netSign > 0 ? 'long' : 'short'} ${currency} across ${sameSideSymbols.length} open positions — combined exposure may be larger than intended.`,
      });
    }
  }

  const currenciesHeld = [...new Set(Object.keys(net))];

  return { breakdown, concentrationWarnings, currenciesHeld, positionCount: positions.length };
}

// Risk score: transparent weighted blend of leverage utilization,
// concentration, and current drawdown — every component is returned
// alongside the score so the UI tooltip can show the actual formula.
function computeRiskScore({ marginUtilizationPct, concentrationPct, drawdownPct }) {
  const leverageComponent = Math.min(marginUtilizationPct / 100, 1);
  const concentrationComponent = Math.min(concentrationPct / 100, 1);
  const drawdownComponent = Math.min(drawdownPct / 100, 1);

  const weights = { leverage: 0.4, concentration: 0.3, drawdown: 0.3 };
  const score =
    leverageComponent * weights.leverage +
    concentrationComponent * weights.concentration +
    drawdownComponent * weights.drawdown;

  return {
    score: Math.round(score * 100),
    components: {
      leverage: { value: Math.round(leverageComponent * 100), weight: weights.leverage * 100 },
      concentration: { value: Math.round(concentrationComponent * 100), weight: weights.concentration * 100 },
      drawdown: { value: Math.round(drawdownComponent * 100), weight: weights.drawdown * 100 },
    },
    formula: 'score = 40% × margin utilization + 30% × largest currency concentration + 30% × current drawdown from peak equity',
  };
}

function computeDrawdownPct(userId) {
  const accounts = getUserAccounts(userId);
  let peak = 0;
  let current = 0;
  for (const account of accounts) {
    const snapshots = db
      .prepare(
        `SELECT equity FROM daily_snapshots WHERE connected_account_id = ? ORDER BY snapshot_date DESC LIMIT 30`
      )
      .all(account.id);
    const info = connectionManager.getAccountInformation(account.id);
    current += info?.equity ?? snapshots[0]?.equity ?? 0;
    peak += Math.max(...(snapshots.map((s) => s.equity).length ? snapshots.map((s) => s.equity) : [info?.equity ?? 0]));
  }
  if (peak <= 0) return 0;
  return Math.max(0, ((peak - current) / peak) * 100);
}

module.exports = { computeExposure, computeRiskScore, computeDrawdownPct };
