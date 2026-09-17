const assert = require('assert');
const db = require('../config/db');
const {
  setSimulatedDate,
  processDeliveriesForDate,
  getOutboxEvents
} = require('../services/notification.service');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🧪 T1 Notification & Clock Test Suite');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// Clean test setup in isolated transaction or sandbox records
const testUser = db.prepare(`
  INSERT INTO users (name, email, password_hash)
  VALUES ('Test Clock Owner', 'clock_owner_' || unixepoch() || '@test.com', 'hash')
`).run();
const ownerId = testUser.lastInsertRowid;

// Customer 1: Active
const cust1 = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)').run(ownerId, 'Alice Active', '9111111111');
const sub1 = db.prepare("INSERT INTO subscriptions (customer_id, monthly_price, start_date, status) VALUES (?, 3000, '2026-09-01', 'ACTIVE')").run(cust1.lastInsertRowid);
db.prepare('INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, ?, NULL)').run(sub1.lastInsertRowid, cust1.lastInsertRowid, '2026-09-01');

// Customer 2: Paused on 2026-09-17
const cust2 = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)').run(ownerId, 'Bob Paused', '9222222222');
const sub2 = db.prepare("INSERT INTO subscriptions (customer_id, monthly_price, start_date, status) VALUES (?, 3000, '2026-09-01', 'PAUSED')").run(cust2.lastInsertRowid);
db.prepare('INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, ?, NULL)').run(sub2.lastInsertRowid, cust2.lastInsertRowid, '2026-09-01');
db.prepare("INSERT INTO pause_periods (subscription_id, start_date, end_date) VALUES (?, '2026-09-15', '2026-09-20')").run(sub2.lastInsertRowid);

// Customer 3: No active subscription
const cust3 = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)').run(ownerId, 'Charlie Inactive', '9333333333');

// Customer 4 & 5: Transferred subscription mid-cycle on 2026-09-16
// Cust 4 (David) served Sep 1-15. Cust 5 (Eva) served Sep 16-30.
const cust4 = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)').run(ownerId, 'David Old', '9444444444');
const cust5 = db.prepare('INSERT INTO customers (owner_id, name, phone) VALUES (?, ?, ?)').run(ownerId, 'Eva New', '9555555555');
const subTrans = db.prepare("INSERT INTO subscriptions (customer_id, monthly_price, start_date, status) VALUES (?, 3000, '2026-09-01', 'ACTIVE')").run(cust5.lastInsertRowid);
// David assignment: Sep 1 to Sep 15
db.prepare("INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, '2026-09-01', '2026-09-15')").run(subTrans.lastInsertRowid, cust4.lastInsertRowid);
// Eva assignment: Sep 16 onwards
db.prepare("INSERT INTO subscription_assignments (subscription_id, customer_id, start_date, end_date) VALUES (?, ?, '2026-09-16', NULL)").run(subTrans.lastInsertRowid, cust5.lastInsertRowid);

// Test 1: Active customer on weekday -> notified
it('Test 1 — Active customer on weekday (2026-09-17, Thursday) generates notification', () => {
  const res = processDeliveriesForDate('2026-09-17');
  assert.strictEqual(res.isWeekday, true);
  const outbox = getOutboxEvents({ date: '2026-09-17' });
  const aliceNotif = outbox.find(e => e.customerId === Number(cust1.lastInsertRowid));
  assert.ok(aliceNotif, 'Alice should have received a DELIVERY_DUE notification');
  assert.strictEqual(aliceNotif.eventType, 'DELIVERY_DUE');
});

// Test 2: Paused customer on weekday -> not notified
it('Test 2 — Paused customer (Bob) is not notified during pause period', () => {
  const outbox = getOutboxEvents({ date: '2026-09-17' });
  const bobNotif = outbox.find(e => e.customerId === Number(cust2.lastInsertRowid));
  assert.strictEqual(bobNotif, undefined, 'Bob is paused, must NOT receive notification');
});

// Test 3: Weekend -> no notifications generated
it('Test 3 — Weekend (2026-09-19, Saturday) generates zero notifications', () => {
  const res = processDeliveriesForDate('2026-09-19');
  assert.strictEqual(res.isWeekday, false);
  assert.strictEqual(res.generatedEvents, 0);
  const outbox = getOutboxEvents({ date: '2026-09-19' });
  assert.strictEqual(outbox.length, 0, 'No outbox events on Saturday');
});

// Test 4: Inactive subscription -> no notification
it('Test 4 — Inactive/Cancelled subscription (Charlie) generates no notification', () => {
  const outbox = getOutboxEvents({ date: '2026-09-17' });
  const charlieNotif = outbox.find(e => e.customerId === Number(cust3.lastInsertRowid));
  assert.strictEqual(charlieNotif, undefined, 'Cancelled subscription must not receive delivery');
});

// Test 5: Transferred subscription -> notification routes to Eva (new customer) on Sep 17
it('Test 5 — Transferred subscription routes delivery to new customer (Eva) on Sep 17', () => {
  const outbox = getOutboxEvents({ date: '2026-09-17' });
  const evaNotif = outbox.find(e => e.customerId === Number(cust5.lastInsertRowid));
  const davidNotif = outbox.find(e => e.customerId === Number(cust4.lastInsertRowid));

  assert.ok(evaNotif, 'Eva must receive delivery notification on Sep 17');
  assert.strictEqual(davidNotif, undefined, 'David must not receive delivery notification after transfer date');
});

// Test 6: Repeated /clock run is strictly idempotent
it('Test 6 — Repeated clock processing on same date is idempotent (no duplicates)', () => {
  const beforeCount = getOutboxEvents({ date: '2026-09-17' }).length;
  // Run again for same date
  const res2 = processDeliveriesForDate('2026-09-17');
  const afterCount = getOutboxEvents({ date: '2026-09-17' }).length;

  assert.strictEqual(res2.generatedEvents, 0, 'Zero new events generated on repeated run');
  assert.strictEqual(beforeCount, afterCount, 'Outbox count remains strictly identical');
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) {
  process.exit(1);
}
