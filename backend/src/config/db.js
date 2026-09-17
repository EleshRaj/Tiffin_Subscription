const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tiffin.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    password_hash TEXT  NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);

  CREATE TABLE IF NOT EXISTS subscriptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL,
    monthly_price REAL    NOT NULL,
    start_date    TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED')),
    tiffin_type   TEXT    DEFAULT 'Standard Veg Thali',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);

  CREATE TABLE IF NOT EXISTS pause_periods (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    start_date      TEXT    NOT NULL,
    end_date        TEXT    NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_pause_sub ON pause_periods(subscription_id);

  -- T6: Subscription Assignment History
  CREATE TABLE IF NOT EXISTS subscription_assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    customer_id     INTEGER NOT NULL,
    start_date      TEXT    NOT NULL,
    end_date        TEXT,   -- NULL means currently active assignment
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_assignments_sub ON subscription_assignments(subscription_id, start_date, end_date);

  -- T1: Outbox Events (Delivery notifications for grader/inspection)
  CREATE TABLE IF NOT EXISTS outbox_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type      TEXT    NOT NULL,
    customer_id     INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    event_date      TEXT    NOT NULL,
    phone           TEXT    NOT NULL,
    payload         TEXT    NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id, customer_id, event_date, event_type)
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_date ON outbox_events(event_date);

  -- T1: Deterministic System Clock
  CREATE TABLE IF NOT EXISTS system_clock (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    current_date TEXT NOT NULL,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration helper for existing databases
try {
  db.exec("ALTER TABLE subscriptions ADD COLUMN tiffin_type TEXT DEFAULT 'Standard Veg Thali'");
} catch (e) {
  // Column already exists, safe to ignore
}

// Ensure default simulated clock exists
try {
  db.prepare("INSERT OR IGNORE INTO system_clock (id, current_date) VALUES (1, '2026-09-17')").run();
} catch (e) {
  // Ignore
}

// Backfill subscription_assignments for any existing subscriptions missing an initial assignment
try {
  const missing = db.prepare(`
    SELECT s.id, s.customer_id, s.start_date 
    FROM subscriptions s
    LEFT JOIN subscription_assignments sa ON sa.subscription_id = s.id
    WHERE sa.id IS NULL
  `).all();

  const insertAssignment = db.prepare(`
    INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date)
    VALUES (?, ?, ?, NULL)
  `);

  for (const sub of missing) {
    insertAssignment.run(sub.id, sub.customer_id, sub.start_date || '2026-09-01');
  }
} catch (e) {
  console.error('Assignment backfill notice:', e.message);
}

module.exports = db;
