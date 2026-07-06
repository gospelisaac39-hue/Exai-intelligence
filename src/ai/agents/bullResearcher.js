const { bullResearcher, bearResearcher } = require('./debateResearchers');

module.exports = {
  bullResearcher: (ctx) => bullResearcher(ctx),
  bearResearcher: (ctx) => bearResearcher(ctx)
};
