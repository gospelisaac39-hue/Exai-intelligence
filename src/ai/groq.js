const axios = require('axios');
const config = require('../config');

/**
 * Port of the n8n "Ai" code node.
 * IMPORTANT: the original n8n export had a live Groq API key hardcoded
 * in plain text. That key must be treated as compromised, revoked in
 * the Groq console, and replaced with a new one in .env (GROQ_API_KEY).
 */
async function callGroq(prompt) {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }

  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: config.groq.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!data.choices || !data.choices[0]) {
    throw new Error('Invalid Groq response: ' + JSON.stringify(data));
  }

  const analysis = data.choices[0].message.content;
  return { text: analysis };
}

module.exports = { callGroq };
