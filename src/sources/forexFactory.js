const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch calendar from the JSON API (forecasts only)
 */
async function fetchForexFactoryCalendar() {
  try {
    const { data } = await axios.get(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { maxRedirects: 5, timeout: 10000 }
    );
    console.log('[ForexFactory] Calendar fetch successful');
    return data; // array of event objects
  } catch (err) {
    console.warn('[ForexFactory] Calendar fetch failed:', err.message);
    return [];
  }
}

/**
 * Scrape ForexFactory HTML calendar for actuals
 * Returns array of events with: { title, time, currency, impact, forecast, actual, previous }
 */
async function fetchForexFactoryActuals() {
  try {
    const { data } = await axios.get(
      'https://www.forexfactory.com/calendar.php',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000,
        maxRedirects: 5
      }
    );

    const $ = cheerio.load(data);
    const events = [];

    // Parse ForexFactory calendar table rows
    // Structure: <tr class="calendar__row">...<td>...</td>...</tr>
    $('tr.calendar__row').each((idx, row) => {
      try {
        const cells = $(row).find('td');
        if (cells.length < 8) return; // Skip malformed rows

        // Extract event data from cells
        const timeCell = cells.eq(0).text().trim();
        const currencyCell = cells.eq(1).text().trim();
        const impactCell = cells.eq(2).find('span').attr('class') || '';
        const titleCell = cells.eq(3).text().trim();
        const forecastCell = cells.eq(4).text().trim();
        const previousCell = cells.eq(5).text().trim();
        const actualCell = cells.eq(6).text().trim();

        // Skip empty rows
        if (!titleCell || !currencyCell) return;

        // Map impact level from class
        let impact = 'low';
        if (impactCell.includes('High')) impact = 'high';
        else if (impactCell.includes('Medium')) impact = 'medium';

        events.push({
          time: timeCell,
          currency: currencyCell,
          title: titleCell,
          impact,
          forecast: forecastCell || 'N/A',
          actual: actualCell === '' ? 'Pending' : actualCell || 'N/A',
          previous: previousCell || 'N/A'
        });
      } catch (e) {
        // Skip rows that can't be parsed
      }
    });

    console.log(`[ForexFactory] Scraped ${events.length} events with actuals`);
    return events;
  } catch (err) {
    console.warn('[ForexFactory] Actuals scrape failed:', err.message);
    return [];
  }
}

/**
 * Combine calendar data with actual values
 * Returns enhanced events with both forecast and actual data
 */
async function fetchForexFactoryEnhanced() {
  try {
    const [calendarData, actualsData] = await Promise.all([
      fetchForexFactoryCalendar(),
      fetchForexFactoryActuals()
    ]);

    // Map actuals by title for lookup
    const actualsMap = {};
    actualsData.forEach(a => {
      const key = `${a.currency}|${a.title}`;
      actualsMap[key] = a;
    });

    // Merge calendar with actuals
    const merged = calendarData.map(event => {
      const key = `${event.currency}|${event.title}`;
      const actualData = actualsMap[key];

      return {
        ...event,
        actual: actualData?.actual || 'Pending',
        actualStatus: actualData?.actual === 'Pending' ? 'pending' : 'released'
      };
    });

    console.log('[ForexFactory] Enhanced calendar created');
    return merged;
  } catch (err) {
    console.warn('[ForexFactory] Enhancement failed:', err.message);
    // Fall back to calendar only
    return await fetchForexFactoryCalendar();
  }
}

module.exports = { fetchForexFactoryCalendar, fetchForexFactoryActuals, fetchForexFactoryEnhanced };

/**
 * Fetch last week's ForexFactory calendar (actual/forecast/previous)
 * by requesting the calendar with a week offset. ForexFactory's HTML
 * calendar accepts a ?week= param formatted like "jun29.2026".
 * If this stops matching their current URL scheme, check
 * forexfactory.com/calendar in a browser and compare the week param.
 */
async function fetchForexFactoryLastWeek() {
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6); // Monday of last week
  const monthAbbr = lastMonday.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const weekParam = `${monthAbbr}${lastMonday.getDate()}.${lastMonday.getFullYear()}`;

  try {
    const { data } = await axios.get(
      `https://www.forexfactory.com/calendar?week=${weekParam}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
        maxRedirects: 5
      }
    );

    const $ = cheerio.load(data);
    const events = [];

    $('tr.calendar__row').each((idx, row) => {
      try {
        const cells = $(row).find('td');
        if (cells.length < 8) return;
        const currencyCell = cells.eq(1).text().trim();
        const impactCell = cells.eq(2).find('span').attr('class') || '';
        const titleCell = cells.eq(3).text().trim();
        const forecastCell = cells.eq(4).text().trim();
        const previousCell = cells.eq(5).text().trim();
        const actualCell = cells.eq(6).text().trim();
        if (!titleCell || !currencyCell) return;

        let impact = 'low';
        if (impactCell.includes('High')) impact = 'high';
        else if (impactCell.includes('Medium')) impact = 'medium';
        if (impact === 'low') return;

        events.push({
          currency: currencyCell,
          title: titleCell,
          impact,
          forecast: forecastCell || 'N/A',
          actual: actualCell === '' ? 'N/A' : actualCell,
          previous: previousCell || 'N/A'
        });
      } catch (e) {}
    });

    console.log(`[ForexFactory] Last week: scraped ${events.length} high/medium events`);
    return events;
  } catch (err) {
    console.warn('[ForexFactory] Last week fetch failed:', err.message);
    return [];
  }
}

module.exports.fetchForexFactoryLastWeek = fetchForexFactoryLastWeek;
