/**
 * Subscription Service — Subscription Lifecycle & Mid-Cycle Transfer Operations.
 *
 * Requirements:
 *   • POST /api/subscriptions/:id/transfer
 *   • Transfers subscription to new customer mid-cycle.
 *   • Plan, billing cycle, and remaining days carry over.
 *   • Preserves history via subscription_assignments.
 *   • Transfer date is the first service date of the new customer.
 *   • Dates strictly before transferDate belong to the old customer.
 */

const db = require('../config/db');

/**
 * Transfer a subscription mid-cycle to a new customer.
 *
 * @param {number} ownerId
 * @param {number} subscriptionId
 * @param {number} newCustomerId
 * @param {string} transferDate - "YYYY-MM-DD"
 * @returns {object}
 */
function transferSubscription(ownerId, subscriptionId, newCustomerId, transferDate) {
  if (!transferDate || !/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) {
    throw new Error('Valid transfer date in YYYY-MM-DD format is required.');
  }

  // 1. Verify subscription belongs to owner
  const sub = db.prepare(`
    SELECT s.id, s.customer_id, s.monthly_price, s.start_date, s.status, s.tiffin_type
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.id = ? AND c.owner_id = ?
  `).get(subscriptionId, ownerId);

  if (!sub) {
    const err = new Error('Subscription not found.');
    err.status = 404;
    throw err;
  }

  if (sub.status !== 'ACTIVE' && sub.status !== 'PAUSED') {
    const err = new Error('Only active or paused subscriptions can be transferred.');
    err.status = 400;
    throw err;
  }

  if (Number(sub.customer_id) === Number(newCustomerId)) {
    const err = new Error('Subscription is already assigned to this customer.');
    err.status = 400;
    throw err;
  }

  // 2. Verify new customer exists and belongs to same owner
  const newCust = db.prepare(`
    SELECT id, name, phone FROM customers WHERE id = ? AND owner_id = ?
  `).get(newCustomerId, ownerId);

  if (!newCust) {
    const err = new Error('Target new customer not found.');
    err.status = 404;
    throw err;
  }

  // 3. Verify transferDate is not before subscription start_date
  if (transferDate < sub.start_date) {
    const err = new Error(`Transfer date cannot be earlier than subscription start date (${sub.start_date}).`);
    err.status = 400;
    throw err;
  }

  // Calculate day before transferDate for old customer's end_date
  const prev = new Date(transferDate + 'T00:00:00');
  prev.setDate(prev.getDate() - 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  const d = String(prev.getDate()).padStart(2, '0');
  const oldEndDate = `${y}-${m}-${d}`;

  const oldCustomerId = sub.customer_id;

  // Execute transfer in a single atomic transaction
  const executeTransfer = db.transaction(() => {
    // A. Close the current active assignment
    db.prepare(`
      UPDATE subscription_assignments
      SET end_date = ?
      WHERE subscription_id = ? AND (end_date IS NULL OR end_date >= ?)
    `).run(oldEndDate, subscriptionId, transferDate);

    // B. Create the new customer assignment starting on transferDate
    db.prepare(`
      INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date)
      VALUES (?, ?, ?, NULL)
    `).run(subscriptionId, newCustomerId, transferDate);

    // C. Point the subscription to the new customer
    db.prepare(`
      UPDATE subscriptions
      SET customer_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newCustomerId, subscriptionId);
  });

  executeTransfer();

  return {
    success: true,
    message: `Subscription successfully transferred to ${newCust.name} starting from ${transferDate}.`,
    subscriptionId,
    oldCustomerId,
    newCustomerId,
    newCustomerName: newCust.name,
    transferDate
  };
}

module.exports = {
  transferSubscription
};
