const { fundamentalsAnalyst, sentimentAnalyst, positioningAnalyst } = require('./analysts');

module.exports = {
  positioningAnalyst: (ctx) => positioningAnalyst(ctx)
};
