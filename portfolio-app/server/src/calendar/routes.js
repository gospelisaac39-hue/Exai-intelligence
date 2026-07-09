const express = require('express');
const path = require('path');
const { requireAuth } = require('../auth/middleware');
const { computeExposure } = require('../exposure/compute');
const db = require('../db');

const router = express.Router();

// Reuses the existing pipeline's ForexFactory fetcher (src/sources/forexFactory.js)
// instead of re-implementing the fetch — this dashboard only needs the raw
// calendar, filtered down to currencies the user actually holds exposure in.
const { fetchForexFactoryCalendar } = require(
  path.join(__dirname, '../../../../src/sources/forexFactory')
);

function classifyImpact(raw) {
  const r = (raw || '').toLowerCase().trim();
  if (r === 'high') return 'high';
  if (r === 'medium' || r === 'med') return 'medium';
  return 'low';
}

router.get('/', requireAuth, async (req, res) => {
  const { currenciesHeld } = computeExposure(req.userId);

  let currencies = currenciesHeld;
  if (currencies.length === 0) {
    const user = db.prepare('SELECT base_currency FROM users WHERE id = ?').get(req.userId);
    currencies = user?.base_currency ? [user.base_currency] : ['USD'];
  }

  let raw = [];
  try {
    raw = await fetchForexFactoryCalendar();
  } catch (err) {
    return res.status(502).json({ error: 'Unable to fetch the economic calendar right now.' });
  }

  const events = (Array.isArray(raw) ? raw : [])
    .filter((e) => currencies.includes((e.country || '').toUpperCase()))
    .map((e) => ({
      date: e.date,
      currency: (e.country || '').toUpperCase(),
      title: e.title,
      impact: classifyImpact(e.impact),
      forecast: e.forecast || 'N/A',
      previous: e.previous || 'N/A',
      actual: e.actual || 'Pending',
    }))
    .filter((e) => e.impact === 'high' || e.impact === 'medium')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json({ currencies, events });
});

module.exports = router;
