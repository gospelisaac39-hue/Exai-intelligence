const { traderDesk, riskManager } = require('./decisionMakers');

module.exports = {
  traderDesk: (ctx) => traderDesk(ctx)
};
