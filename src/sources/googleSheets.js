const { google } = require('googleapis');
const config = require('../config');

let cachedClient = null;

function getAuthClient() {
  if (cachedClient) return cachedClient;

  if (!config.googleServiceAccount.email || !config.googleServiceAccount.privateKey) {
    throw new Error(
      'Google Service Account credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and ' +
        'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env (see README for setup steps).'
    );
  }

  cachedClient = new google.auth.JWT(
    config.googleServiceAccount.email,
    null,
    config.googleServiceAccount.privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return cachedClient;
}

/**
 * Reads all rows from a sheet tab and returns them as an array of
 * objects keyed by the header row — same shape n8n's Google Sheets
 * node gives you (item.json.email, item.json.status, etc).
 */
async function readSheetAsObjects(spreadsheetId, sheetTabName) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetTabName,
  });

  const rows = data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

/**
 * Port of n8n "Get row(s) in sheet" + "Code in JavaScript" nodes:
 * fetch subscribers, keep only active rows with a valid email.
 */
async function getActiveSubscribers() {
  const rows = await readSheetAsObjects(config.sheets.subscribersSheetId, config.sheets.subscribersTab);

  return rows.filter((row) => {
    const email = row.email || row.Email || row.EMAIL || row['Email Address'] || '';
    const status = row.status || row.Status || row.STATUS || 'active';
    return email && email.includes('@') && status.toLowerCase() === 'active';
  });
}

/**
 * Port of n8n "Fetch Actuals" node: reads the "Exai Indicators" sheet
 * which holds today's released economic actuals (e.g. from JBlanked).
 */
async function fetchActuals() {
  const rows = await readSheetAsObjects(config.sheets.indicatorsSheetId, config.sheets.indicatorsTab);
  return { actualsData: rows };
}

module.exports = { getActiveSubscribers, fetchActuals, readSheetAsObjects };


/**
 * Appends a single row to a sheet tab. Used for run logging and
 * weekly calendar snapshots. Values must already be in column order.
 */
async function appendRow(spreadsheetId, sheetTabName, values) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetTabName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

module.exports.appendRow = appendRow;
