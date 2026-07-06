const { bullResearcher, bearResearcher } = require('./debateResearchers');

module.exports = {
  bearResearcher: (ctx) => bearResearcher(ctx)
};
