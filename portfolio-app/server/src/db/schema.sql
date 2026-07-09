CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  trader_type TEXT,
  onboarded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connected_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  broker TEXT NOT NULL,
  server TEXT NOT NULL,
  login TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'mt5',
  metaapi_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'connecting',
  status_detail TEXT,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  disconnected_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connected_account_id INTEGER NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  equity REAL NOT NULL,
  balance REAL NOT NULL,
  margin REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(connected_account_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connected_account_id INTEGER NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  metaapi_deal_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  volume REAL NOT NULL,
  open_price REAL,
  close_price REAL,
  open_time TEXT,
  close_time TEXT NOT NULL,
  profit REAL NOT NULL DEFAULT 0,
  commission REAL NOT NULL DEFAULT 0,
  swap REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(connected_account_id, metaapi_deal_id)
);

CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  computed_stats_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_account_date ON daily_snapshots(connected_account_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_trades_account_close ON trades(connected_account_id, close_time);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, created_at);
