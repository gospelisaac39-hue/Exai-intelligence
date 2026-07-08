const { detectRunType } = require('./runTypeDetector');
const { fetchForexFactoryEnhanced } = require('./sources/forexFactory');
const { fetchTelegram } = require('./sources/telegram');
const { fetchAndParseCOT } = require('./sources/cot');
const { fetchFedWatch } = require('./sources/fedwatch');
const { getActiveSubscribers, fetchActuals } = require('./sources/googleSheets');

const { parseTelegram } = require('./processing/parseTelegram');
const { filterAndCategorizeNews } = require('./processing/filterNews');
const { parseEvents } = require('./processing/parseEvents');
const { preparePrompt } = require('./processing/preparePrompt');

const { runDebateOrchestration } = require('./ai/orchestrator');
const { formatEmail } = require('./email/formatEmail');
const { formatWeekAheadEmail } = require('./email/formatWeekAheadEmail');
const { formatWeekendEmail } = require('./email/formatWeekendEmail');
const { fetchForexFactoryLastWeek } = require('./sources/forexFactory');
const { weeklyHighlights } = require('./ai/agents/weeklyHighlights');
const { formatQuietDayEmail } = require('./email/formatQuietDayEmail');
const { sendAllEmails } = require('./email/gmail');
const { saveWorkflowResult, logRunToSheet } = require('./dashboard/dataStore');

const config = require('./config');

/**
 * Runs the full EXAI pipeline once, end to end. Branches by run type:
 *
 *   week_ahead — Monday mornings only. Fetches ONLY the ForexFactory
 *     calendar (skips Telegram/COT/FedWatch/Groq entirely — there's no
 *     point spending an AI call on a calendar listing), builds the
 *     full week's high+medium+holiday calendar, and sends the
 *     week-ahead email. Returns early; nothing below this runs.
 *
 *   morning / actuals — the original full pipeline:
 *     1. Fetch all five parallel sources
 *     2. Parse + filter news, parse calendar events
 *     3. Build the AI prompt from all three intelligence layers
 *     4. Call Groq for the analysis
 *     5. Format the HTML email
 *     6. Pull active subscribers and send to each
 *
 *   On these non-Monday runs, the analysis email only sends if today
 *   has at least one high-impact USD event (fully automatic — no
 *   manual override). On quiet days it sends a short promo email
 *   instead of going silent on the list.
 *
 * @param {object} opts
 * @param {boolean} opts.dryRun - if true, skips actually sending email (still builds it)
 */
