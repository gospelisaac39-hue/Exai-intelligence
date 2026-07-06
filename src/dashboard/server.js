const express = require('express');
const path = require('path');
const { loadLatestBriefing, listRuns, getRun } = require('./dataStore');

/**
 * Create and configure Express app for dashboard
 * @param {number} port - Port to listen on
 * @returns {object} - { app, start, stop }
 */
function createDashboardApp(port = 3000) {
  const app = express();
  let server = null;

  // Serve static dashboard from src/dashboard/index.html
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // ========== LIVE DATA ENDPOINTS ==========

  // API: Get latest run (for live dashboard)
  app.get('/api/latest', (req, res) => {
    try {
      const briefing = loadLatestBriefing();
      res.json(briefing);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== AGENT OUTPUT ENDPOINTS ==========

  // API: Get all agent outputs from latest run
  app.get('/api/agents', (req, res) => {
    try {
      const run = loadLatestBriefing();
      res.json(run.agents || {});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get specific agent output
  app.get('/api/agents/:name', (req, res) => {
    try {
      const run = loadLatestBriefing();
      const agent = run.agents?.[req.params.name];
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get final decision
  app.get('/api/decision', (req, res) => {
    try {
      const run = loadLatestBriefing();
      res.json(run.finalDecision || {});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== DATA SNAPSHOT ENDPOINTS ==========

  // API: Get calendar
  app.get('/api/calendar', (req, res) => {
    try {
      const run = loadLatestBriefing();
      res.json(run.calendar || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get COT data
  app.get('/api/cot', (req, res) => {
    try {
      const run = loadLatestBriefing();
      res.json(run.cotData || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get FedWatch data
  app.get('/api/fedwatch', (req, res) => {
    try {
      const run = loadLatestBriefing();
      res.json(run.fedwatchData || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== RUN HISTORY ENDPOINTS ==========

  // API: List all past runs
  app.get('/api/runs', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const runs = listRuns(limit);
      res.json(runs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get specific run by ID
  app.get('/api/runs/:runId', (req, res) => {
    try {
      const run = getRun(req.params.runId);
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      res.json(run);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========== HEALTH CHECK ==========

  // API: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start server
  function start() {
    return new Promise((resolve) => {
      server = app.listen(port, () => {
        console.log(`[Dashboard] Server running on http://localhost:${port}`);
        resolve(server);
      });
    });
  }

  // Stop server
  function stop() {
    return new Promise((resolve) => {
      if (server) {
        server.close(() => {
          console.log('[Dashboard] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  return { app, start, stop, server: () => server };
}

module.exports = { createDashboardApp };
