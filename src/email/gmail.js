const nodemailer = require('nodemailer');
const config = require('../config');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { clientId, clientSecret, refreshToken, senderEmail } = config.gmail;

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    throw new Error(
      'Gmail OAuth2 credentials missing. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, ' +
        'GMAIL_REFRESH_TOKEN and GMAIL_SENDER_EMAIL in .env. See README for the one-time auth steps.'
    );
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: senderEmail,
      clientId,
      clientSecret,
      refreshToken,
    },
  });

  return cachedTransporter;
}

/**
 * Port of the n8n "Send a message" Gmail node.
 * emailItem: { html, subject, to, userName }
 */
async function sendEmail(emailItem) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${config.gmail.senderName}" <${config.gmail.senderEmail}>`,
    to: emailItem.to,
    replyTo: config.gmail.replyTo || config.gmail.senderEmail,
    subject: emailItem.subject,
    html: emailItem.html,
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
