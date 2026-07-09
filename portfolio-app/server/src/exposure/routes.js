const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const connectionManager = require('../metaapi/connectionManager');
const { computeExposure, computeRiskScore, computeDrawdownPct } = require('./compute');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { breakdown, concentrationWarnings, currenciesHeld, positionCount } = computeExposure(req.userId);

  const accounts = db
    .prepare(`SELECT * FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL`)
    .all(req.userId);

  let equity = 0;
  let margin = 0;
  for (const account of accounts) {
    const info = connectionManager.getAccountInformation(account.id);
    equity += info?.equity ?? 0;
    margin += info?.margin ?? 0;
  }

  const marginUtilizationPct = equity > 0 ? (margin / equity) * 100 : 0;
  const concentrationPct = breakdown[0]?.pct ?? 0;
  const drawdownPct = computeDrawdownPct(req.userId);

  const risk = computeRiskScore({ marginUtilizationPct, concentrationPct, drawdownPct });

  res.json({
    breakdown,
    concentrationWarnings,
    currenciesHeld,
    positionCount,
    risk,
  });
});

module.exports = router;
