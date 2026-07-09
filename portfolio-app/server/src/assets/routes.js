const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const { ASSET_CATALOG, VALID_SYMBOLS } = require('./catalog');

const router = express.Router();

function getWatchedSymbols(userId) {
  return db
    .prepare('SELECT symbol FROM watched_assets WHERE user_id = ? ORDER BY id ASC')
    .all(userId)
    .map((r) => r.symbol);
}

// GET: the full catalog (for the picker UI) plus the user's current selections
router.get('/', requireAuth, (req, res) => {
  res.json({ catalog: ASSET_CATALOG, watched: getWatchedSymbols(req.userId) });
});

const watchlistSchema = z.object({
  symbols: z.array(z.string()).min(1, 'Select at least one asset'),
});

// PUT: replace the user's watchlist wholesale — used both at onboarding
// and from Settings later, so it's idempotent rather than incremental.
router.put('/', requireAuth, (req, res) => {
  const parsed = watchlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const symbols = [...new Set(parsed.data.symbols)].filter((s) => VALID_SYMBOLS.has(s));
  if (symbols.length === 0) {
    return res.status(400).json({ error: 'None of the selected assets are recognized' });
  }

  const tx = db.prepare('DELETE FROM watched_assets WHERE user_id = ?');
  const insert = db.prepare('INSERT INTO watched_assets (user_id, symbol) VALUES (?, ?)');

  db.exec('BEGIN');
  try {
    tx.run(req.userId);
    symbols.forEach((symbol) => insert.run(req.userId, symbol));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ catalog: ASSET_CATALOG, watched: getWatchedSymbols(req.userId) });
});

module.exports = router;
