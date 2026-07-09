const db = require('../db');
const { getMetaApi } = require('./provisioning');

// One live MetaApi streaming connection per connected account, keyed by our
// own connected_accounts.id (not MetaApi's account id). The MetaApi SDK
// already maintains a local, continuously-synced copy of positions/account
// info on connection.terminalState — we just hold the connection object open
// and read from it on demand rather than mirroring it into our own cache.
const connections = new Map();

function setStatus(connectedAccountId, status, detail = null) {
  db.prepare('UPDATE connected_accounts SET status = ?, status_detail = ? WHERE id = ?').run(
    status,
    detail,
    connectedAccountId
  );
}

async function connect(connectedAccountRow) {
  const { id, metaapi_account_id } = connectedAccountRow;
  if (connections.has(id)) return connections.get(id);

  try {
    const api = getMetaApi();
    const account = await api.metatraderAccountApi.getAccount(metaapi_account_id);

    if (account.state !== 'DEPLOYED') {
      await account.deploy();
    }
    await account.waitDeployed();

    const connection = account.getStreamingConnection();
    await connection.connect();
    await connection.waitSynchronized();

    connections.set(id, { account, connection });
    setStatus(id, 'active');
    return connections.get(id);
  } catch (err) {
    setStatus(id, 'error', err.message);
    throw err;
  }
}

async function disconnect(connectedAccountId) {
  const entry = connections.get(connectedAccountId);
  if (entry) {
    await entry.connection.close();
    connections.delete(connectedAccountId);
  }
}

function getEntry(connectedAccountId) {
  return connections.get(connectedAccountId) || null;
}

function getPositions(connectedAccountId) {
  return getEntry(connectedAccountId)?.connection.terminalState.positions || [];
}

function getAccountInformation(connectedAccountId) {
  return getEntry(connectedAccountId)?.connection.terminalState.accountInformation || null;
}

function getHistoryStorage(connectedAccountId) {
  return getEntry(connectedAccountId)?.connection.historyStorage || null;
}

function isConnected(connectedAccountId) {
  return connections.has(connectedAccountId);
}

// Called once at server boot to re-establish streaming connections for every
// account that was previously active, so a server restart doesn't strand
// users on a "Disconnected" status until they reconnect manually.
async function reconnectAll() {
  const rows = db
    .prepare(`SELECT * FROM connected_accounts WHERE disconnected_at IS NULL AND status != 'disconnected'`)
    .all();
  for (const row of rows) {
    connect(row).catch((err) => {
      console.warn(`[MetaApi] Failed to reconnect account ${row.id}:`, err.message);
    });
  }
}

module.exports = {
  connect,
  disconnect,
  getPositions,
  getAccountInformation,
  getHistoryStorage,
  isConnected,
  reconnectAll,
};
