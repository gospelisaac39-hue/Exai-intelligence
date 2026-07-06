const { callGroq } = require('../groq');

/**
 * Trader Desk
 * Synthesizes debate and returns final trade decision
 * Returns: { decision, instrument, conviction, thesis, invalidation, error? }
 */
async function traderDesk(traderInputs = {}) {
  const bullArg = traderInputs.bullArgument || 'unavailable';
  const bearArg = traderInputs.bearArgument || 'unavailable';
  const analysts = traderInputs.analysts || {};

  const prompt = `You are the trader synthesizing a debate between bull and bear researchers, 
informed by three analyst views (fundamentals, sentiment, positioning).

BULL ARGUMENT:
${bullArg}

BEAR ARGUMENT:
${bearArg}

FUNDAMENTALS: ${analysts.fundamentals?.view || 'unknown'} (confidence: ${analysts.fundamentals?.confidence || 0})
SENTIMENT: ${analysts.sentiment?.view || 'unknown'} (confidence: ${analysts.sentiment?.confidence || 0})
POSITIONING: ${analysts.positioning?.view || 'unknown'} (crowding: ${analysts.positioning?.crowding || 'unknown'})

Return ONLY valid JSON:
{
  "decision": "LONG EUR/USD" or "SHORT" or "HOLD",
  "instrument": "EUR/USD" or "GBP/USD" or similar,
  "conviction": number 1-10,
  "thesis": "two sentence thesis",
  "invalidation": "key level/event that invalidates this trade"
}`;

  try {
    const response = await callGroq(prompt);
    const parsed = parseJSON(response);
    
    return {
      decision: parsed.decision || 'HOLD',
      instrument: parsed.instrument || 'EUR/USD',
      conviction: Math.max(1, Math.min(10, parsed.conviction || 5)),
      thesis: parsed.thesis || 'Inconclusive debate.',
      invalidation: parsed.invalidation || 'Close if thesis breaks'
    };
  } catch (err) {
    console.warn('[Trader] Parse error:', err.message);
    return {
      decision: 'HOLD',
      instrument: 'EUR/USD',
      conviction: 5,
      thesis: 'Debate inconclusive, holding position.',
      invalidation: 'Any reversal signal',
      error: err.message
    };
  }
}

/**
 * Risk Manager
 * Reviews trader decision against COT and position sizing
 * Returns: { approved, adjustedConviction, positionSize, overrideReason?, error? }
 */
async function riskManager(riskInputs = {}) {
  const traderDec = riskInputs.traderDecision || {};
  const cotData = riskInputs.cotData || [];

  const cotSummary = cotData.length > 0
    ? cotData.slice(0, 3).map(c => `${c.instrument}: ${c.netLong > 0 ? 'LONG' : 'SHORT'}`).join(', ')
    : 'No COT data';

  const prompt = `You are a risk manager. Review the trader's decision and position sizing vs COT.

TRADER DECISION:
- Action: ${traderDec.decision || 'unknown'}
- Instrument: ${traderDec.instrument || 'unknown'}
- Conviction: ${traderDec.conviction || 5}/10
- Thesis: ${traderDec.thesis || 'unknown'}

COT POSITIONING:
${cotSummary}

Is this trade aligned with positioning? Should position size be reduced/standard/elevated?

Return ONLY valid JSON:
{
  "approved": true or false,
  "adjustedConviction": number 1-10,
  "positionSize": "reduced" or "standard" or "elevated",
  "overrideReason": "why you reduced/adjusted" or null
}`;

  try {
    const response = await callGroq(prompt);
    const parsed = parseJSON(response);
    
    return {
      approved: parsed.approved !== false,
      adjustedConviction: Math.max(1, Math.min(10, parsed.adjustedConviction || traderDec.conviction || 5)),
      positionSize: parsed.positionSize || 'standard',
      overrideReason: parsed.overrideReason || null
    };
  } catch (err) {
    console.warn('[Risk] Parse error:', err.message);
    // Risk manager always approves (fail-safe)
    return {
      approved: true,
      adjustedConviction: Math.max(1, Math.min(10, (traderDec.conviction || 5) - 1)),
      positionSize: 'standard',
      overrideReason: 'Risk manager error; conservative adjustment applied',
      error: err.message
    };
  }
}

/**
 * Parse JSON with fallbacks
 */
function parseJSON(text) {
  if (!text) return {};
  
  // If already object, return it
  if (typeof text === 'object') {
    return text;
  }

  // Ensure string
  if (typeof text !== 'string') {
    text = String(text);
  }
  
  try {
    return JSON.parse(text);
  } catch (e1) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {}
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e3) {}
    }

    throw new Error('No valid JSON found');
  }
}

module.exports = { traderDesk, riskManager };
