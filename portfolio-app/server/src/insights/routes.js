const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const { computeStats } = require('./stats');
const { buildPrompts } = require('./prompts');
const { callGroq } = require('./groq');

const router = express.Router();

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const TYPE_HEADLINES = {
  symbol_performance: 'Where your P&L actually came from',
  edge_diagnosis: 'Your edge, quantified',
  overtrading: 'A behavioral pattern in your history',
};

async function generateInsights(userId) {
  const stats = computeStats(userId);
  if (!stats) return [];

  const prompts = buildPrompts(stats);
  const rows = [];

  for (const { type, prompt } of prompts) {
    try {
      const body = await callGroq(prompt);
      const result = db
        .prepare(
          `INSERT INTO insights (user_id, type, headline, body, computed_stats_json) VALUES (?, ?, ?, ?, ?)`
        )
        .run(userId, type, TYPE_HEADLINES[type] || type, body, JSON.stringify(stats));
      rows.push(db.prepare('SELECT * FROM insights WHERE id = ?').get(result.lastInsertRowid));
    } catch (err) {
      console.warn(`[Insights] Failed to generate "${type}":`, err.message);
    }
  }

  return rows;
}

function toPublicInsight(row) {
  return { id: row.id, type: row.type, headline: row.headline, body: row.body, createdAt: row.created_at };
}

router.get('/', requireAuth, async (req, res) => {
  const latest = db
    .prepare(`SELECT * FROM insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`)
    .all(req.userId);

  const newestTs = latest[0] ? new Date(latest[0].created_at).getTime() : 0;
  const isStale = Date.now() - newestTs > STALE_AFTER_MS;

  if (latest.length === 0 || isStale) {
    try {
      const fresh = await generateInsights(req.userId);
      if (fresh.length > 0) {
        return res.json({ insights: fresh.map(toPublicInsight) });
      }
    } catch (err) {
      console.warn('[Insights] Generation failed, falling back to cached rows:', err.message);
    }
  }

  res.json({ insights: latest.map(toPublicInsight) });
});

router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const fresh = await generateInsights(req.userId);
    res.json({ insights: fresh.map(toPublicInsight) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
