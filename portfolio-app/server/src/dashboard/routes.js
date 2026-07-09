const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const connectionManager = require('../metaapi/connectionManager');
const { getAccountPerformance, todayKey } = require('./performance');

const router = express.Router();

function getUserAccounts(userId) {
  return db
    .prepare(`SELECT * FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL`)
    .all(userId);
}

router.get('/summary', requireAuth, (req, res) => {
  const accounts = getUserAccounts(req.userId);

  let portfolioValue = 0;
  let capitalDeployed = 0;
  const today = todayKey();
  let morningEquitySum = 0;
  let accountsWithBaseline = 0;

  for (const account of accounts) {
    const info = connectionManager.getAccountInformation(account.id);
    const equity = info?.equity ?? 0;
    portfolioValue += equity;
    capitalDeployed += info?.margin ?? 0;

    const snapshot = db
      .prepare(`SELECT equity FROM daily_snapshots WHERE connected_account_id = ? AND snapshot_date = ?`)
      .get(account.id, today);
    if (snapshot) {
      morningEquitySum += snapshot.equity;
      accountsWithBaseline += 1;
    }
  }

  const dailyPnlAvailable = accounts.length > 0 && accountsWithBaseline === accounts.length;
  const dailyPnl = dailyPnlAvailable ? portfolioValue - morningEquitySum : null;
  const dailyPnlPct = dailyPnlAvailable && morningEquitySum > 0 ? (dailyPnl / morningEquitySum) * 100 : null;

  res.json({
    portfolioValue,
    capitalDeployed,
    capitalDeployedPct: portfolioValue > 0 ? (capitalDeployed / portfolioValue) * 100 : 0,
    dailyPnl,
    dailyPnlPct,
    dailyPnlAvailable,
    accountsCount: accounts.length,
  });
});

router.get('/performance', requireAuth, (req, res) => {
  const period = ['7d', '30d', 'ytd'].includes(req.query.period) ? req.query.period : '7d';
  const accounts = getUserAccounts(req.userId);

  const rows = accounts.map((account) => {
    const info = connectionManager.getAccountInformation(account.id);
    const perf = getAccountPerformance(account, period);
    return {
      id: account.id,
      nickname: account.nickname,
      broker: account.broker,
      status: account.status,
      balance: info?.balance ?? null,
      equity: info?.equity ?? null,
      returnPct: perf.returnPct,
      riskTag: perf.riskTag,
    };
  });

  res.json({ period, accounts: rows });
});

module.exports = router;
