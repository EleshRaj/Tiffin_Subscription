const assert = require('assert');
const db = require('../config/db');
const {
  normalizePhone,
  normalizeDate,
  importCustomersCsv
} = require('../services/import.service');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🧪 T4 Messy CSV Import Test Suite');
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

// Setup test owner
const testUser = db.prepare(`
  INSERT INTO users (name, email, password_hash)
  VALUES ('Import Owner', 'import_owner_' || unixepoch() || '@test.com', 'hash')
`).run();
const ownerId = testUser.lastInsertRowid;

// Test 1: Phone normalization
it('Test 1 — Phone normalizes spaces, dashes, +91 and 0 prefix to 10 digits', () => {
  assert.strictEqual(normalizePhone('9876543210'), '9876543210');
  assert.strictEqual(normalizePhone('+91 98765 43210'), '9876543210');
  assert.strictEqual(normalizePhone('09876543210'), '9876543210');
  assert.strictEqual(normalizePhone('9876-543-210'), '9876543210');
  assert.strictEqual(normalizePhone('12345'), null);
  assert.strictEqual(normalizePhone(''), null);
});

// Test 2: Date normalization
it('Test 2 — Mixed date formats normalize strictly to YYYY-MM-DD', () => {
  assert.strictEqual(normalizeDate('2026-09-01'), '2026-09-01');
  assert.strictEqual(normalizeDate('01/09/2026'), '2026-09-01');
  assert.strictEqual(normalizeDate('09-02-2026'), '2026-02-09');
  assert.strictEqual(normalizeDate('31/02/2026'), null); // Invalid Feb 31
  assert.strictEqual(normalizeDate('invalid-date'), null);
});

// Test 3: Standard messy CSV import with deduped, rejected, imported
it('Test 3 — Import messy CSV with mixed dates, duplicates, and invalid rows', () => {
  const sampleCsv = `name,phone,monthly_price,start_date
Rahul,9876543210,3000,2026-09-01
Rahul Sharma,9876543210,3000,01/09/2026
Aman,9876543211,2500,09-02-2026
,9876543212,3000,2026-09-03
Priya,,2800,2026-09-04
Deepak,9876543213,-500,2026-09-05
Suresh,9876543214,3000,99/99/9999
Vikram,9876543215,3200,15/09/2026`;

  const report = importCustomersCsv(ownerId, sampleCsv);

  // Rahul -> imported (1)
  // Rahul Sharma -> deduped (1)
  // Aman -> imported (2)
  // Row 4 (blank name) -> rejected (1)
  // Row 5 (blank phone) -> rejected (2)
  // Row 6 (negative price -500) -> rejected (3)
  // Row 7 (bad date 99/99/9999) -> rejected (4)
  // Vikram -> imported (3)

  assert.strictEqual(report.imported, 3, `Expected 3 imported, got ${report.imported}`);
  assert.strictEqual(report.deduped, 1, `Expected 1 deduped, got ${report.deduped}`);
  assert.strictEqual(report.rejected, 4, `Expected 4 rejected, got ${report.rejected}`);
  assert.strictEqual(report.errors.length, 4, 'Errors list should record all 4 rejected rows');
});

// Test 4: Deduplicating against already existing customer in database
it('Test 4 — Re-uploading existing customer phone marks it as deduped', () => {
  const existingCsv = `name,phone,monthly_price,start_date
Rahul Reattempt,9876543210,3000,2026-09-01
Neha New,9876543216,2800,2026-09-01`;

  const report = importCustomersCsv(ownerId, existingCsv);
  assert.strictEqual(report.imported, 1, 'Only Neha should be imported');
  assert.strictEqual(report.deduped, 1, 'Rahul already exists in DB so should be deduped');
});

// Test 5: Multiple duplicate rows within the same CSV (deterministic retention of first valid)
it('Test 5 — Multiple identical duplicate rows in CSV retain only the first', () => {
  const multiDupeCsv = `name,phone,monthly_price,start_date
Karan,9876543299,2800,2026-09-01
Karan 2,9876543299,2800,2026-09-01
Karan 3,9876543299,2800,2026-09-01
Karan 4,9876543299,2800,2026-09-01`;

  const report = importCustomersCsv(ownerId, multiDupeCsv);
  assert.strictEqual(report.imported, 1, 'Only first Karan record imported');
  assert.strictEqual(report.deduped, 3, 'Other 3 duplicate records deduped');
  assert.strictEqual(report.rejected, 0);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) {
  process.exit(1);
}
