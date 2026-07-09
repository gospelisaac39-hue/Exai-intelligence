const express = require('express');
const path = require('path');
const { requireAuth } = require('../auth/middleware');

// Reuses the existing pipeline's saved run data (src/dashboard/dataStore.js)
// instead of running a second dashboard server — same pattern as
// calendar/routes.js reusing forexFactory.js directly.
const { loadLatestBriefing } = require(
  path.join(__dirname, '../../../../src/dashboard/dataStore')
);

const router = express.Router();

// The pipeline trades one instrument per run (via the trader/risk-manager
// agents), not a multi-pair grid — this derives a single bias card from
// the final decision rather than inventing pairs that don't exist.
function mapPair(finalDecision) {
  const fd = finalDecision || {};
  const decision = fd.decision || 'HOLD';
  const bias = decision.includes('SHORT') ? 'SHORT' : decision.includes('LONG') ? 'LONG' : 'HOLD';
  return {
    name: fd.instrument || 'EUR/USD',
    bias,
    conviction: Math.round((fd.conviction || 5) * 10),
    note: fd.thesis || 'Awaiting analysis...',
  };
}

function mapBriefingText(agents) {
  const a = agents || {};
  const bull = a.bullCase?.output?.argument || '';
  const bear = a.bearCase?.output?.argument || '';
  return {
    positioning: a.positioning?.output?.reasoning || 'No positioning analysis available',
    fundamental: a.fundamentals?.output?.reasoning || 'No fundamental analysis available',
    sentiment: a.sentiment?.output?.reasoning || 'No sentiment analysis available',
    bullCase: bull || 'Bull case unavailable',
    bearCase: bear || 'Bear case unavailable',
  };
}

function mapConviction(finalDecision) {
  const fd = finalDecision || {};
  return {
    score: Math.round((fd.conviction || 5) * 10),
    label: fd.approved === false ? 'REJECTED' : fd.decision || 'HOLD',
    description: fd.positionSize ? `Position size: ${fd.positionSize}` : 'Awaiting risk assessment',
  };
}

router.get('/', requireAuth, (req, res) => {
  try {
    const run = loadLatestBriefing();
    const calendarWeek = run.calendarWeek && run.calendarWeek.length ? run.calendarWeek : run.calendar || [];

    res.json({
      timestamp: run.timestamp,
      runType: run.runType,
      isMajorNewsDay: run.isMajorNewsDay,
      pair: mapPair(run.finalDecision),
      briefingText: mapBriefingText(run.agents),
      conviction: mapConviction(run.finalDecision),
      cotData: run.cotData || [],
      fedwatchData: run.fedwatchData || [],
      calendarWeek: calendarWeek.slice(0, 40),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
