const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { hashPassword, verifyPassword } = require('./password');
const { requireAuth, issueSessionCookie, clearSessionCookie } = require('./middleware');
const { VALID_SYMBOLS } = require('../assets/catalog');

const router = express.Router();

const TRADER_TYPES = ['independent_trader', 'portfolio_manager', 'prop_firm_trader', 'investment_club'];

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    baseCurrency: row.base_currency,
    traderType: row.trader_type,
    onboarded: !!row.onboarded_at,
  };
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(120),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password, displayName } = parsed.data;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
    .run(email, passwordHash, displayName);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  issueSessionCookie(res, user);
  res.status(201).json({ user: toPublicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const { email, password } = parsed.data;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  issueSessionCookie(res, user);
  res.json({ user: toPublicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
});

const onboardingSchema = z.object({
  baseCurrency: z.string().length(3),
  traderType: z.enum(TRADER_TYPES).optional(),
  assets: z.array(z.string()).min(1, 'Select at least one asset you trade'),
});

router.post('/onboarding', requireAuth, (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { baseCurrency, traderType, assets } = parsed.data;

  const symbols = [...new Set(assets)].filter((s) => VALID_SYMBOLS.has(s));
  if (symbols.length === 0) {
    return res.status(400).json({ error: 'None of the selected assets are recognized' });
  }

  db.exec('BEGIN');
  try {
    db.prepare(
      `UPDATE users SET base_currency = ?, trader_type = ?, onboarded_at = datetime('now') WHERE id = ?`
    ).run(baseCurrency.toUpperCase(), traderType || null, req.userId);

    db.prepare('DELETE FROM watched_assets WHERE user_id = ?').run(req.userId);
    const insert = db.prepare('INSERT INTO watched_assets (user_id, symbol) VALUES (?, ?)');
    symbols.forEach((symbol) => insert.run(req.userId, symbol));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: toPublicUser(user) });
});

module.exports = router;
