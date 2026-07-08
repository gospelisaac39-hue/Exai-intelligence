const { fundamentalsAnalyst } = require('./agents/fundamentalsAnalyst');
const { sentimentAnalyst } = require('./agents/sentimentAnalyst');
const { positioningAnalyst } = require('./agents/positioningAnalyst');
const { bullResearcher } = require('./agents/bullResearcher');
const { bearResearcher } = require('./agents/bearResearcher');
const { traderDesk } = require('./agents/trader');
const { riskManager } = require('./agents/riskManager');

/**
 * Small delay to avoid Groq rate limits
 */
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * RESILIENT MULTI-AGENT ORCHESTRATOR
 * 
 * No hard failures. Each agent works with whatever data it has.
 * Staggered calls to avoid API rate limits.
 * Always produces a final decision, even if inconclusive.
 */
async function runDebateOrchestration(contextData) {
  const results = {
    timestamp: new Date().toISOString(),
    agents: {},
    finalDecision: null,
    errors: []
  };

  console.log('[Orchestrator] Starting debate pipeline...');

  try {
    // ============================================================
    // PHASE 1: Sequential Analysts (staggered to avoid rate limits)
    // ============================================================
    console.log('[Phase 1] Running analysts (fundamentals, sentiment, positioning)...');
    
    const fundamentalsResult = await fundamentalsAnalyst(contextData.fundamentalsContext || {}).catch(e => {
      console.warn('[Fundamentals] Failed:', e.message);
      return { error: e.message, view: 'data unavailable' };
    });
    await delay(500);

    const sentimentResult = await sentimentAnalyst(contextData.sentimentContext || {}).catch(e => {
      console.warn('[Sentiment] Failed:', e.message);
      return { error: e.message, view: 'data unavailable' };
    });
    await delay(500);

    const positioningResult = await positioningAnalyst(contextData.positioningContext || {}).catch(e => {
      console.warn('[Positioning] Failed:', e.message);
      return { error: e.message, view: 'data unavailable' };
    });

    results.agents.fundamentals = extractResult(fundamentalsResult);
    results.agents.sentiment = extractResult(sentimentResult);
    results.agents.positioning = extractResult(positioningResult);

    console.log(`  ✓ Fundamentals: ${results.agents.fundamentals.status}`);
    console.log(`  ✓ Sentiment: ${results.agents.sentiment.status}`);
    console.log(`  ✓ Positioning: ${results.agents.positioning.status}`);

    // ============================================================
    // PHASE 2: Sequential Debate Researchers (staggered)
    // ============================================================
    console.log('[Phase 2] Running debate researchers (bull vs bear)...');

    const debateInputs = {
      fundamentals: results.agents.fundamentals.output,
      sentiment: results.agents.sentiment.output,
      positioning: results.agents.positioning.output
    };

    const bullResult = await bullResearcher(debateInputs).catch(e => {
      console.warn('[Bull] Failed:', e.message);
      return { error: e.message, argument: 'Bull case unavailable' };
    });
    await delay(500);

    const bearResult = await bearResearcher(debateInputs).catch(e => {
      console.warn('[Bear] Failed:', e.message);
      return { error: e.message, argument: 'Bear case unavailable' };
    });

    results.agents.bullCase = extractResult(bullResult);
    results.agents.bearCase = extractResult(bearResult);

    console.log(`  ✓ Bull: ${results.agents.bullCase.status}`);
    console.log(`  ✓ Bear: ${results.agents.bearCase.status}`);

    // ============================================================
    // PHASE 3: Trader Desk
    // ============================================================
    console.log('[Phase 3] Trader desk synthesizing...');
    await delay(300);

    const traderInputs = {
      bullArgument: results.agents.bullCase.output?.argument || 'unavailable',
      bearArgument: results.agents.bearCase.output?.argument || 'unavailable',
      analysts: {
        fundamentals: results.agents.fundamentals.output,
        sentiment: results.agents.sentiment.output,
        positioning: results.agents.positioning.output
      }
    };

    const traderResult = await traderDesk(traderInputs).catch(e => {
      console.warn('[Trader] Failed:', e.message);
      return { error: e.message, decision: 'HOLD', conviction: 5 };
    });

    results.agents.trader = extractResult(traderResult);
    console.log(`  ✓ Trader: ${results.agents.trader.status}`);

    // ============================================================
    // PHASE 4: Risk Manager
    // ============================================================
    console.log('[Phase 4] Risk manager approval...');
    await delay(300);

    const riskInputs = {
      traderDecision: results.agents.trader.output,
      cotData: contextData.positioningContext?.cotData || []
    };

    const riskResult = await riskManager(riskInputs).catch(e => {
      console.warn('[Risk] Failed:', e.message);
      return { error: e.message, approved: true, adjustedConviction: 5 };
    });

    results.agents.riskManager = extractResult(riskResult);
    console.log(`  ✓ Risk: ${results.agents.riskManager.status}`);

    // ============================================================
    // FINAL DECISION
    // ============================================================
    results.finalDecision = {
      decision: results.agents.trader.output?.decision || 'HOLD',
      instrument: results.agents.trader.output?.instrument || 'EUR/USD',
      conviction: results.agents.riskManager.output?.adjustedConviction || 5,
      approved: results.agents.riskManager.output?.approved !== false,
      thesis: results.agents.trader.output?.thesis || 'Insufficient data',
      positionSize: results.agents.riskManager.output?.positionSize || 'standard',
      bullArgument: results.agents.bullCase.output?.argument || '',
      bearArgument: results.agents.bearCase.output?.argument || ''
    };

    console.log('[Orchestrator] ✓ Pipeline complete.');
  } catch (err) {
    console.error('[Orchestrator] Fatal error:', err);
    results.errors.push(err.message);
  }

  return results;
}

/**
 * Wrap an agent's resolved value (each call site already awaits its
 * promise and catches rejections into an { error, ... } fallback object,
 * so there's no rejected case to handle here — only success vs. partial).
 */
function extractResult(value) {
  if (value?.error) {
    return {
      status: 'partial',
      error: value.error,
      output: value
    };
  }

  return {
    status: 'success',
    error: null,
    output: value
  };
}

module.exports = { runDebateOrchestration };
