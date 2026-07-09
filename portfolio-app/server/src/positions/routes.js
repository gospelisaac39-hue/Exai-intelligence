const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const connectionManager = require('../metaapi/connectionManager');

const router = express.Router();

function getUserAccounts(userId) {
  return db
    .prepare(`SELECT * FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL`)
    .all(userId);
}

function toPublicPosition(pos, account) {
  return {
    id: `${account.id}-${pos.id}`,
    symbol: pos.symbol,
    account: account.nickname,
    accountId: account.id,
    direction: pos.type === 'POSITION_TYPE_BUY' ? 'buy' : 'sell',
    size: pos.volume,
    entryPrice: pos.openPrice,
    currentPrice: pos.currentPrice,
    unrealizedPnl: pos.profit,
    openedAt: pos.time,
  };
}

router.get('/', requireAuth, (req, res) => {
  const accounts = getUserAccounts(req.userId);
  const positions = accounts.flatMap((account) =>
    connectionManager.getPositions(account.id).map((pos) => toPublicPosition(pos, account))
  );
  res.json({ positions });
});

module.exports = router;
