/**
 * ONE-TIME SETUP SCRIPT — run this once locally to generate a Gmail
 * OAuth2 refresh token, then paste it into your .env as GMAIL_REFRESH_TOKEN.
 *
 * Usage:
 *   node scripts/gmailAuth.js
 *
 * Prerequisites:
 *   - GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET already set in .env
 *   - Those came from a Google Cloud OAuth client of type "Desktop app"
 *   - Your Google Cloud project has the Gmail API enabled
 */
require('dotenv').config();
const readline = require('readline');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // works for Desktop app OAuth clients

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://mail.google.com/'],
});

console.log('\n1. Open this URL in your browser and sign in with the Gmail account EXAI should send from:\n');
console.log(authUrl);
console.log('\n2. After approving, Google will show you a code. Paste it below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\nSuccess! Add this line to your .env file:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n(If refresh_token is missing, revoke prior access at https://myaccount.google.com/permissions and try again.)');
  } catch (err) {
    console.error('Failed to retrieve token:', err.message);
  }
});
