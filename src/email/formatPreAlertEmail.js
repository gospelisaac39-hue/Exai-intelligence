function formatPreAlertEmail(event, subscribers) {
  const html = `
  <div style="background:#F4F4F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:8px;border:1px solid #EBEBEB;padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#CC2200;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Releasing in 30 minutes</p>
      <h1 style="font-size:20px;color:#111;margin:0 0 14px;">${event.currency} - ${event.event}</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr><td style="padding:6px 0;color:#888;font-size:13px;">Previous</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#111;font-weight:600;">${event.previous || '\u2014'}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px;">Forecast</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#111;font-weight:600;">${event.forecast || '\u2014'}</td></tr>
      </table>
      <p style="font-size:13px;color:#555;line-height:1.6;margin:0;">EXAI will send the full read the moment this releases and settles - watch your inbox.</p>
    </div>
  </div>`;

  const subject = `${event.currency} ${event.event} releases in 30 min`;
  const list = Array.isArray(subscribers) ? subscribers : [];
  return list.map((s) => {
    const email = typeof s === 'string' ? s : (s.email || s.Email || '');
    return { to: email, subject, html };
  }).filter((i) => !!i.to);
}

module.exports = { formatPreAlertEmail };
