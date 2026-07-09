const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data/runs');
const LATEST_FILE = path.join(__dirname, '../../data/latest-run.json');

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Save complete workflow run to disk
 * Saves both to /data/runs/{date}.json AND /data/latest-run.json for dashboard
 */
function saveWorkflowResult(workflowResult) {
  ensureDataDir();

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runFilepath = path.join(DATA_DIR, `${runId}.json`);

  // Extract what we need from the workflow result
  const { eventsResult, cotResult, fedwatchResult, aiResult, isMajorNewsDay, newsResult, emailItems, prices, biasBoard, newsFeed, sentimentScore, pricesUpdatedAt, biasBoardUpdatedAt, newsFeedUpdatedAt, sentimentScoreUpdatedAt } = workflowResult;

  // The always-on market intelligence fields degrade rather than
  // disappear (spec Section 0.2): if this run's fetch/AI call for a
  // given piece failed, workflowResult won't have that key at all
  // (see marketIntelligence.js), so we fall back to whatever was last
  // successfully saved instead of blanking it out.
  const previous = loadLatestBriefing();

  const runData = {
    runId,
    timestamp: new Date().toISOString(),
    runType: workflowResult.runTypeInfo?.runType || 'unknown',
    isMajorNewsDay: isMajorNewsDay || false,

    // Agent outputs (multi-agent debate pipeline — single instrument,
    // deep dive, gated by isMajorNewsDay)
    agents: aiResult?.agents || {},
    finalDecision: aiResult?.finalDecision || { decision: 'HOLD' },

    // Always-on market intelligence layer (spec Section 3) — one entry
    // per catalog asset, never gated, refreshed every 15 min
    prices: prices || previous.prices || [],
    pricesUpdatedAt: pricesUpdatedAt || previous.pricesUpdatedAt || null,
    biasBoard: biasBoard || previous.biasBoard || [],
    biasBoardUpdatedAt: biasBoardUpdatedAt || previous.biasBoardUpdatedAt || null,
    newsFeed: newsFeed || previous.newsFeed || [],
    newsFeedUpdatedAt: newsFeedUpdatedAt || previous.newsFeedUpdatedAt || null,
    sentimentScore: sentimentScore || previous.sentimentScore || null,
    sentimentScoreUpdatedAt: sentimentScoreUpdatedAt || previous.sentimentScoreUpdatedAt || null,

    // Data snapshots
    calendar: eventsResult?.allEvents || [],
    calendarWeek: eventsResult?.weekCalendarAll || [],
    cotData: cotResult?.cotData || [],
    fedwatchData: fedwatchResult?.allMeetings || [],
    news: newsResult?.stats || {},

    // Email/subscriber info
    subscribers: emailItems?.length || 0,
    emailsSent: workflowResult.sendResults?.filter(r => r.ok).length || 0,

    // Errors
    errors: aiResult?.errors || []
  };

  // Save to runs directory
  fs.writeFileSync(runFilepath, JSON.stringify(runData, null, 2), 'utf-8');
  console.log(`[DataStore] Saved run to ${runFilepath}`);

  // Also save to "latest" for quick dashboard access
  fs.writeFileSync(LATEST_FILE, JSON.stringify(runData, null, 2), 'utf-8');

  return runData;
}

/**
 * Load the latest saved run
 */
function loadLatestBriefing() {
  ensureDataDir();
  if (!fs.existsSync(LATEST_FILE)) {
    return getDefaultBriefing();
  }
  try {
    const data = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf-8'));
    return data;
  } catch (err) {
    console.error('[Dashboard] Failed to load briefing:', err);
    return getDefaultBriefing();
  }
}

/**
 * Merges fresh live-data fields (calendar, COT, FedWatch, etc.) into the
 * latest saved run without touching agents/finalDecision — called every
 * 15 min from the ticker so the dashboard reflects near-real-time data
 * between the twice-daily full AI-analysis runs, which are the only
 * thing expensive enough (Groq) to keep on a slower cadence.
 */
