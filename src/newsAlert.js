const fs = require('fs');
const path = require('path');
const { getActiveSubscribers } = require('./sources/googleSheets');
const { sendAllEmails } = require('./email/gmail');
const { formatBreakingNewsEmail } = require('./email/formatBreakingNewsEmail');

const STATE_FILE = path.join(__dirname, '..', 'data', 'newsAlertState.json');

// Deliberately narrower than filterNews.js's FOREX_GATE — this is the
// "drop everything, this moves markets right now" tier, not the general
// "relevant to forex" tier that already feeds the twice-daily briefing.
const SEVERE_KEYWORDS = [
  'declares war', 'declared war', 'military invasion', 'invades', 'invasion of',
  'nuclear strike', 'nuclear attack', 'missile strike', 'airstrike kills',
  'assassinat', "coup d'etat", 'coup attempt', 'coup underway',
  'market crash', 'stock market crash', 'circuit breaker', 'trading halted',
  'central bank emergency', 'emergency rate', 'emergency meeting',
  'currency collapse', 'bank collapse', 'bank run',
  'sovereign default', 'debt default', 'state of emergency',
  'terrorist attack', 'mass casualty', 'martial law',
  'oil embargo', 'strait of hormuz closed', 'swift ban',
  'financial sanctions imposed', 'capital controls imposed',
];

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

// Clears alerts older than 24h so a headline can re-alert the next day
// if it's still developing, and the state file doesn't grow forever.
function pruneOldNewsState() {
  const state = loadState();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const pruned = {};
  Object.entries(state).forEach(([key, sentAt]) => {
    if (sentAt > cutoff) pruned[key] = sentAt;
  });
  saveState(pruned);
}

function isSevere(article) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  return SEVERE_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Checks already-filtered/categorized news (from filterAndCategorizeNews)
 * for headlines severe enough to warrant an alert outside the normal
 * briefing cadence, and emails subscribers if any are found and haven't
 * already been alerted on in the last 24h.
 */
async function checkBreakingNews(newsResult) {
  const candidates = (newsResult?.breakingNews || []).filter(isSevere);
  if (candidates.length === 0) return;

  const state = loadState();
  const fresh = candidates.filter((a) => !state[a.title]);
  if (fresh.length === 0) return;

  console.log(`[NewsAlert] ${fresh.length} severe headline(s) detected — sending alert.`);
  const subscribers = await getActiveSubscribers().catch(() => []);
  const emailItems = formatBreakingNewsEmail(fresh, subscribers);
  await sendAllEmails(emailItems);

  fresh.forEach((a) => {
    state[a.title] = Date.now();
  });
  saveState(state);
}

module.exports = { checkBreakingNews, pruneOldNewsState };
