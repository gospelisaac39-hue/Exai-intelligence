const { callGroq } = require('../groq');

/**
 * Takes last week's actual-vs-forecast events and asks Groq to write
 * natural-language highlights - like a market commentator, not a system.
 * Explicitly instructed to never mention agents, debates, AI, or internals.
 */
async function weeklyHighlights(lastWeekEvents = []) {
  if (!lastWeekEvents.length) {
    return 'Markets were quiet last week - no major economic releases moved the calendar significantly.';
  }

  const eventLines = lastWeekEvents
    .filter(e => e.actual && e.actual !== 'N/A')
    .slice(0, 15)
    .map(e => `- ${e.currency} ${e.title}: actual ${e.actual}, forecast ${e.forecast}, previous ${e.previous}`)
    .join('\n');

  const prompt = `You are a market commentator writing the highlights section of a weekly newsletter for forex and gold traders.

Write 3-4 short paragraphs summarizing what happened in the market last week, based on this data:

${eventLines}

Rules:
- Write like a human market commentator, plain confident language, no jargon-stuffing.
- Do NOT mention "AI", "agents", "debate", "orchestration", "model", or anything about how this analysis was produced.
- Focus on what moved, which currencies were affected, and what surprised versus expectations.
- Do not invent numbers not present in the data above.
- No headers, no bullet points, just flowing prose paragraphs.`;

  try {
    const response = await callGroq(prompt);
    return typeof response === 'string' ? response : (response.text || response.content?.[0]?.text || '');
  } catch (err) {
    console.warn('[WeeklyHighlights] Failed:', err.message);
    return 'Last week brought a mix of economic data across major currencies - check the calendar below for what is coming up next.';
  }
}

module.exports = { weeklyHighlights };
