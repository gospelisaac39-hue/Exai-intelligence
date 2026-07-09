const { google } = require('googleapis');
const config = require('../config');

let cachedGmailClient = null;

function getGmailClient() {
  if (cachedGmailClient) return cachedGmailClient;

  const { clientId, clientSecret, refreshToken, senderEmail } = config.gmail;

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    throw new Error(
      'Gmail OAuth2 credentials missing. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, ' +
        'GMAIL_REFRESH_TOKEN and GMAIL_SENDER_EMAIL in .env. See README for the one-time auth steps.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  cachedGmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return cachedGmailClient;
}

function encodeHeader(text) {
  return `=?UTF-8?B?${Buffer.from(text, 'utf-8').toString('base64')}?=`;
}

function buildRawMessage({ from, fromName, to, replyTo, subject, html }) {
  const lines = [
    `From: "${fromName}" <${from}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
  ];
  return Buffer.from(lines.join('\r\n'), 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends over the Gmail API (HTTPS, port 443) instead of raw SMTP.
 * Railway — like most PaaS hosts — blocks outbound SMTP ports
 * (465/587) to prevent spam abuse, which made the old Nodemailer SMTP
 * transport hang and time out on every send in production despite
 * working fine locally. The refresh token already carries the full
 * https://mail.google.com/ scope, so no re-auth is needed.
 * Port of the n8n "Send a message" Gmail node.
 * emailItem: { html, subject, to, userName }
 */
async function sendEmail(emailItem) {
  const gmail = getGmailClient();
  const raw = buildRawMessage({
    from: config.gmail.senderEmail,
    fromName: config.gmail.senderName,
    to: emailItem.to,
    replyTo: config.gmail.replyTo || config.gmail.senderEmail,
    subject: emailItem.subject,
    html: emailItem.html,
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}

async function sendAllEmails(emailItems) {
  const results = [];
  for (const item of emailItems) {
    try {
      await sendEmail(item);
      console.log(`[Gmail] Sent to ${item.to}`);
      results.push({ to: item.to, ok: true });
    } catch (err) {
      console.log(`[Gmail] FAILED to send to ${item.to}:`, err.message);
      results.push({ to: item.to, ok: false, error: err.message });
    }
  }
  return results;
}

module.exports = { sendEmail, sendAllEmails };
