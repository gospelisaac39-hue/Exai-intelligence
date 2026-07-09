const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const authRoutes = require('./auth/routes');
const accountsRoutes = require('./accounts/routes');
const positionsRoutes = require('./positions/routes');
const dashboardRoutes = require('./dashboard/routes');
const exposureRoutes = require('./exposure/routes');
const insightsRoutes = require('./insights/routes');
const calendarRoutes = require('./calendar/routes');
const intelligenceRoutes = require('./intelligence/routes');
const assetsRoutes = require('./assets/routes');
const connectionManager = require('./metaapi/connectionManager');
const { scheduleDailySnapshot } = require('./jobs/dailySnapshot');
const { scheduleTradeSync } = require('./jobs/tradeSync');

function createApp() {
  const app = express();

  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountsRoutes);
  app.use('/api/positions', positionsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/exposure', exposureRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/assets', assetsRoutes);

  app.use((err, req, res, next) => {
    console.error('[Server]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function start(port = config.port) {
  const app = createApp();
  if (config.metaapi.token) {
    connectionManager.reconnectAll();
    scheduleDailySnapshot();
    scheduleTradeSync();
  } else {
    console.warn('[Portfolio Server] METAAPI_TOKEN not set — broker connections are disabled until it is configured.');
  }
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Portfolio Server] Listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start };
