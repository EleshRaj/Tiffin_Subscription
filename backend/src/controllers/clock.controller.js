const {
  getSimulatedDate,
  setSimulatedDate,
  processDeliveriesForDate,
  getOutboxEvents
} = require('../services/notification.service');
const { isWeekday } = require('../services/calendar.service');

/**
 * POST /clock
 * Simulates a day passing or sets a specific business date.
 * Automatically processes delivery notifications for eligible customers.
 */
exports.simulateClock = (req, res) => {
  try {
    let targetDate = req.body && req.body.date;

    // If no date is passed, advance current simulated clock by 1 calendar day
    if (!targetDate) {
      const current = getSimulatedDate();
      const next = new Date(current + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const d = String(next.getDate()).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
    }

    const report = processDeliveriesForDate(targetDate);
    res.json({
      success: true,
      currentDate: targetDate,
      ...report
    });
  } catch (err) {
    console.error('Clock simulation error:', err);
    res.status(500).json({ message: 'Failed to process clock simulation.', error: err.message });
  }
};

/**
 * GET /clock
 * Returns current simulated date status.
 */
exports.getClock = (req, res) => {
  try {
    const currentDate = getSimulatedDate();
    res.json({
      currentDate,
      isWeekday: isWeekday(currentDate)
    });
  } catch (err) {
    console.error('Get clock error:', err);
    res.status(500).json({ message: 'Failed to read clock.' });
  }
};

/**
 * GET /outbox
 * Exposes generated notification events for inspection.
 */
exports.getOutbox = (req, res) => {
  try {
    const { date, type, limit } = req.query;
    const events = getOutboxEvents({
      date,
      type,
      limit: parseInt(limit, 10) || 100
    });
    res.json({
      count: events.length,
      events
    });
  } catch (err) {
    console.error('Outbox query error:', err);
    res.status(500).json({ message: 'Failed to read outbox events.' });
  }
};
