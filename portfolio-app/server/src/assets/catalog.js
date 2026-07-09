// The fixed set of assets EXAI tracks. Kept small and aligned with
// src/sources/cot.js's INSTRUMENTS list in the root pipeline so COT
// positioning data lines up 1:1 with what a user can watch here.
// tvSymbol is TradingView's ticker format, used by the embeddable
// widgets for live price/chart display (no API key needed).
const ASSET_CATALOG = [
  { symbol: 'XAU/USD', label: 'Gold', category: 'Metals', tvSymbol: 'OANDA:XAUUSD' },
  { symbol: 'WTI/USD', label: 'WTI Crude Oil', category: 'Energy', tvSymbol: 'TVC:USOIL' },
  { symbol: 'DXY', label: 'US Dollar Index', category: 'Index', tvSymbol: 'TVC:DXY' },
  { symbol: 'EUR/USD', label: 'EUR/USD', category: 'Forex', tvSymbol: 'FX:EURUSD' },
  { symbol: 'GBP/USD', label: 'GBP/USD', category: 'Forex', tvSymbol: 'FX:GBPUSD' },
  { symbol: 'USD/JPY', label: 'USD/JPY', category: 'Forex', tvSymbol: 'FX:USDJPY' },
  { symbol: 'AUD/USD', label: 'AUD/USD', category: 'Forex', tvSymbol: 'FX:AUDUSD' },
  { symbol: 'USD/CAD', label: 'USD/CAD', category: 'Forex', tvSymbol: 'FX:USDCAD' },
  { symbol: 'NZD/USD', label: 'NZD/USD', category: 'Forex', tvSymbol: 'FX:NZDUSD' },
  { symbol: 'USD/CHF', label: 'USD/CHF', category: 'Forex', tvSymbol: 'FX:USDCHF' },
];

const VALID_SYMBOLS = new Set(ASSET_CATALOG.map((a) => a.symbol));

module.exports = { ASSET_CATALOG, VALID_SYMBOLS };
