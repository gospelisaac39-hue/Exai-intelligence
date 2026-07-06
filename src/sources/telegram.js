const axios = require('axios');

/**
 * Port of the n8n "Telegram" HTTP Request node.
 * Fetches the public web-preview page for the @bricsnews channel.
 * Returns raw HTML — parsing happens in processing/parseTelegram.js
 */
async function fetchTelegram() {
  const { data } = await axios.get('https://t.me/s/bricsnews', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  return data; // raw HTML string
}

module.exports = { fetchTelegram };
