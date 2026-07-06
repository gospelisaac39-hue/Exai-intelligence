// ============================================================
// EXAI PARSE TELEGRAM (ported from n8n)
// Strips @BRICSNews tag + smart source labelling
// ============================================================

function parseTelegram(rawHtml) {
  const raw = rawHtml || '';
  const posts = [];
  const regex = /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    let text = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

    text = text.replace(/@[A-Za-z0-9_]+/g, '').trim();
    text = text.replace(/\s{2,}/g, ' ').trim();

    const isBreaking = text.toLowerCase().startsWith('just in');
    text = text.replace(/^just in\s*[:\-–—]?\s*/i, '').trim();

    if (!text || text.length < 20) continue;

    const t = text.toLowerCase();

    let source = 'Global Markets';
    if (t.includes('federal reserve') || t.includes('fed ') || t.includes('fomc') || t.includes('powell'))
      source = 'Fed Watch';
    else if (t.includes('gold') || t.includes('xau') || t.includes('silver') || t.includes('bullion'))
      source = 'Commodities Desk';
    else if (t.includes('oil') || t.includes('opec') || t.includes('crude') || t.includes('brent') || t.includes('wti'))
      source = 'Energy Markets';
    else if (t.includes('china') || t.includes('yuan') || t.includes('cny') || t.includes('beijing') || t.includes('pboc'))
      source = 'Asia Markets';
    else if (t.includes('russia') || t.includes('ukraine') || t.includes('kremlin') || t.includes('sanctions'))
      source = 'Geopolitical Wire';
    else if (t.includes('iran') || t.includes('middle east') || t.includes('gulf') || t.includes('israel'))
      source = 'Geopolitical Wire';
    else if (t.includes('nato') || t.includes('trump') || t.includes('tariff') || t.includes('white house'))
      source = 'US Policy Desk';
    else if (t.includes('dollar') || t.includes('usd') || t.includes('dxy') || t.includes('forex') || t.includes('currency'))
      source = 'FX Markets';
    else if (t.includes('ecb') || t.includes('euro') || t.includes('lagarde') || t.includes('eurozone'))
      source = 'Europe Markets';
    else if (t.includes('inflation') || t.includes('cpi') || t.includes('ppi') || t.includes('pce'))
      source = 'Inflation Watch';
    else if (t.includes('brics') || t.includes('emerging market') || t.includes('de-dollarization'))
      source = 'Emerging Markets';
    else if (t.includes('bank of england') || t.includes('boe') || t.includes('pound') || t.includes('gbp'))
      source = 'UK Markets';
    else if (t.includes('bank of japan') || t.includes('boj') || t.includes('yen') || t.includes('jpy'))
      source = 'Asia Markets';
    else if (t.includes('bitcoin') || t.includes('crypto') || t.includes('btc'))
      source = 'Crypto Markets';
    else if (t.includes('imf') || t.includes('world bank') || t.includes('g7') || t.includes('g20'))
      source = 'Global Policy';

    posts.push({
      source,
      isBreaking,
      title: text.substring(0, 160).trim(),
      description: text.substring(0, 500),
      link: 'https://t.me/bricsnews',
      pubDate: new Date().toISOString(),
    });
  }

  console.log(`[ParseTelegram] posts parsed: ${posts.length}`);
  return { telegramArticles: posts.slice(0, 40) };
}

module.exports = { parseTelegram };
