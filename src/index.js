const cron = require('node-cron');
const config = require('./config');
const { runWorkflow } = require('./runWorkflow');
const { tickEventWatcher } = require('./eventTicker');
const { createDashboardApp } = require('./dashboard/server');

const args = process.argv.slice(2);
const runOnce = args.includes('--once');
const dryRun = args.includes('--dry-run');
const withDashboard = args.includes('--dashboard');
const dashboardOnly = args.includes('--dashboard-only');

async function main() {
  // Dashboard-only mode: serve the dashboard without running the workflow scheduler
  if (dashboardOnly) {
    console.log('Starting dashboard server (no workflow scheduling)...');
    const dashboard = createDashboardApp(process.env.PORT || 3000);
    await dashboard.start();
    return;
  }

  // Dashboard + scheduler mode
  const { pruneOldState } = require('./eventWatcher');
  pruneOldState();

  let dashboard = null;
  if (withDashboard) {
    dashboard = createDashboardApp(process.env.PORT || 3000);
    await dashboard.start();
  }

  if (runOnce) {
    console.log(`Running once${dryRun ? ' (dry run, no email will be sent)' : ''}...`);
    try {
      await runWorkflow({ dryRun });
      process.exit(0);
    } catch (err) {
      console.error('Workflow run failed:', err);
      process.exit(1);
    }
    return;
  }

  console.log(`EXAI Intelligence scheduler starting.`);
  console.log(`Cron schedule: "${config.schedule.cron}" (timezone: ${config.schedule.timezone})`);
  console.log(`This process will stay running and fire the workflow on schedule.`);
  if (withDashboard) {
    console.log(`Dashboard available at http://localhost:3000`);
  }
  console.log(`Press Ctrl+C to stop.\n`);

  cron.schedule('*/15 * * * *', async () => {
    try {
      await tickEventWatcher();
    } catch (err) {
      console.error('Event ticker failed:', err);
    }
  }, { timezone: config.schedule.timezone });

  cron.schedule(
    config.schedule.cron,
    async () => {
      try {
        await runWorkflow({ dryRun });
      } catch (err) {
        console.error('Scheduled workflow run failed:', err);
      }
    },
    { timezone: config.schedule.timezone }
  );

  // Keep the process alive — node-cron's schedule() already does this via
  // its internal timer, but this log makes the "still running" state explicit.
  console.log('Scheduler is active and waiting for the next trigger time.');
}

main();

