const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { requireAuth } = require('../auth/middleware');
const { provisionAccount, removeAccount } = require('../metaapi/provisioning');
const connectionManager = require('../metaapi/connectionManager');

const router = express.Router();

const BROKERS = ['Exness', 'HFM', 'FXTM', 'XM', 'Other'];

function toPublicAccount(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    broker: row.broker,
    server: row.server,
    login: row.login,
    platform: row.platform,
    status: row.status,
    statusDetail: row.status_detail,
    connectedAt: row.connected_at,
  };
}

function getOwnedAccountOr404(req, res) {
  const row = db
    .prepare('SELECT * FROM connected_accounts WHERE id = ? AND user_id = ? AND disconnected_at IS NULL')
    .get(req.params.id, req.userId);
  if (!row) {
    res.status(404).json({ error: 'Account not found' });
    return null;
  }
  return row;
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM connected_accounts WHERE user_id = ? AND disconnected_at IS NULL ORDER BY connected_at ASC`
    )
    .all(req.userId);
  res.json({ accounts: rows.map(toPublicAccount) });
});

router.get('/:id', requireAuth, (req, res) => {
  const row = getOwnedAccountOr404(req, res);
  if (!row) return;
  res.json({ account: toPublicAccount(row) });
});

const connectSchema = z
  .object({
    nickname: z.string().min(1).max(80),
    broker: z.enum(BROKERS),
    server: z.string().min(1).max(120),
    login: z.string().min(1).max(40),
    investorPassword: z.string().min(1).max(200),
    platform: z.enum(['mt4', 'mt5']).default('mt5'),
  })
  .refine((data) => data.broker !== 'Other' || data.server.trim().length > 0, {
    message: 'Server name is required',
    path: ['server'],
  });

router.post('/', requireAuth, async (req, res) => {
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { nickname, broker, server, login, investorPassword, platform } = parsed.data;

  let provisioned;
  try {
    provisioned = await provisionAccount({ nickname, broker, server, login, investorPassword, platform });
  } catch (err) {
    return res.status(422).json({ error: err.message, code: err.code || 'unknown' });
  }

  const result = db
    .prepare(
      `INSERT INTO connected_accounts (user_id, nickname, broker, server, login, platform, metaapi_account_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'connecting')`
    )
    .run(req.userId, nickname, broker, server, login, platform, provisioned.metaapiAccountId);

  const row = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(result.lastInsertRowid);

  // Deployment + streaming sync can take from a few seconds to a couple of
  // minutes depending on the broker — don't block the HTTP response on it.
  // The frontend polls GET /api/accounts/:id until status flips to 'active'.
  connectionManager.connect(row).catch((err) => {
    console.warn(`[Accounts] Background connect failed for account ${row.id}:`, err.message);
  });

  res.status(201).json({ account: toPublicAccount(row) });
});

const patchSchema = z.object({
  nickname: z.string().min(1).max(80),
});

router.patch('/:id', requireAuth, (req, res) => {
  const row = getOwnedAccountOr404(req, res);
  if (!row) return;

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A valid nickname is required' });
  }

  db.prepare('UPDATE connected_accounts SET nickname = ? WHERE id = ?').run(parsed.data.nickname, row.id);
  const updated = db.prepare('SELECT * FROM connected_accounts WHERE id = ?').get(row.id);
  res.json({ account: toPublicAccount(updated) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const row = getOwnedAccountOr404(req, res);
  if (!row) return;

  await connectionManager.disconnect(row.id);

  if (row.metaapi_account_id) {
    try {
      await removeAccount(row.metaapi_account_id);
    } catch (err) {
      console.warn(`[Accounts] Failed to remove MetaApi account for connected_account ${row.id}:`, err.message);
    }
  }

  db.prepare(`UPDATE connected_accounts SET status = 'disconnected', disconnected_at = datetime('now') WHERE id = ?`).run(
    row.id
  );

  res.json({ ok: true });
});

module.exports = router;
