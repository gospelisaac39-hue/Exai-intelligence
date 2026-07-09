const path = require('path');

// Reuses the pipeline's canonical asset universe (same cross-repo
// pattern as calendar/routes.js and intelligence/routes.js) instead of
// maintaining a second, drifting list here.
const { ASSET_CATALOG, DEFAULT_WATCHLIST, VALID_SYMBOLS, getAsset } = require(
  path.join(__dirname, '../../../../src/assetCatalog')
);

module.exports = { ASSET_CATALOG, DEFAULT_WATCHLIST, VALID_SYMBOLS, getAsset };
