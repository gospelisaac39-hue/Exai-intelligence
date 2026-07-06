const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'eventWatchState.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function eventKey(ev) {
  return `${ev.currency}|${ev.event}|${ev.day}`;
}

/**
 * Call this every 15 minutes. Given today's high-impact USD events and
 * their current actual values, returns which lifecycle action (if any)
 * should fire right now for each event, and updates state so nothing
 * fires twice.
 *
 * Returns: [{ event, action: 'preAlert' | 'postRelease', ... }]
 */
function checkEventLifecycle(highImpactEventsToday, actualsLookup) {
  const state = loadState();
  const now = Date.now();
  const actions = [];

  highImpactEventsToday.forEach((ev) => {
    const key = eventKey(ev);
    if (!state[key]) state[key] = {};
    const evState = state[key];

    const eventTimeMs = ev.ts || null;
    if (!eventTimeMs) return;

    const minutesToEvent = (eventTimeMs - now) / 60000;

    // Stage 2: 30 minutes before (fire once, in the 35->25 min window to tolerate a missed tick)
    if (!evState.preAlertSent && minutesToEvent <= 35 && minutesToEvent >= 25) {
      evState.preAlertSent = true;
      actions.push({ event: ev, action: 'preAlert' });
    }

    // Detect actual release
    const actual = actualsLookup ? actualsLookup(ev) : null;
    const hasRealActual = actual && actual !== 'Pending' && actual !== 'N/A' && actual !== '';

    if (hasRealActual && !evState.actualDetectedAt) {
      evState.actualDetectedAt = now;
    }

    // Stage 4: 5 minutes after actual detected
    if (
      evState.actualDetectedAt &&
      !evState.postAlertSent &&
      (now - evState.actualDetectedAt) / 60000 >= 5
    ) {
      evState.postAlertSent = true;
      actions.push({ event: ev, action: 'postRelease', actual });
    }
  });

  saveState(state);
  return actions;
}

/**
 * Clears state older than 24h so the file doesn't grow forever and
 * yesterday's events don't linger.
 */
function pruneOldState() {
  const state = loadState();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const pruned = {};
  Object.entries(state).forEach(([key, val]) => {
    if (!val.actualDetectedAt || val.actualDetectedAt > cutoff) {
      pruned[key] = val;
    }
  });
  saveState(pruned);
}

module.exports = { checkEventLifecycle, pruneOldState };
