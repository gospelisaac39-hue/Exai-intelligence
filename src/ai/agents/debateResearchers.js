const { callGroq } = require('../groq');

/**
 * Bull Researcher
 * Arguments for bullish case (150-200 words, plain text)
 */
async function bullResearcher(debateInputs = {}) {
  const fundamentals = debateInputs.fundamentals || {};
  const sentiment = debateInputs.sentiment || {};
  const positioning = debateInputs.positioning || {};

  const prompt = `You are a bull-case researcher on a forex trading desk. The team has provided three analyst views:

FUNDAMENTALS: ${fundamentals.view || 'neutral'} (confidence: ${fundamentals.confidence || 0}/10)
  Drivers: ${(fundamentals.keyDrivers || []).join(', ') || 'unknown'}

SENTIMENT: ${sentiment.view || 'neutral'} (confidence: ${sentiment.confidence || 0}/10)
  Tone: ${sentiment.tone || 'unknown'}

POSITIONING: ${positioning.view || 'balanced'} (crowding: ${positioning.crowding || 'unknown'})

You must argue the BULL case for USD strength. Find any bullish angles, even if narrow.
Write 150-200 words of compelling bull argument. Plain text, no JSON, no markdown.
Focus on: rates, technicals, positioning opportunities, macro tailwinds.`;

  try {
    const response = await callGroq(prompt);
    return {
      argument: response.trim().substring(0, 500) // Cap at 500 chars for safety
    };
  } catch (err) {
    console.warn('[Bull] Failed:', err.message);
    return {
      argument: 'Bull case: USD strength supported by higher rates and risk-off positioning. Pending data.',
      error: err.message
    };
  }
}

/**
 * Bear Researcher
 * Arguments for bearish case (150-200 words, plain text)
 */
async function bearResearcher(debateInputs = {}) {
  const fundamentals = debateInputs.fundamentals || {};
  const sentiment = debateInputs.sentiment || {};
  const positioning = debateInputs.positioning || {};

  const prompt = `You are a bear-case researcher on a forex trading desk. The team has provided three analyst views:

FUNDAMENTALS: ${fundamentals.view || 'neutral'} (confidence: ${fundamentals.confidence || 0}/10)
  Drivers: ${(fundamentals.keyDrivers || []).join(', ') || 'unknown'}

SENTIMENT: ${sentiment.view || 'neutral'} (confidence: ${sentiment.confidence || 0}/10)
  Tone: ${sentiment.tone || 'unknown'}

POSITIONING: ${positioning.view || 'balanced'} (crowding: ${positioning.crowding || 'unknown'})

You must argue the BEAR case against USD strength. Find bearish angles in the data.
Write 150-200 words of compelling bear argument. Plain text, no JSON, no markdown.
Focus on: Fed pivot risk, crowded positioning, technical resistance, EUR/GBP strength.`;

  try {
    const response = await callGroq(prompt);
    return {
      argument: response.trim().substring(0, 500)
    };
  } catch (err) {
    console.warn('[Bear] Failed:', err.message);
    return {
      argument: 'Bear case: USD reversal risk from Fed pivot, crowded shorts in EUR. Consolidation likely.',
      error: err.message
    };
  }
}

module.exports = { bullResearcher, bearResearcher };
