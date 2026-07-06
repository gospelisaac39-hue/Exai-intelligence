const { traderDesk, riskManager } = require('./decisionMakers');

module.exports = {
  riskManager: (ctx) => riskManager(ctx)
};
