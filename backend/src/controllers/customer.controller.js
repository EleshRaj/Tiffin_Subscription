const db = require('../config/db');

// Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_FIELDS = ['name', 'phone', 'created_at', 'monthly_price', 'status'];

/**
 * POST /api/customers
 * Create a new customer with an initial active subscription.
 */
exports.create = (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, phone, monthlyPrice, startDate, tiffinType } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({ message: 'Customer name and phone are required.' });
    }
    if (!monthlyPrice || monthlyPrice <= 0) {
      return res.status(400).json({ message: 'Monthly plan price must be a positive number.' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Subscription start date is required.' });
    }

    const selectedTiffinType = (tiffinType && tiffinType.trim()) || 'Standard Veg Thali';

    // Insert customer
    const custResult = db.prepare(
      'INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)'
    ).run(ownerId, name, phone);

    const customerId = custResult.lastInsertRowid;

    // Create active subscription
    db.prepare(
      'INSERT INTO subscriptions (customer_id, monthly_price, start_date, status, tiffin_type) VALUES (?, ?, ?, ?, ?)'
    ).run(customerId, monthlyPrice, startDate, 'ACTIVE', selectedTiffinType);

    res.status(201).json({
      message: 'Customer created and subscribed successfully.',
      customer: { id: customerId, name, phone, monthlyPrice, startDate, status: 'ACTIVE', tiffinType: selectedTiffinType }
    });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/customers
 * List customers with search (phone), sorting, and pagination.
 */
exports.list = (req, res) => {
  try {
    const ownerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const phone = req.query.phone || '';
    const sortBy = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    // Build query with optional phone search
    let whereClause = 'WHERE c.owner_id = ?';
    const params = [ownerId];

    if (phone) {
      whereClause += ' AND c.phone LIKE ?';
      params.push(`%${phone}%`);
    }

    // Determine sort column source — monthly_price and status come from subscriptions
    let orderClause;
    if (sortBy === 'monthly_price') {
      orderClause = `ORDER BY s.monthly_price ${order}`;
    } else if (sortBy === 'status') {
      orderClause = `ORDER BY s.status ${order}`;
    } else {
      orderClause = `ORDER BY c.${sortBy} ${order}`;
    }

    // Count total
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM customers c
       LEFT JOIN subscriptions s ON s.customer_id = c.id
       ${whereClause}`
    ).get(...params);
    const total = countRow.total;

    // Fetch page
    const customers = db.prepare(
      `SELECT c.id, c.name, c.phone, c.created_at,
              s.monthly_price, s.start_date, s.status, s.tiffin_type, s.id as subscription_id
       FROM customers c
       LEFT JOIN subscriptions s ON s.customer_id = c.id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      customers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * GET /api/customers/:id
 * Customer details with subscription info and pause history.
 */
exports.getById = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;

    const customer = db.prepare(
      `SELECT c.id, c.name, c.phone, c.created_at,
              s.id as subscription_id, s.monthly_price, s.start_date, s.status, s.tiffin_type
       FROM customers c
       LEFT JOIN subscriptions s ON s.customer_id = c.id
       WHERE c.id = ? AND c.owner_id = ?`
    ).get(customerId, ownerId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // Fetch pause history
    const pauses = customer.subscription_id
      ? db.prepare(
          'SELECT id, start_date, end_date, created_at FROM pause_periods WHERE subscription_id = ? ORDER BY start_date DESC'
        ).all(customer.subscription_id)
      : [];

    res.json({ customer, pauses });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * PUT /api/customers/:id
 */
exports.update = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;
    const { name, phone, monthlyPrice, tiffinType } = req.body;

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    if (name) db.prepare('UPDATE customers SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, customerId);
    if (phone) db.prepare('UPDATE customers SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(phone, customerId);
    if (monthlyPrice && monthlyPrice > 0) {
      db.prepare('UPDATE subscriptions SET monthly_price = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(monthlyPrice, customerId);
    }
    if (tiffinType) {
      db.prepare('UPDATE subscriptions SET tiffin_type = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(tiffinType, customerId);
    }

    res.json({ message: 'Customer updated successfully.' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * DELETE /api/customers/:id
 */
exports.remove = (req, res) => {
  try {
    const ownerId = req.user.id;
    const customerId = req.params.id;

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND owner_id = ?').get(customerId, ownerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
    res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
