const http = require('http');
const { loadLatestBriefing } = require('./dashboard/dataStore');

const INTERNAL_DATA_PORT = process.env.INTERNAL_DATA_PORT || 3001;

// Internal-only endpoint so other services in the same Railway project
// (e.g. portfolio-app's server) can read this pipeline's latest run
// over the private network, since separate Railway services don't
// share a filesystem the way local dev processes do.
function startDataServer(port = INTERNAL_DATA_PORT) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/latest-run.json') {
      const data = loadLatestBriefing();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    console.log(`[DataServer] Internal data endpoint listening on port ${port}`);
  });

  return server;
}

module.exports = { startDataServer };
