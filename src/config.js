require('dotenv').config();

function required(name) {
  // Returns the value but doesn't throw at import time — individual
  // modules check before they actually need the value, so `node-cron`
  // can still boot and tell you exactly what's missing.
  return process.env[name] || '';
}

module.exports = {
  groq: {
    apiKey: required('GROQ_API_KEY'),
    model: 'llama-3.3-70b-versatile',
  },

  gmail: {
    clientId: required('GMAIL_CLIENT_ID'),
    clientSecret: required('GMAIL_CLIENT_SECRET'),
    refreshToken: required('GMAIL_REFRESH_TOKEN'),
    senderEmail: required('GMAIL_SENDER_EMAIL'),
    senderName: process.env.GMAIL_SENDER_NAME || 'EXAI Intelligence',
    replyTo: required('GMAIL_REPLY_TO'),
  },

  googleServiceAccount: {
    email: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: required('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },

  sheets: {
    subscribersSheetId: required('SUBSCRIBERS_SHEET_ID'),
    subscribersTab: process.env.SUBSCRIBERS_SHEET_TAB || 'Sheet1',
    indicatorsSheetId: required('INDICATORS_SHEET_ID'),
    indicatorsTab: process.env.INDICATORS_SHEET_TAB || 'Sheet1',
  },

  schedule: {
    cron: process.env.CRON_SCHEDULE || '0 6,14 * * 1-5',
    timezone: process.env.TIMEZONE || 'Africa/Lagos',
  },
};
