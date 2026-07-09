require('dotenv').config();

function required(name) {
  // Returns the value but doesn't throw at import time — individual
  // modules check before they actually need the value, so the server
  // can still boot and tell you exactly what's missing.
  return process.env[name] || '';
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  auth: {
    jwtSecret: required('JWT_SECRET'),
  },

  db: {
    path: process.env.DATABASE_PATH || './data/portfolio.sqlite',
  },

  metaapi: {
    token: required('METAAPI_TOKEN'),
  },

  groq: {
    apiKey: required('GROQ_API_KEY'),
    model: 'llama-3.3-70b-versatile',
  },
};
