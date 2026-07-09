const cron = require('node-cron');
const db = require('../db');
const connectionManager = require('../metaapi/connectionManager');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function runDailySnapshot() {
  const accounts = db
    .prepare(`SELECT * FROM connected_accounts WHERE disconnected_at IS NULL AND status = 'active'`)
    .all();

  const today = todayKey();
  let taken = 0;

  for (const account of accounts) {
    const info = connectionManager.getAccountInformation(account.id);
    if (!info) continue;

    db.prepare(
      `INSERT INTO daily_snapshots (connected_account_id, snapshot_date, equity, balance, margin)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(connected_account_id, snapshot_date)
       DO UPDATE SET equity = excluded.equity, balance = excluded.balance, margin = excluded.margin`
    ).run(account.id, today, info.equity, info.balance, info.margin ?? 0);
    taken += 1;
  }

  if (taken > 0) console.log(`[DailySnapshot] Captured ${taken} account snapshot(s) for ${today}`);
}

function scheduleDailySnapshot() {
  // Once daily at 00:05 server time — early enough that "this morning's
  // equity" is available all day for the Daily P&L calculation.
  cron.schedule('5 0 * * *', runDailySnapshot);
  // Also run once at boot so a freshly started server has a same-day
  // baseline instead of waiting until midnight.
  runDailySnapshot();
}

module.exports = { runDailySnapshot, scheduleDailySnapshot };
