const axios = require('axios');

// ============================================================
// EXAI FEDWATCH v4 — ported from n8n
// Dual source: Investing.com + ZQ futures fallback + static default
// ============================================================

async function fetchFedWatch() {
  let html = '';
  let source = 'none';

  try {
    const res = await axios.get('https://www.investing.com/central-banks/fed-rate-monitor', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.investing.com/',
      },
    });
    html = res.data;
    source = 'investing.com';
    console.log('[FedWatch] Investing.com fetch OK, length:', html.length);
  } catch (e) {
    console.log('[FedWatch] Investing.com fetch failed:', e.message);
  }

  let meetings = [];

  if (html && html.length > 500) {
    const datePattern = /(\w+ \d{4})[^%]*?(\d{1,3}(?:\.\d{1,2})?)%[^%]*?(\d{1,3}(?:\.\d{1,2})?)%[^%]*?(\d{1,3}(?:\.\d{1,2})?)%/g;
    let m;
    while ((m = datePattern.exec(html)) !== null) {
      const cut = parseFloat(m[2]);
      const hold = parseFloat(m[3]);
      const hike = parseFloat(m[4]);
      const total = cut + hold + hike;
      if (total > 80 && total < 120) {
        meetings.push({ date: m[1], cut, hold, hike });
        if (meetings.length >= 6) break;
      }
    }

    if (meetings.length === 0) {
      const altPattern = /(\d{1,3}\.\d{1,2})%[\s\S]{1,200}?(\d{1,3}\.\d{1,2})%[\s\S]{1,200}?(\d{1,3}\.\d{1,2})%/g;
      while ((m = altPattern.exec(html)) !== null) {
        const vals = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        const total = vals.reduce((a, b) => a + b, 0);
        if (total > 85 && total < 115) {
          meetings.push({ date: 'Next FOMC', cut: vals[0], hold: vals[1], hike: vals[2] });
          break;
        }
      }
    }
  }

  if (meetings.length === 0) {
    console.log('[FedWatch] Falling back to ZQ futures calculation...');
    try {
      const zqRes = await axios.get(
        'https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/305/G?quoteCodes=null&_=',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
            Referer: 'https://www.cmegroup.com/',
          },
        }
      );
      const zqData = zqRes.data;
      const quotes = zqData?.quotes || [];
      const currentRate = 4.375;

      for (const contract of quotes.slice(0, 6)) {
        const price = parseFloat(contract?.last || contract?.settle || 0);
        if (!price || price < 90) continue;

        const impliedRate = 100 - price;
        const diff = impliedRate - currentRate;

        const cutProb = diff < -0.12 ? Math.min(95, Math.round((Math.abs(diff) / 0.25) * 100)) : diff < 0 ? 30 : 5;
        const hikeProb = diff > 0.12 ? Math.min(95, Math.round((diff / 0.25) * 100)) : diff > 0 ? 10 : 2;
        const holdProb = Math.max(0, 100 - cutProb - hikeProb);

        meetings.push({
          date: contract.expirationDate || contract.contractMonth || 'FOMC',
          cut: cutProb,
          hold: holdProb,
          hike: hikeProb,
          impliedRate: impliedRate.toFixed(3),
          calculatedFrom: 'ZQ futures',
        });
      }
      if (meetings.length > 0) source = 'ZQ futures calc';
    } catch (e) {
      console.log('[FedWatch] ZQ futures fetch failed:', e.message);
    }
  }

  if (meetings.length === 0) {
    console.log('[FedWatch] Using static default...');
    meetings = [
      { date: 'May 2026', cut: 18, hold: 78, hike: 4, isDefault: true },
      { date: 'Jun 2026', cut: 42, hold: 55, hike: 3, isDefault: true },
      { date: 'Jul 2026', cut: 28, hold: 68, hike: 4, isDefault: true },
    ];
    source = 'static_default';
  }

  const nextMeeting = meetings[0] || null;

  function buildNarrative(m, src) {
    if (!m) return 'FedWatch data unavailable.';

    const dominant = m.cut > m.hold && m.cut > m.hike ? 'cut' : m.hold > m.cut && m.hold > m.hike ? 'hold' : 'hike';
    const domPct = Math.max(m.cut, m.hold, m.hike);

    const conviction = domPct >= 80 ? 'near-certain' : domPct >= 65 ? 'strong' : domPct >= 50 ? 'moderate' : 'split';

    const implications = {
      cut: {
        'near-certain': 'Dollar already pricing the cut. A hold would cause a VIOLENT Dollar rally and Gold selloff.',
        strong: 'Dollar has sold ahead. If cut delivered exactly as priced → institutions BUY Dollar back (sell the rumour, buy the news).',
        moderate: 'Cut is leading but not fully priced. A hold triggers a sharp Dollar squeeze.',
        split: 'Market genuinely uncertain. Trade the reaction — not the prediction.',
      },
      hold: {
        'near-certain': 'Hold fully priced. Watch Powell language — any dovish tilt moves Gold sharply.',
        strong: 'Hold expected. Dovish surprise → Gold bid. Hawkish surprise → Dollar up.',
        moderate: 'Hold is base case but limited conviction. Any FOMC surprise reprices aggressively.',
        split: 'Uncertain between hold and cut. High volatility regardless of outcome.',
      },
      hike: {
        'near-certain': 'Hike fully priced — watch for sell-the-fact reversal after announcement.',
        strong: 'Hike leading — Dollar positive bias. A hold causes sharp Dollar selloff.',
        moderate: 'Hike possible but not dominant — a hike would cause significant Dollar strength.',
        split: 'Hike probability meaningful. Communication around path matters more than this decision.',
      },
    };

    const isDefault = m.isDefault ? ' [Estimated — live data unavailable]' : ` [Source: ${src}]`;
    const impl = implications[dominant]?.[conviction] || 'Monitor FOMC language carefully.';

    return `Next FOMC (${m.date}): Market pricing ${domPct.toFixed(1)}% probability of a rate ${dominant} (${conviction} conviction). Cut: ${
      m.cut.toFixed ? m.cut.toFixed(1) : m.cut
    }% | Hold: ${m.hold.toFixed ? m.hold.toFixed(1) : m.hold}% | Hike: ${m.hike.toFixed ? m.hike.toFixed(1) : m.hike}%.${isDefault} ${impl}`;
  }

  const narrative = buildNarrative(nextMeeting, source);

  console.log(`[FedWatch] ${meetings.length} meetings | source: ${source}`);

  return {
    fedwatchAvailable: meetings.length > 0,
    source,
    nextMeeting,
    allMeetings: meetings.slice(0, 6),
    narrative,
    cutProbability: nextMeeting?.cut ?? null,
    holdProbability: nextMeeting?.hold ?? null,
    hikeProbability: nextMeeting?.hike ?? null,
    nextMeetingDate: nextMeeting?.date ?? null,
  };
}

module.exports = { fetchFedWatch };
