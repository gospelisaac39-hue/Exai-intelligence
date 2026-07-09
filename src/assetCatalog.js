// ============================================================
// EXAI CANONICAL ASSET UNIVERSE — spec Section 4.7
// Single source of truth for both the pipeline (bias engine, price
// fetcher) and portfolio-app's watchlist UI, which requires this file
// directly (same cross-repo pattern as dataStore.js / forexFactory.js).
// ============================================================

const ASSET_CATALOG = [
  // FX Majors
  { symbol: 'EUR/USD', label: 'EUR/USD', category: 'FX Majors', currencies: ['EUR', 'USD'], yahoo: 'EURUSD=X', tv: 'FX:EURUSD', precision: 5 },
  { symbol: 'GBP/USD', label: 'GBP/USD', category: 'FX Majors', currencies: ['GBP', 'USD'], yahoo: 'GBPUSD=X', tv: 'FX:GBPUSD', precision: 5 },
  { symbol: 'USD/JPY', label: 'USD/JPY', category: 'FX Majors', currencies: ['USD', 'JPY'], yahoo: 'USDJPY=X', tv: 'FX:USDJPY', precision: 3 },
  { symbol: 'USD/CHF', label: 'USD/CHF', category: 'FX Majors', currencies: ['USD', 'CHF'], yahoo: 'CHF=X', tv: 'FX:USDCHF', precision: 5 },
  { symbol: 'USD/CAD', label: 'USD/CAD', category: 'FX Majors', currencies: ['USD', 'CAD'], yahoo: 'CAD=X', tv: 'FX:USDCAD', precision: 5 },
  { symbol: 'AUD/USD', label: 'AUD/USD', category: 'FX Majors', currencies: ['AUD', 'USD'], yahoo: 'AUDUSD=X', tv: 'FX:AUDUSD', precision: 5 },
  { symbol: 'NZD/USD', label: 'NZD/USD', category: 'FX Majors', currencies: ['NZD', 'USD'], yahoo: 'NZDUSD=X', tv: 'FX:NZDUSD', precision: 5 },

  // FX Minors / Crosses
  { symbol: 'EUR/GBP', label: 'EUR/GBP', category: 'FX Crosses', currencies: ['EUR', 'GBP'], yahoo: 'EURGBP=X', tv: 'FX:EURGBP', precision: 5 },
  { symbol: 'EUR/JPY', label: 'EUR/JPY', category: 'FX Crosses', currencies: ['EUR', 'JPY'], yahoo: 'EURJPY=X', tv: 'FX:EURJPY', precision: 3 },
  { symbol: 'GBP/JPY', label: 'GBP/JPY', category: 'FX Crosses', currencies: ['GBP', 'JPY'], yahoo: 'GBPJPY=X', tv: 'FX:GBPJPY', precision: 3 },
  { symbol: 'EUR/AUD', label: 'EUR/AUD', category: 'FX Crosses', currencies: ['EUR', 'AUD'], yahoo: 'EURAUD=X', tv: 'FX:EURAUD', precision: 5 },
  { symbol: 'EUR/CHF', label: 'EUR/CHF', category: 'FX Crosses', currencies: ['EUR', 'CHF'], yahoo: 'EURCHF=X', tv: 'FX:EURCHF', precision: 5 },
  { symbol: 'AUD/JPY', label: 'AUD/JPY', category: 'FX Crosses', currencies: ['AUD', 'JPY'], yahoo: 'AUDJPY=X', tv: 'FX:AUDJPY', precision: 3 },
  { symbol: 'CAD/JPY', label: 'CAD/JPY', category: 'FX Crosses', currencies: ['CAD', 'JPY'], yahoo: 'CADJPY=X', tv: 'FX:CADJPY', precision: 3 },
  { symbol: 'CHF/JPY', label: 'CHF/JPY', category: 'FX Crosses', currencies: ['CHF', 'JPY'], yahoo: 'CHFJPY=X', tv: 'FX:CHFJPY', precision: 3 },
  { symbol: 'AUD/NZD', label: 'AUD/NZD', category: 'FX Crosses', currencies: ['AUD', 'NZD'], yahoo: 'AUDNZD=X', tv: 'FX:AUDNZD', precision: 5 },
  { symbol: 'GBP/CHF', label: 'GBP/CHF', category: 'FX Crosses', currencies: ['GBP', 'CHF'], yahoo: 'GBPCHF=X', tv: 'FX:GBPCHF', precision: 5 },
  { symbol: 'GBP/AUD', label: 'GBP/AUD', category: 'FX Crosses', currencies: ['GBP', 'AUD'], yahoo: 'GBPAUD=X', tv: 'FX:GBPAUD', precision: 5 },
  { symbol: 'NZD/JPY', label: 'NZD/JPY', category: 'FX Crosses', currencies: ['NZD', 'JPY'], yahoo: 'NZDJPY=X', tv: 'FX:NZDJPY', precision: 3 },

  // Metals
  { symbol: 'XAU/USD', label: 'Gold', category: 'Metals', currencies: ['USD'], yahoo: 'GC=F', tv: 'OANDA:XAUUSD', precision: 2 },
  { symbol: 'XAG/USD', label: 'Silver', category: 'Metals', currencies: ['USD'], yahoo: 'SI=F', tv: 'OANDA:XAGUSD', precision: 3 },
  { symbol: 'XPT/USD', label: 'Platinum', category: 'Metals', currencies: ['USD'], yahoo: 'PL=F', tv: 'OANDA:XPTUSD', precision: 2 },
  { symbol: 'XPD/USD', label: 'Palladium', category: 'Metals', currencies: ['USD'], yahoo: 'PA=F', tv: 'OANDA:XPDUSD', precision: 2 },

  // Indices
  { symbol: 'US500', label: 'S&P 500', category: 'Indices', currencies: ['USD'], yahoo: '^GSPC', tv: 'TVC:SPX', precision: 1 },
  { symbol: 'US100', label: 'Nasdaq 100', category: 'Indices', currencies: ['USD'], yahoo: '^NDX', tv: 'TVC:NDX', precision: 1 },
  { symbol: 'US30', label: 'Dow Jones', category: 'Indices', currencies: ['USD'], yahoo: '^DJI', tv: 'TVC:DJI', precision: 1 },
  { symbol: 'GER40', label: 'DAX 40', category: 'Indices', currencies: ['EUR'], yahoo: '^GDAXI', tv: 'XETR:DAX', precision: 1 },
  { symbol: 'UK100', label: 'FTSE 100', category: 'Indices', currencies: ['GBP'], yahoo: '^FTSE', tv: 'TVC:UKX', precision: 1 },
  { symbol: 'JP225', label: 'Nikkei 225', category: 'Indices', currencies: ['JPY'], yahoo: '^N225', tv: 'TVC:NI225', precision: 0 },
  { symbol: 'HK50', label: 'Hang Seng', category: 'Indices', currencies: ['CNY'], yahoo: '^HSI', tv: 'TVC:HSI', precision: 0 },

  // Energy
  { symbol: 'WTI', label: 'WTI Crude Oil', category: 'Energy', currencies: ['USD'], yahoo: 'CL=F', tv: 'TVC:USOIL', precision: 2 },
  { symbol: 'BRENT', label: 'Brent Crude Oil', category: 'Energy', currencies: ['USD'], yahoo: 'BZ=F', tv: 'TVC:UKOIL', precision: 2 },
  { symbol: 'NATGAS', label: 'Natural Gas', category: 'Energy', currencies: ['USD'], yahoo: 'NG=F', tv: 'TVC:NATURALGAS', precision: 3 },

  // Crypto
  { symbol: 'BTC/USD', label: 'Bitcoin', category: 'Crypto', currencies: ['USD'], yahoo: 'BTC-USD', tv: 'COINBASE:BTCUSD', precision: 0 },
  { symbol: 'ETH/USD', label: 'Ethereum', category: 'Crypto', currencies: ['USD'], yahoo: 'ETH-USD', tv: 'COINBASE:ETHUSD', precision: 2 },
  { symbol: 'SOL/USD', label: 'Solana', category: 'Crypto', currencies: ['USD'], yahoo: 'SOL-USD', tv: 'COINBASE:SOLUSD', precision: 2 },

  // Other
  { symbol: 'DXY', label: 'US Dollar Index', category: 'Other', currencies: ['USD'], yahoo: 'DX-Y.NYB', tv: 'TVC:DXY', precision: 3 },
  { symbol: 'US10Y', label: 'US 10Y Yield', category: 'Other', currencies: ['USD'], yahoo: '^TNX', tv: 'TVC:US10Y', precision: 3 },
];

// Default watchlist for new users, per spec Section 4.7.
const DEFAULT_WATCHLIST = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'US100', 'BTC/USD', 'WTI'];

const VALID_SYMBOLS = new Set(ASSET_CATALOG.map((a) => a.symbol));

function getAsset(symbol) {
  return ASSET_CATALOG.find((a) => a.symbol === symbol) || null;
}

module.exports = { ASSET_CATALOG, DEFAULT_WATCHLIST, VALID_SYMBOLS, getAsset };
