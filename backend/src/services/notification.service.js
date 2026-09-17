/**
 * Notification Service — Internal notification engine & outbox generator.
 *
 * Requirements:
 *   • Pure internal/mock Notification Service (no external network/SMS dependencies).
 *   • Triggered via POST /clock for deterministic simulated dates.
 *   • Writes DELIVERY_DUE notification events to outbox_events.
 *   • A customer is due a delivery if:
 *       1. Active subscription
 *       2. Date is a weekday (Mon-Fri)
 *       3. Date is not inside a pause period
 *       4. Belongs to active customer assignment on that date
 *   • Idempotent: repeated clock runs on the same date do not create duplicate events.
 */

const db = require('../config/db');
const { isWeekday, formatDate } = require('./calendar.service');

/**
 * Retrieve the current simulated business date.
 * @returns {string} - YYYY-MM-DD
 */
function getSimulatedDate() {
  const row = db.prepare('SELECT current_date FROM system_clock WHERE id = 1').get();
  return (row && row.current_date) || '2026-09-17';
}

/**
 * Set the simulated business date in system_clock.
 * @param {string} dateStr - YYYY-MM-DD
 */
function setSimulatedDate(dateStr) {
  db.prepare('UPDATE system_clock SET current_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(dateStr);
}

/**
 * Process deliveries for a given simulated date and generate outbox events.
 *
 * @param {string} [simDate] - Optional YYYY-MM-DD. If omitted, uses current simulated clock date.
 * @returns {object} - Execution report including events generated and eligible count.
 */
function processDeliveriesForDate(simDate) {
  const targetDate = simDate || getSimulatedDate();

  // If new date was explicitly provided, update system_clock
  if (simDate) {
    setSimulatedDate(simDate);
  }

  // Check if targetDate is a service day (Monday to Friday)
  if (!isWeekday(targetDate)) {
    return {
      date: targetDate,
      isWeekday: false,
      message: `Weekend (${targetDate}) — No tiffin delivery scheduled.`,
      generatedEvents: 0,
      eligibleCustomers: 0,
      events: []
    };
  }

  // Find all active subscriptions (or paused, to check if today is inside their pause period)
  const subs = db.prepare(`
    SELECT s.id as subscription_id, s.status, s.tiffin_type, s.monthly_price
    FROM subscriptions s
    WHERE s.status IN ('ACTIVE', 'PAUSED')
  `).all();

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO outbox_events (event_type, customer_id, subscription_id, event_date, phone, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let eligibleCount = 0;
  let newEventsCount = 0;
  const createdEvents = [];

  for (const sub of subs) {
    // 1. Check if targetDate is inside a pause period for this subscription
    const pause = db.prepare(`
      SELECT id FROM pause_periods
      WHERE subscription_id = ?
        AND start_date <= ?
        AND end_date >= ?
    `).get(sub.subscription_id, targetDate, targetDate);

    if (pause) {
      continue; // Customer has paused today's tiffin
    }

    // 2. Find which customer owned the subscription on targetDate
    const assignment = db.prepare(`
      SELECT sa.customer_id, c.name as customer_name, c.phone as customer_phone
      FROM subscription_assignments sa
      JOIN customers c ON c.id = sa.customer_id
      WHERE sa.subscription_id = ?
        AND sa.start_date <= ?
        AND (sa.end_date IS NULL OR sa.end_date >= ?)
      ORDER BY sa.id DESC
      LIMIT 1
    `).get(sub.subscription_id, targetDate, targetDate);

    if (!assignment) {
      continue;
    }

    eligibleCount++;

    const payload = JSON.stringify({
      type: 'DELIVERY_DUE',
      customerId: assignment.customer_id,
      customerName: assignment.customer_name,
      phone: assignment.customer_phone,
      subscriptionId: sub.subscription_id,
      tiffinType: sub.tiffin_type || 'Standard Veg Thali',
      date: targetDate,
      message: `Your tiffin delivery is scheduled for today (${targetDate}).`
    });

    const result = insertEvent.run(
      'DELIVERY_DUE',
      assignment.customer_id,
      sub.subscription_id,
      targetDate,
      assignment.customer_phone,
      payload
    );

    if (result.changes > 0) {
      newEventsCount++;
      createdEvents.push({
        id: result.lastInsertRowid,
        customerId: assignment.customer_id,
        customerName: assignment.customer_name,
        phone: assignment.customer_phone,
        tiffinType: sub.tiffin_type,
        date: targetDate
      });
    }
  }

  return {
    date: targetDate,
    isWeekday: true,
    message: `Processed delivery notifications for ${targetDate}.`,
    eligibleCustomers: eligibleCount,
    generatedEvents: newEventsCount,
    events: createdEvents
  };
}

/**
 * Retrieve notifications from the outbox.
 * @param {object} [filter]
 * @param {string} [filter.date] - Optional date filter
 * @param {string} [filter.type] - Optional event type
 * @param {number} [filter.limit]
 * @returns {Array}
 */
function getOutboxEvents(filter = {}) {
  let query = 'SELECT * FROM outbox_events WHERE 1=1';
  const params = [];

  if (filter.date) {
    query += ' AND event_date = ?';
    params.push(filter.date);
  }
  if (filter.type) {
    query += ' AND event_type = ?';
    params.push(filter.type);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(filter.limit || 100);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => {
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(r.payload);
    } catch (e) {
      parsedPayload = { raw: r.payload };
    }
    return {
      id: r.id,
      eventType: r.event_type,
      customerId: r.customer_id,
      subscriptionId: r.subscription_id,
      eventDate: r.event_date,
      phone: r.phone,
      payload: parsedPayload,
      createdAt: r.created_at
    };
  });
}

module.exports = {
  getSimulatedDate,
  setSimulatedDate,
  processDeliveriesForDate,
  getOutboxEvents
};
