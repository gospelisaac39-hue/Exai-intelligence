const cron = require('node-cron');
const db = require('../db');
const connectionManager = require('../metaapi/connectionManager');

const CLOSING_ENTRY_TYPES = ['DEAL_ENTRY_OUT', 'DEAL_ENTRY_OUT_BY'];
const TRADE_DEAL_TYPES = ['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'];

function directionForClosingDeal(deal, historyStorage) {
  const openingDeal = historyStorage
    .dealsByPosition(deal.positionId)
    ?.find((d) => d.entryType === 'DEAL_ENTRY_IN');
  if (openingDeal) {
    return {
      direction: openingDeal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell',
      openPrice: openingDeal.price ?? null,
      openTime: openingDeal.time ? new Date(openingDeal.time).toISOString() : null,
    };
  }
  // Fallback: a closing deal's side is the opposite of the position it closed.
  return {
    direction: deal.type === 'DEAL_TYPE_BUY' ? 'sell' : 'buy',
    openPrice: null,
    openTime: null,
  };
}

function syncTradesForAccount(connectedAccountId) {
  const historyStorage = connectionManager.getHistoryStorage(connectedAccountId);
  if (!historyStorage) return 0;

  const closingDeals = (historyStorage.deals || []).filter(
    (d) => d.symbol && CLOSING_ENTRY_TYPES.includes(d.entryType) && TRADE_DEAL_TYPES.includes(d.type)
  );

  const insert = db.prepare(
    `INSERT INTO trades
       (connected_account_id, metaapi_deal_id, symbol, direction, volume, open_price, close_price, open_time, close_time, profit, commission, swap)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(connected_account_id, metaapi_deal_id) DO NOTHING`
  );

  let inserted = 0;
  for (const deal of closingDeals) {
    const { direction, openPrice, openTime } = directionForClosingDeal(deal, historyStorage);
    const result = insert.run(
      connectedAccountId,
      String(deal.id),
      deal.symbol,
      direction,
      deal.volume ?? 0,
      openPrice,
      deal.price ?? null,
      openTime,
      new Date(deal.time).toISOString(),
      deal.profit ?? 0,
      deal.commission ?? 0,
      deal.swap ?? 0
    );
    if (result.changes > 0) inserted += 1;
  }
  return inserted;
}

function syncAllTrades() {
  const accounts = db
    .prepare(`SELECT id FROM connected_accounts WHERE disconnected_at IS NULL AND status = 'active'`)
    .all();

  let total = 0;
  for (const { id } of accounts) {
    try {
      total += syncTradesForAccount(id);
    } catch (err) {
      console.warn(`[TradeSync] Failed for account ${id}:`, err.message);
    }
  }
  if (total > 0) console.log(`[TradeSync] Inserted ${total} new closed trade(s)`);
}

function scheduleTradeSync() {
  // Every 15 minutes — closed trades don't need second-level freshness,
  // and this keeps well within MetaApi's history storage read cadence.
  cron.schedule('*/15 * * * *', syncAllTrades);
}

module.exports = { syncTradesForAccount, syncAllTrades, scheduleTradeSync };
