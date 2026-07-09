const axios = require('axios');
const config = require('../config');

// Scoped copy of the root pipeline's callGroq pattern (src/ai/groq.js) —
// this app's Groq calls only ever receive pre-computed aggregate numbers,
// never raw account credentials or unaggregated trade rows.
async function callGroq(prompt) {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }

  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: config.groq.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
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

  return data.choices[0].message.content.trim();
}

module.exports = { callGroq };
