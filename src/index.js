const cron = require('node-cron');
const config = require('./config');
const { runWorkflow } = require('./runWorkflow');
const { tickEventWatcher } = require('./eventTicker');

const args = process.argv.slice(2);
const runOnce = args.includes('--once');
const dryRun = args.includes('--dry-run');

async function main() {
  const { pruneOldState } = require('./eventWatcher');
  pruneOldState();

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

