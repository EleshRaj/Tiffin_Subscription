const db = require('../config/db');
const { calculateBill, calculateSplitBill } = require('../services/billing.service');
const { transferSubscription } = require('../services/subscription.service');

/**
 * POST /api/customers/:id/subscribe
 * Create or renew a monthly subscription.
 */
exports.subscribe = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;
    const { monthlyPrice, startDate, tiffinType } = req.body;

    // Verify customer belongs to owner
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    if (!monthlyPrice || monthlyPrice <= 0) {
      return res.status(400).json({ message: 'Monthly price must be a positive number.' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required.' });
    }

    // Check if there is already an active subscription
    const existing = db.prepare(
      "SELECT id FROM subscriptions WHERE customer_id = ? AND status IN ('ACTIVE','PAUSED')"
    ).get(customerId);

    if (existing) {
      return res.status(409).json({ message: 'Customer already has an active subscription. Please manage the existing one.' });
    }

    const selectedTiffin = (tiffinType && tiffinType.trim()) || 'Standard Veg Thali';

    const result = db.prepare(
      'INSERT INTO subscriptions (customer_id, monthly_price, start_date, status, tiffin_type) VALUES (?, ?, ?, ?, ?)'
    ).run(customerId, monthlyPrice, startDate, 'ACTIVE', selectedTiffin);

    const subscriptionId = result.lastInsertRowid;

    // Record initial assignment
    db.prepare(
      'INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, ?, NULL)'
    ).run(subscriptionId, customerId, startDate);

    res.status(201).json({
      message: 'Subscription created successfully.',
      subscription: { id: subscriptionId, customerId, monthlyPrice, startDate, status: 'ACTIVE', tiffinType: selectedTiffin }
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/customers/:id/pause
 * Pause service for a date range.
 */
exports.pause = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;
    const { startDate, endDate } = req.body;

    // Verify ownership
    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // Validation
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both pause start date and end date are required.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    // Get active subscription
    const sub = db.prepare(
      "SELECT id, status FROM subscriptions WHERE customer_id = ? AND status IN ('ACTIVE','PAUSED')"
    ).get(customerId);

    if (!sub) {
      return res.status(404).json({ message: 'No active subscription found for this customer.' });
    }

    // Check for overlapping pauses
    const overlap = db.prepare(
      `SELECT id FROM pause_periods
       WHERE subscription_id = ?
         AND start_date <= ?
         AND end_date >= ?`
    ).get(sub.id, endDate, startDate);

    if (overlap) {
      return res.status(409).json({ message: 'This pause period overlaps with an existing pause.' });
    }

    // Insert pause period
    db.prepare(
      'INSERT INTO pause_periods (subscription_id, start_date, end_date) VALUES (?, ?, ?)'
    ).run(sub.id, startDate, endDate);

    // Update subscription status to PAUSED
    db.prepare(
      "UPDATE subscriptions SET status = 'PAUSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(sub.id);

    res.status(201).json({ message: 'Subscription paused successfully.', startDate, endDate });
  } catch (err) {
    console.error('Pause error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/customers/:id/resume
 * Resume a paused subscription.
 */
exports.resume = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const sub = db.prepare(
      "SELECT id, status FROM subscriptions WHERE customer_id = ? AND status = 'PAUSED'"
    ).get(customerId);

    if (!sub) {
      return res.status(400).json({ message: 'No paused subscription to resume.' });
    }

    // Set status back to ACTIVE
    db.prepare(
      "UPDATE subscriptions SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(sub.id);

    res.json({ message: 'Subscription resumed successfully.' });
  } catch (err) {
    console.error('Resume error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/customers/:id/bill?month=YYYY-MM
 * Generate monthly billing breakdown.
 */
exports.getBill = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;
    const month = req.query.month; // "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Please provide a valid month in YYYY-MM format.' });
    }

    const customer = db.prepare('SELECT id, name, phone FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // First, try to get subscription directly attached to customer
    let sub = db.prepare(
      'SELECT id, monthly_price, start_date, status, tiffin_type FROM subscriptions WHERE customer_id = ?'
    ).get(customerId);

    // If not direct, check if customer was ever part of a subscription assignment
    if (!sub) {
      const assignmentSub = db.prepare(`
        SELECT s.id, s.monthly_price, s.start_date, s.status, s.tiffin_type
        FROM subscription_assignments sa
        JOIN subscriptions s ON s.id = sa.subscription_id
        WHERE sa.customer_id = ?
        ORDER BY sa.id DESC LIMIT 1
      `).get(customerId);
      if (assignmentSub) {
        sub = assignmentSub;
      }
    }

    if (!sub) {
      return res.status(404).json({ message: 'No subscription found for this customer.' });
    }

    // Fetch all pause periods for this subscription
    const pauses = db.prepare(
      'SELECT start_date, end_date FROM pause_periods WHERE subscription_id = ?'
    ).all(sub.id);

    // Fetch all assignments for this subscription to check for transfers
    const assignments = db.prepare(`
      SELECT sa.customer_id, sa.start_date, sa.end_date, c.name as customer_name, c.phone as customer_phone
      FROM subscription_assignments sa
      JOIN customers c ON c.id = sa.customer_id
      WHERE sa.subscription_id = ?
      ORDER BY sa.id ASC
    `).all(sub.id);

    let bill;
    if (assignments.length > 1) {
      bill = calculateSplitBill(sub.monthly_price, pauses, assignments, month);
    } else {
      bill = calculateBill(sub.monthly_price, pauses, month);
    }

    bill.subscriptionId = sub.id;
    bill.customerName = customer.name;
    bill.customerPhone = customer.phone;
    bill.tiffinType = sub.tiffin_type || 'Standard Veg Thali';
    bill.pauseDetails = pauses.map(p => ({
      start: p.start_date,
      end: p.end_date
    }));

    res.json(bill);
  } catch (err) {
    console.error('Billing error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * POST /api/subscriptions/:id/transfer
 * Transfer a subscription to a new customer mid-cycle.
 */
exports.transfer = (req, res) => {
  try {
    const ownerId = req.user.id;
    const subscriptionId = parseInt(req.params.id, 10);
    const { newCustomerId, transferDate } = req.body;

    if (!newCustomerId) {
      return res.status(400).json({ message: 'Target new customer is required.' });
    }
    if (!transferDate) {
      return res.status(400).json({ message: 'Transfer date is required.' });
    }

    const result = transferSubscription(ownerId, subscriptionId, parseInt(newCustomerId, 10), transferDate);
    res.json(result);
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
  }
};

/**
 * GET /api/stats/dashboard
 * Aggregated metrics for the owner's dashboard.
 */
exports.dashboardStats = (req, res) => {
  try {
    const ownerId = req.user.id;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const total = db.prepare('SELECT COUNT(*) as count FROM customers WHERE owner_id = ?').get(ownerId);
    const active = db.prepare(
      `SELECT COUNT(*) as count FROM customers c
       JOIN subscriptions s ON s.customer_id = c.id
       WHERE c.owner_id = ? AND s.status = 'ACTIVE'`
    ).get(ownerId);
    const paused = db.prepare(
      `SELECT COUNT(*) as count FROM customers c
       JOIN subscriptions s ON s.customer_id = c.id
       WHERE c.owner_id = ? AND s.status = 'PAUSED'`
    ).get(ownerId);

    // Calculate actual pro-rated monthly revenue for all subscribed customers
    const subs = db.prepare(
      `SELECT s.id, s.monthly_price, s.status FROM subscriptions s
       JOIN customers c ON c.id = s.customer_id
       WHERE c.owner_id = ? AND s.status IN ('ACTIVE', 'PAUSED')`
    ).all(ownerId);

    let totalMonthRevenue = 0;
    let baseRunRate = 0;
    for (const sub of subs) {
      baseRunRate += (sub.monthly_price || 0);
      const pauses = db.prepare(
        'SELECT start_date, end_date FROM pause_periods WHERE subscription_id = ?'
      ).all(sub.id);
      const bill = calculateBill(sub.monthly_price, pauses, currentMonth);
      totalMonthRevenue += (bill.finalAmount || 0);
    }

    res.json({
      totalCustomers: total.count,
      activeCustomers: active.count,
      pausedCustomers: paused.count,
      baseRunRate: Math.round(baseRunRate * 100) / 100,
      estimatedRevenue: Math.round(totalMonthRevenue * 100) / 100
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
