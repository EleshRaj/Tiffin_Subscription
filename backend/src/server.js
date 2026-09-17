require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(express.json());

// ── Database initialisation (runs table creation on import) ────
require('./config/db');

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/customers/import', require('./routes/import.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/subscriptions', require('./routes/subscription.routes'));
app.use('/api/stats', require('./routes/stats.routes'));

// T1 Clock & Outbox routes at root level (POST /clock, GET /outbox)
app.use('/', require('./routes/clock.routes'));

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// ── Start server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🍱 Tif Tof (Tiffin Subscription) API running on http://localhost:${PORT}\n`);
});
