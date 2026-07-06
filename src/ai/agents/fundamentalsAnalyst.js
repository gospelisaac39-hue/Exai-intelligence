const { fundamentalsAnalyst, sentimentAnalyst, positioningAnalyst } = require('./analysts');

module.exports = {
  fundamentalsAnalyst: (ctx) => fundamentalsAnalyst(ctx),
  sentimentAnalyst: (ctx) => sentimentAnalyst(ctx),
  positioningAnalyst: (ctx) => positioningAnalyst(ctx)
};
