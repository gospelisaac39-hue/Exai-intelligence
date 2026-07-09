const jwt = require('jsonwebtoken');
const config = require('../config');

const COOKIE_NAME = 'exai_session';

function issueSessionCookie(res, user) {
  if (!config.auth.jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }
  const token = jwt.sign({ sub: user.id }, config.auth.jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}

module.exports = { requireAuth, issueSessionCookie, clearSessionCookie, COOKIE_NAME };