function updateLiveData(partial) {
  ensureDataDir();
  const current = loadLatestBriefing();
  const merged = {
    ...current,
    ...partial,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(LATEST_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

/**
 * List all past runs
 */
function listRuns(limit = 50) {
  ensureDataDir();
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'));
        return {
          runId: data.runId,
          timestamp: data.timestamp,
          runType: data.runType,
          isMajorNewsDay: data.isMajorNewsDay,
          finalDecision: data.finalDecision?.decision || 'HOLD',
          agentStatus: summarizeAgentStatus(data.agents)
        };
      } catch (e) {
        return null;
      }
    }).filter(r => r !== null);
  } catch (err) {
    console.warn('[DataStore] Failed to list runs:', err.message);
    return [];
  }
}

/**
 * Get a specific run by ID
 */
function getRun(runId) {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, `${runId}.json`);
  try {
    if (!fs.existsSync(filepath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (err) {
    console.warn(`[DataStore] Failed to load run ${runId}:`, err.message);
    return null;
  }
}

/**
 * Summarize agent status
 */
function summarizeAgentStatus(agents) {
  if (!agents || Object.keys(agents).length === 0) {
    return 'no data';
  }

  const statuses = Object.values(agents).map(a => a.status || 'unknown');
  const successCount = statuses.filter(s => s === 'success').length;
  const failCount = statuses.filter(s => s === 'failed').length;
  const partialCount = statuses.filter(s => s === 'partial').length;

  if (failCount > 0) {
    return `${successCount}✓ ${failCount}✗`;
  } else if (partialCount > 0) {
    return `${successCount}✓ ${partialCount}◐`;
  } else {
    return `${successCount}✓`;
  }
}

/**
 * Default briefing when no data has been generated yet.
 * Shape matches saveWorkflowResult()'s runData exactly, so downstream
 * consumers (dashboard API routes) don't need to branch on whether a
 * real run has happened yet.
 */
function getDefaultBriefing() {
  return {
    runId: null,
    timestamp: new Date().toISOString(),
    runType: 'none',
    isMajorNewsDay: false,
    agents: {},
    finalDecision: {
      decision: 'HOLD',
      instrument: 'EUR/USD',
      conviction: 5,
      approved: false,
      thesis: 'Awaiting first workflow run...',
      positionSize: 'standard',
      bullArgument: '',
      bearArgument: '',
    },
    prices: [],
    pricesUpdatedAt: null,
    biasBoard: [],
    biasBoardUpdatedAt: null,
    newsFeed: [],
    newsFeedUpdatedAt: null,
    sentimentScore: null,
    sentimentScoreUpdatedAt: null,
    calendar: [],
    calendarWeek: [],
    cotData: [],
    fedwatchData: [],
    news: {},
    subscribers: 0,
    emailsSent: 0,
    errors: [],
  };
}

module.exports = { saveWorkflowResult, loadLatestBriefing, updateLiveData, listRuns, getRun };

/**
 * Appends one row per run to the "RunLog" Google Sheet tab, so runs
 * can be tracked/reviewed outside of raw JSON files. Requires a
 * "RunLog" tab to already exist in the Indicators spreadsheet with
 * headers: Timestamp | RunType | Decision | Conviction | Subscribers | EmailsSent | MajorNewsDay | Errors
 */
async function logRunToSheet(runData) {
  try {
    const { appendRow } = require('../sources/googleSheets');
    const config = require('../config');
    await appendRow(config.sheets.indicatorsSheetId, 'RunLog', [
      runData.timestamp,
      runData.runType,
      runData.finalDecision?.decision || 'HOLD',
      runData.finalDecision?.conviction || '',
      runData.subscribers,
      runData.emailsSent,
      runData.isMajorNewsDay,
      (runData.errors || []).join('; ')
    ]);
    console.log('[DataStore] Run logged to Google Sheet.');
  } catch (err) {
    console.log('[DataStore] Failed to log run to sheet:', err.message);
  }
}

module.exports.logRunToSheet = logRunToSheet;
