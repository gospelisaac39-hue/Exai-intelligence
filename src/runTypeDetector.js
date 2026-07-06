// ============================================================
// EXAI RUN TYPE DETECTOR (ported from n8n)
// Determines: morning | week_ahead | actuals
// ============================================================

function detectRunType(timezone = 'Africa/Lagos') {
  const now = new Date();
  const watTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const watHour = watTime.getHours();
  const watDay = watTime.getDay();

  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][watDay];

  let runType = 'morning';
  if (watHour >= 13) {
    runType = 'actuals';
  } else if (watDay === 1 && watHour < 10) {
    runType = 'week_ahead';
  } else {
    runType = 'morning';
  }

  console.log(`[RunType] WAT Hour: ${watHour} | WAT Day: ${dayName} | runType: ${runType}`);

  return { runType, watHour, watDay, dayName, triggeredAt: now.toISOString() };
}

module.exports = { detectRunType };
