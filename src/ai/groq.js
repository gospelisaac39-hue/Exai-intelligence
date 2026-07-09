const axios = require('axios');
const config = require('../config');

/**
 * Port of the n8n "Ai" code node.
 * IMPORTANT: the original n8n export had a live Groq API key hardcoded
 * in plain text. That key must be treated as compromised, revoked in
 * the Groq console, and replaced with a new one in .env (GROQ_API_KEY).
 */
async function callGroq(prompt, options = {}) {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }

  const body = {
    model: config.groq.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
    headers: {
      Authorization: `Bearer ${config.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!data.choices || !data.choices[0]) {
    throw new Error('Invalid Groq response: ' + JSON.stringify(data));
  }

  const analysis = data.choices[0].message.content;
  return analysis;
}

/**
 * Same as callGroq but parses the JSON response — the bias engine and
 * news interpreter both need structured output, not free text. Falls
 * back to extracting the first {...}/[...] block if the model wraps
 * JSON in prose despite response_format.
 */
async function callGroqJSON(prompt, options = {}) {
  const raw = await callGroq(prompt, { ...options, jsonMode: true });
  try {
    return JSON.parse(raw);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Groq did not return parseable JSON: ' + raw.slice(0, 200));
  }
}

module.exports = { callGroq, callGroqJSON };
