const { fundamentalsAnalyst, sentimentAnalyst, positioningAnalyst } = require('./analysts');

module.exports = {
  sentimentAnalyst: (ctx) => sentimentAnalyst(ctx)
};