async function runWorkflow({ dryRun = false } = {}) {
  const startedAt = Date.now();
  console.log('\n========================================');
  console.log('EXAI WORKFLOW RUN START', new Date().toISOString());
  console.log('========================================\n');

  const runTypeInfo = detectRunType(config.schedule.timezone);

  // ============================================================
  // WEEKEND BRANCH (Saturday/Sunday) - promo + last week recap + next week preview
  // ============================================================
  const watDayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: config.schedule.timezone });
  if (watDayName === 'Saturday' || watDayName === 'Sunday') {
    console.log('[Weekend] ' + watDayName + ' - sending promo/recap email instead of normal pipeline.');

    const calendarRawWknd = await fetchForexFactoryEnhanced().catch((e) => {
      console.log('[ForexFactory] failed:', e.message);
      return [];
    });
    const eventsResultWknd = parseEvents(calendarRawWknd);

    const subscribersWknd = await getActiveSubscribers().catch((e) => {
      console.log('[Subscribers sheet] failed:', e.message);
      return [];
    });

    const lastWeekEvents = await fetchForexFactoryLastWeek().catch((e) => { console.log('[ForexFactory] last week failed:', e.message); return []; });
    const highlightsText = await weeklyHighlights(lastWeekEvents);
    const emailItemsWknd = formatWeekendEmail(eventsResultWknd, subscribersWknd, highlightsText, lastWeekEvents);

    let sendResultsWknd = [];
    if (dryRun) {
      console.log('[DryRun] Would send ' + emailItemsWknd.length + ' weekend email(s). Skipping actual send.');
    } else {
      sendResultsWknd = await sendAllEmails(emailItemsWknd);
    }

    const elapsedSecWknd = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log('\nWORKFLOW RUN COMPLETE in ' + elapsedSecWknd + 's');
    console.log('  Run type: weekend');
    console.log('  Subscribers: ' + subscribersWknd.length);
    console.log('  Emails sent: ' + sendResultsWknd.filter((r) => r.ok).length + '/' + sendResultsWknd.length + '\n');

    const resultWknd = { runTypeInfo, eventsResult: eventsResultWknd, emailItems: emailItemsWknd, sendResults: sendResultsWknd };
    const savedWknd = saveWorkflowResult(resultWknd);
    await logRunToSheet(savedWknd);
    return resultWknd;
  }

  // ============================================================
  // WEEK-AHEAD BRANCH (Monday mornings)
  // ============================================================
  if (runTypeInfo.runType === 'week_ahead') {
    console.log('[WeekAhead] Run type is week_ahead — sending full-week calendar email only.');

    const calendarRaw = await fetchForexFactoryEnhanced().catch((e) => {
      console.log('[ForexFactory] failed:', e.message);
      return [];
    });

    const eventsResult = parseEvents(calendarRaw);

    const subscribers = await getActiveSubscribers().catch((e) => {
      console.log('[Subscribers sheet] failed:', e.message);
      return [];
    });

    const emailItems = formatWeekAheadEmail(eventsResult, subscribers);

    let sendResults = [];
    if (dryRun) {
      console.log(`[DryRun] Would send ${emailItems.length} week-ahead email(s). Skipping actual send.`);
    } else {
      sendResults = await sendAllEmails(emailItems);
    }

    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\nWORKFLOW RUN COMPLETE in ${elapsedSec}s`);
    console.log(`  Run type: ${runTypeInfo.runType}`);
    console.log(`  Week calendar events: ${eventsResult.weekCalendarAll.length}`);
    console.log(`  Subscribers: ${subscribers.length}`);
    console.log(`  Emails sent: ${sendResults.filter((r) => r.ok).length}/${sendResults.length}\n`);

    const result = { runTypeInfo, eventsResult, emailItems, sendResults };
    const saved = saveWorkflowResult(result);
    await logRunToSheet(saved);
    return result;
  }

  // ============================================================
  // STANDARD DAILY BRANCH (morning / actuals)
  // ============================================================

  // ---- Step 1: fetch the five parallel sources ----
  console.log('[1/6] Fetching sources...');
  const [calendarRaw, telegramHtml, cotResult, fedwatchResult, actualsResult] = await Promise.all([
    fetchForexFactoryEnhanced().catch((e) => {
      console.log('[ForexFactory] failed:', e.message);
      return [];
    }),
    fetchTelegram().catch((e) => {
      console.log('[Telegram] failed:', e.message);
      return '';
    }),
    fetchAndParseCOT(),
    fetchFedWatch(),
    fetchActuals().catch((e) => {
      console.log('[Actuals sheet] failed:', e.message);
      return { actualsData: [] };
    }),
  ]);

  // ---- Step 2: parse telegram + filter/categorize news ----
  console.log('[2/6] Parsing news...');
  const telegramParsed = parseTelegram(telegramHtml);
  const newsResult = filterAndCategorizeNews(telegramParsed.telegramArticles);

  // ---- Step 3: parse calendar events ----
  console.log('[3/6] Parsing calendar events...');
  const eventsResult = parseEvents(calendarRaw);

  // ---- Step 4: build prompt from all layers ----
  console.log('[4/6] Building prompt...');
  const promptResult = preparePrompt(eventsResult, cotResult, fedwatchResult, actualsResult, newsResult);

  // Fully automatic gate: a "major news day" is any day with at least
  // one high-impact USD event. On quiet days we skip the multi-agent debate
  // and send a short email instead.
  const isMajorNewsDay = eventsResult.highImpactCount > 0;
  console.log(`[Gate] High-impact USD events today: ${eventsResult.highImpactCount} → ${isMajorNewsDay ? 'full debate' : 'quiet-day email (debate skipped)'}`);

  // ---- Step 5: Multi-agent debate orchestration (major news days only) ----
  let aiResult = { agents: {}, finalDecision: { decision: 'HOLD' } };
  if (isMajorNewsDay) {
    console.log('[5/6] Running multi-agent debate...');
    try {
      aiResult = await runDebateOrchestration(promptResult);
    } catch (err) {
      console.error('[Debate] Fatal error:', err);
      aiResult = { agents: {}, finalDecision: { decision: 'HOLD' }, error: err.message };
    }
  } else {
    console.log('[5/6] Skipped — quiet day, no debate needed.');
  }

  // ---- Step 6: format + send email ----
  console.log('[6/6] Formatting and sending email...');
  const subscribers = await getActiveSubscribers().catch((e) => {
    console.log('[Subscribers sheet] failed:', e.message);
    return [];
  });

  const emailItems = isMajorNewsDay
    ? formatEmail(promptResult, aiResult, newsResult, subscribers)
    : formatQuietDayEmail(eventsResult, subscribers);

  let sendResults = [];
  if (dryRun) {
    console.log(`[DryRun] Would send ${emailItems.length} email(s). Skipping actual send.`);
  } else {
    sendResults = await sendAllEmails(emailItems);
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nWORKFLOW RUN COMPLETE in ${elapsedSec}s`);
  console.log(`  Run type: ${runTypeInfo.runType}`);
  console.log(`  Major news day: ${isMajorNewsDay}`);
  console.log(`  News matched: ${newsResult.stats.matched} | Breaking: ${newsResult.stats.breaking}`);
  console.log(`  Calendar events today: ${eventsResult.totalEvents} (High: ${eventsResult.highImpactCount})`);
  console.log(`  COT instruments: ${cotResult.cotData.length}`);
  console.log(`  Subscribers: ${subscribers.length}`);
  console.log(`  Emails sent: ${sendResults.filter((r) => r.ok).length}/${sendResults.length}\n`);

  const result = { runTypeInfo, eventsResult, newsResult, cotResult, fedwatchResult, promptResult, aiResult, emailItems, sendResults, isMajorNewsDay };
  const saved = saveWorkflowResult(result);
  await logRunToSheet(saved);
  return result;
}

module.exports = { runWorkflow };


