const axios = require('axios');

// ============================================================
// EXAI PARSE COT — v9 (ported from n8n)
// Fixes: enforces strict date separation between this/prev week
// All 8 pairs | Non-commercial positions | Signed WoW changes
// ============================================================

const COT_URL =
  'https://publicreporting.cftc.gov/resource/6dca-aqww.json?$order=report_date_as_yyyy_mm_dd DESC&$limit=1000';

const INSTRUMENTS = [
  { match: 'GOLD', label: 'Gold', emoji: '🥇', pair: 'XAU/USD' },
  { match: 'CRUDE OIL', label: 'WTI Crude', emoji: '🛢', pair: 'WTI/USD' },
  { match: 'DOLLAR INDEX', label: 'DXY', emoji: '💵', pair: 'DXY' },
  { match: 'EURO FX', label: 'EUR/USD', emoji: '🇪🇺', pair: 'EUR/USD' },
  { match: 'BRITISH POUND', label: 'GBP/USD', emoji: '🇬🇧', pair: 'GBP/USD' },
  { match: 'JAPANESE YEN', label: 'USD/JPY', emoji: '🇯🇵', pair: 'USD/JPY' },
  { match: 'AUSTRALIAN DOLLAR', label: 'AUD/USD', emoji: '🇦🇺', pair: 'AUD/USD' },
  { match: 'CANADIAN DOLLAR', label: 'USD/CAD', emoji: '🇨🇦', pair: 'USD/CAD' },
];

const toInt = (val) => parseInt(val || 0, 10);
const sign = (n) => (n === null ? 'N/A' : n >= 0 ? `+${n.toLocaleString()}` : `${n.toLocaleString()}`);

function getDirection(changeNet, deltaValid) {
  if (!deltaValid || changeNet === null) return 'UNKNOWN — sanity check failed';
  if (changeNet > 5000) return 'BULLISH — specs aggressively adding longs';
  if (changeNet > 1000) return 'BULLISH — specs adding longs';
  if (changeNet > 200) return 'MILDLY BULLISH — specs trimming shorts';
  if (changeNet >= -200) return 'NEUTRAL — no meaningful change';
  if (changeNet > -1000) return 'MILDLY BEARISH — specs trimming longs';
  if (changeNet > -5000) return 'BEARISH — specs adding shorts';
  return 'BEARISH — specs aggressively adding shorts';
}

function getMechanism(changeLong, changeShort, deltaValid) {
  if (!deltaValid || changeLong === null || changeShort === null) return 'N/A';
  const longMove = changeLong >= 0 ? `added ${sign(changeLong)} longs` : `removed ${sign(changeLong)} longs`;
  const shortMove = changeShort >= 0 ? `added ${sign(changeShort)} shorts` : `covered ${sign(changeShort)} shorts`;
  return `Specs ${longMove} and ${shortMove}`;
}

async function fetchAndParseCOT() {
  let records = [];

  try {
    const { data } = await axios.get(COT_URL, { headers: { Accept: 'application/json' } });
    records = Array.isArray(data) ? data : [];
    console.log(`[COT] Records fetched: ${records.length}`);
  } catch (err) {
    console.log('[COT] fetch failed:', err.message);
    return { cotData: [], cotAvailable: false, cotError: err.message };
  }

  if (records.length === 0) {
    return { cotData: [], cotAvailable: false, cotError: 'No records returned' };
  }

  const slots = {};

  outer: for (const rec of records) {
    const name = (rec.market_and_exchange_names || '').toUpperCase();
    const recDate = (rec.report_date_as_yyyy_mm_dd || '').split('T')[0];

    for (const inst of INSTRUMENTS) {
      if (!name.includes(inst.match)) continue;

      const slot = slots[inst.pair];

      if (!slot) {
        slots[inst.pair] = { thisDate: recDate, thisRec: rec, prevDate: null, prevRec: null };
        continue outer;
      }

      if (!slot.prevRec && recDate < slot.thisDate) {
        slot.prevDate = recDate;
        slot.prevRec = rec;
        continue outer;
      }

      continue outer;
    }

    if (INSTRUMENTS.every((i) => slots[i.pair]?.prevRec)) break;
  }

  const cotData = [];

  for (const inst of INSTRUMENTS) {
    const slot = slots[inst.pair];
    if (!slot?.thisRec) {
      console.log(`[COT] SKIPPED ${inst.pair} — no data`);
      continue;
    }

    const rec = slot.thisRec;
    const prev = slot.prevRec;

    const long = toInt(rec.noncomm_positions_long_all || rec.noncommercial_long);
    const short = toInt(rec.noncomm_positions_short_all || rec.noncommercial_short);
    const net = long - short;

    const prevLong = prev ? toInt(prev.noncomm_positions_long_all || prev.noncommercial_long) : null;
    const prevShort = prev ? toInt(prev.noncomm_positions_short_all || prev.noncommercial_short) : null;
    const prevNet = prevLong !== null && prevShort !== null ? prevLong - prevShort : null;

    const changeLong = prevLong !== null ? long - prevLong : null;
    const changeShort = prevShort !== null ? short - prevShort : null;
    const changeNet = prevNet !== null ? net - prevNet : null;

    const openInterest = toInt(rec.open_interest_all || rec.open_interest);
    const deltaValid = changeNet !== null && openInterest > 0 && Math.abs(changeNet) < openInterest * 0.2;

    const direction = getDirection(changeNet, deltaValid);
    const mechanism = getMechanism(changeLong, changeShort, deltaValid);

    cotData.push({
      pair: inst.pair,
      label: inst.label,
      emoji: inst.emoji,
      reportDate: slot.thisDate,
      prevDate: slot.prevDate,
      long,
      short,
      net,
      prevLong,
      prevShort,
      prevNet,
      changeLong,
      changeShort,
      changeNet,
      changeLongDisplay: sign(changeLong),
      changeShortDisplay: sign(changeShort),
      changeNetDisplay: sign(changeNet),
      openInterest,
      deltaValid,
      direction,
      mechanism,
      summary: `${inst.emoji} ${inst.label}: net ${sign(net)} | WoW ${sign(changeNet)} | ${direction}`,
    });
  }

  console.log(`[COT] complete: ${cotData.length} instruments`);
  return { cotData, cotAvailable: cotData.length > 0 };
}

module.exports = { fetchAndParseCOT };
