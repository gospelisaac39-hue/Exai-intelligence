const { fetchForexFactoryEnhanced } = require('./sources/forexFactory');
const { fetchAndParseCOT } = require('./sources/cot');
const { fetchFedWatch } = require('./sources/fedwatch');
const { fetchActuals, getActiveSubscribers } = require('./sources/googleSheets');
const { fetchTelegram } = require('./sources/telegram');
const { parseTelegram } = require('./processing/parseTelegram');
const { filterAndCategorizeNews } = require('./processing/filterNews');
const { parseEvents } = require('./processing/parseEvents');
const { preparePrompt } = require('./processing/preparePrompt');
const { checkEventLifecycle } = require('./eventWatcher');
const { checkBreakingNews } = require('./newsAlert');
const { runDebateOrchestration } = require('./ai/orchestrator');
const { formatPreAlertEmail } = require('./email/formatPreAlertEmail');
const { formatPostReleaseEmail } = require('./email/formatPostReleaseEmail');
const { sendAllEmails } = require('./email/gmail');
const { updateLiveData } = require('./dashboard/dataStore');
const { runMarketIntelligenceLayer } = require('./marketIntelligence');

// Finds a released actual for `ev` in the Exai Indicators sheet, which
// is the real source of truth for actuals (JBlanked-fed) — ForexFactory's
// HTML actuals scrape below is frequently blocked (403) and only used as
// a fallback. Matches on currency + today's date first exact-name, then
// fuzzy substring, to avoid mismatching against older rows for an
// identically-named event on a different day.
function findSheetActual(ev, actualsRows, todayDateKey) {
  const evName = ev.event.toUpperCase();
  const sameDay = actualsRows.filter(
    (a) => (a.currency || '').toUpperCase() === ev.currency && a.event_date === todayDateKey
  );
  let match = sameDay.find((a) => (a.event_name || '').toUpperCase() === evName);
  if (!match) {
    match = sameDay.find((a) => {
      const acName = (a.event_name || '').toUpperCase();
      return acName.includes(evName) || evName.includes(acName);
    });
  }
  return match && match.actual ? match.actual : null;
}

/**
 * Runs every 15 minutes. Always refreshes the dashboard's live data
 * (calendar/COT/FedWatch snapshot — cheap, no Groq) and checks for
 * severe breaking headlines, then checks whether any high-impact USD
 * event needs a pre-alert (30 min out) or post-release (5 min after
 * actual) email. The full multi-agent debate only runs for an actual
 * post-release event — that's the only case worth the Groq cost.
 */
async function tickEventWatcher() {
  const [rawEvents, cotResult, fedwatchResult, actualsResult, telegramHtml] = await Promise.all([
    fetchForexFactoryEnhanced().catch((e) => {
      console.log('[Ticker] ForexFactory fetch failed:', e.message);
      return [];
    }),
    fetchAndParseCOT().catch(() => ({ cotData: [] })),
    fetchFedWatch().catch(() => ({ allMeetings: [] })),
    fetchActuals().catch(() => ({ actualsData: [] })),
    fetchTelegram().catch(() => ''),
  ]);

  const telegramParsed = parseTelegram(telegramHtml);
  const newsResult = filterAndCategorizeNews(telegramParsed.telegramArticles);

  // Severe-headline check runs every tick regardless of the calendar.
  await checkBreakingNews(newsResult).catch((e) => console.error('[Ticker] Breaking news check failed:', e.message));

  // parseEvents([]) still returns a valid (empty) structure, so the
  // market intelligence layer below runs even if ForexFactory's fetch
  // failed this tick — prices/bias/news/sentiment must never go quiet
  // just because the calendar fetch did.
  const parsed = parseEvents(rawEvents);

  const marketIntel = await runMarketIntelligenceLayer({
    eventsResult: parsed,
    newsResult,
    cotResult,
    fedwatchResult,
  });

  // Keep the dashboard fresh every tick, independent of whether any
  // alert fires below. Fields the market intel layer omitted (a failed
  // fetch/call this tick) are left untouched by the merge in
  // updateLiveData, preserving the last successful value.
  updateLiveData({
    calendar: parsed.allEvents,
    calendarWeek: parsed.weekCalendarAll,
    cotData: cotResult.cotData || [],
    fedwatchData: fedwatchResult.allMeetings || [],
    ...marketIntel,
  });

  if (!rawEvents.length) return;

  const usdHighToday = parsed.highImpactEvents;
  if (!usdHighToday.length) return;

  const actualsRows = actualsResult.actualsData || [];

  function actualsLookup(ev) {
    const sheetActual = findSheetActual(ev, actualsRows, parsed.date);
    if (sheetActual) return sheetActual;
    const ffMatch = rawEvents.find(
      (r) => (r.currency || '').toUpperCase() === ev.currency && (r.title || '').toUpperCase() === ev.event.toUpperCase()
    );
    return ffMatch ? ffMatch.actual : null;
  }

  const actions = checkEventLifecycle(usdHighToday, actualsLookup);
  if (!actions.length) return;

  const subscribers = await getActiveSubscribers().catch(() => []);

  for (const action of actions) {
    if (action.action === 'preAlert') {
      console.log(`[Ticker] Pre-alert firing for ${action.event.event} (30 min out)`);
      const emailItems = formatPreAlertEmail(action.event, subscribers);
      await sendAllEmails(emailItems);
    }

    if (action.action === 'postRelease') {
      console.log(`[Ticker] Post-release firing for ${action.event.event} - running full debate...`);
      try {
        const promptResult = preparePrompt(parsed, cotResult, fedwatchResult, actualsResult, newsResult);
        const aiResult = await runDebateOrchestration(promptResult);

        const emailItems = formatPostReleaseEmail(action.event, action.actual, promptResult, aiResult, newsResult, subscribers);
        await sendAllEmails(emailItems);
      } catch (err) {
        console.error('[Ticker] Post-release debate failed:', err.message);
      }
    }
  }
}

module.exports = { tickEventWatcher };
