const { fetchForexFactoryEnhanced } = require('./sources/forexFactory');
const { parseEvents } = require('./processing/parseEvents');
const { checkEventLifecycle } = require('./eventWatcher');
const { runDebateOrchestration } = require('./ai/orchestrator');
const { formatPreAlertEmail } = require('./email/formatPreAlertEmail');
const { formatPostReleaseEmail } = require('./email/formatPostReleaseEmail');
const { getActiveSubscribers } = require('./sources/googleSheets');
const { sendAllEmails } = require('./email/gmail');

/**
 * Runs every 15 minutes. Cheap check - only hits ForexFactory's live
 * actuals scrape, no Groq/Telegram/COT unless a postRelease action
 * actually fires (only then is the full debate worth the API cost).
 */
async function tickEventWatcher() {
  const rawEvents = await fetchForexFactoryEnhanced().catch((e) => {
    console.log('[Ticker] ForexFactory fetch failed:', e.message);
    return [];
  });

  if (!rawEvents.length) return;

  const parsed = parseEvents(rawEvents);
  const usdHighToday = parsed.highImpactEvents; // already filtered to USD + high + today in parseEvents

  if (!usdHighToday.length) return;

  // Actuals lookup checks the SAME scrape result - other currencies'
  // actuals are present in `rawEvents` too and get cached implicitly
  // via parseEvents' allEvents, even though we only alert on USD.
  function actualsLookup(ev) {
    const match = rawEvents.find(
      (r) => (r.currency || '').toUpperCase() === ev.currency &&
             (r.title || '').toUpperCase() === ev.event.toUpperCase()
    );
    return match ? match.actual : null;
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
        const { preparePrompt } = require('./processing/preparePrompt');
        const { fetchAndParseCOT } = require('./sources/cot');
        const { fetchFedWatch } = require('./sources/fedwatch');
        const { fetchActuals } = require('./sources/googleSheets');
        const { fetchTelegram } = require('./sources/telegram');
        const { parseTelegram } = require('./processing/parseTelegram');
        const { filterAndCategorizeNews } = require('./processing/filterNews');

        const [cotResult, fedwatchResult, actualsResult, telegramHtml] = await Promise.all([
          fetchAndParseCOT(),
          fetchFedWatch(),
          fetchActuals().catch(() => ({ actualsData: [] })),
          fetchTelegram().catch(() => ''),
        ]);

        const telegramParsed = parseTelegram(telegramHtml);
        const newsResult = filterAndCategorizeNews(telegramParsed.telegramArticles);
        const promptResult = preparePrompt(parsed, cotResult, fedwatchResult, actualsResult);
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

