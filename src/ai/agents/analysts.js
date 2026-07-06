const { callGroq } = require('../groq');

/**
 * Fundamentals Analyst
 * Analyzes economic calendar, actual data, and chain context
 * Returns: { view, confidence, drivers, error? }
 */
async function fundamentalsAnalyst(contextData = {}) {
  const events = contextData.todayEvents || [];
  const actuals = contextData.actuals || [];
  const chain = contextData.chainContext || '';

  const prompt = `You are a forex fundamentals analyst. Analyze the economic data and return your view in JSON.

TODAY'S ECONOMIC EVENTS:
${events.length > 0 ? events.map(e => `- ${e.time}: ${e.title} (Impact: ${e.impact})`).join('\n') : 'No high-impact events'}

ACTUAL DATA (Recent releases):
${actuals.length > 0 ? actuals.map(a => `- ${a.indicator}: ${a.value} (Expected: ${a.expected}, Prior: ${a.prior})`).join('\n') : 'No recent actuals'}

CHAIN CONTEXT:
${chain || 'No prior context'}

Return ONLY valid JSON in this format:
{
  "view": "brief usd bias (bullish/neutral/bearish)",
  "confidence": number between 1-10,
  "keyDrivers": ["driver1", "driver2"],
  "reasoning": "one sentence explanation"
}`;

  try {
    const response = await callGroq(prompt);
    const parsed = parseJSON(response);
    
    return {
      view: parsed.view || 'neutral',
      confidence: parsed.confidence || 5,
      keyDrivers: parsed.keyDrivers || [],
      reasoning: parsed.reasoning || 'Insufficient data'
    };
  } catch (err) {
    console.warn('[Fundamentals] Parse error:', err.message);
    return {
      view: 'neutral',
      confidence: 3,
      keyDrivers: [],
      reasoning: 'Data processing error',
      error: err.message
    };
  }
}

/**
 * Sentiment Analyst
 * Analyzes news, breaking news, social sentiment
 * Returns: { view, confidence, tone, error? }
 */
async function sentimentAnalyst(contextData = {}) {
  const breaking = contextData.breaking || [];
  const bullish = contextData.bullish || [];
  const bearish = contextData.bearish || [];
  const summary = contextData.summary || '';

  const prompt = `You are a forex sentiment analyst. Analyze market news and return your view in JSON.

BREAKING NEWS:
${breaking.length > 0 ? breaking.join('\n') : 'No breaking news'}

BULLISH NEWS:
${bullish.length > 0 ? bullish.slice(0, 3).join('\n') : 'No bullish news'}

BEARISH NEWS:
${bearish.length > 0 ? bearish.slice(0, 3).join('\n') : 'No bearish news'}

SUMMARY:
${summary || 'No summary available'}

Return ONLY valid JSON:
{
  "view": "bullish/neutral/bearish sentiment",
  "confidence": number between 1-10,
  "tone": "risk-on/risk-off/neutral",
  "reasoning": "one sentence"
}`;

  try {
    const response = await callGroq(prompt);
    const parsed = parseJSON(response);
    
    return {
      view: parsed.view || 'neutral',
      confidence: parsed.confidence || 5,
      tone: parsed.tone || 'neutral',
      reasoning: parsed.reasoning || 'Insufficient sentiment data'
    };
  } catch (err) {
    console.warn('[Sentiment] Parse error:', err.message);
    return {
      view: 'neutral',
      confidence: 3,
      tone: 'neutral',
      reasoning: 'Sentiment data unavailable',
      error: err.message
    };
  }
}

/**
 * Positioning Analyst
 * Analyzes COT data, FedWatch, positioning
 * Returns: { view, confidence, crowding, error? }
 */
async function positioningAnalyst(contextData = {}) {
  const cot = contextData.cotData || [];
  const fedwatch = contextData.fedwatch || [];
  const history = contextData.history || '';

  const cotSummary = cot.length > 0
    ? cot.map(c => `${c.instrument}: ${c.netLong > 0 ? 'NET LONG' : 'NET SHORT'} (${Math.abs(c.netLong)} contracts)`).join('\n')
    : 'No COT data';

  const fedSummary = fedwatch.length > 0
    ? fedwatch.map(f => `${f.month}: ${f.hold}% hold, ${f.cut}% cut`).join('\n')
    : 'No FedWatch data';

  const prompt = `You are a forex positioning analyst. Analyze COT and rate positioning in JSON.

COT POSITIONING (Non-commercial):
${cotSummary}

FEDWATCH ODDS:
${fedSummary}

HISTORICAL CONTEXT:
${history || 'No historical data'}

Return ONLY valid JSON:
{
  "view": "positioning bias (long/short/balanced)",
  "confidence": number between 1-10,
  "crowding": "crowded/moderate/sparse",
  "reasoning": "one sentence about positioning"
}`;

  try {
    const response = await callGroq(prompt);
    const parsed = parseJSON(response);
    
    return {
      view: parsed.view || 'balanced',
      confidence: parsed.confidence || 5,
      crowding: parsed.crowding || 'moderate',
      reasoning: parsed.reasoning || 'Insufficient positioning data'
    };
  } catch (err) {
    console.warn('[Positioning] Parse error:', err.message);
    return {
      view: 'balanced',
      confidence: 3,
      crowding: 'unknown',
      reasoning: 'Positioning data unavailable',
      error: err.message
    };
  }
}

/**
 * Parse JSON response from Groq, handling common format issues
 */
function parseJSON(text) {
  if (!text) return {};
  
  // If it's already an object, return it
  if (typeof text === 'object') {
    return text;
  }
  
  // Ensure it's a string
  if (typeof text !== 'string') {
    text = String(text);
  }
  
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.warn('Failed to parse JSON from code block');
      }
    }

    // Try finding JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e3) {
        console.warn('Failed to parse JSON from text');
      }
    }

    throw new Error('No valid JSON found in response');
  }
}

module.exports = { fundamentalsAnalyst, sentimentAnalyst, positioningAnalyst };
