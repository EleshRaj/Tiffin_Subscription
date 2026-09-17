/**
 * Billing Service Test Suite (7-Day Service)
 * Tests edge cases under 7-day-a-week tiffin delivery rules.
 *
 * Run: node src/tests/billing.test.js
 */
const { calculateBill, getTotalDaysInMonth } = require('../services/billing.service');

let passed = 0;
let failed = 0;

function assert(testName, actual, expected) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${testName}`);
    console.log(`     Expected: ${expectedStr}`);
    console.log(`     Actual:   ${actualStr}`);
    failed++;
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🧪 7-Day Billing Service Test Suite');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ── September 2026 has 30 calendar days ──
const SEP_DAYS = getTotalDaysInMonth(2026, 9);
assert('September 2026 total days count', SEP_DAYS, 30);

// ── Case 1: No pause → full bill ──
const bill1 = calculateBill(3000, [], '2026-09');
assert('Case 1 — No pause: served = 30', bill1.daysServed, 30);
assert('Case 1 — No pause: amount = ₹3000', bill1.finalAmount, 3000);

// ── Case 2: One pause (Sep 7 to Sep 11 = 5 days) ──
const bill2 = calculateBill(3000, [{ start_date: '2026-09-07', end_date: '2026-09-11' }], '2026-09');
assert('Case 2 — One pause (Sep 7-11): paused = 5', bill2.pausedDays, 5);
assert('Case 2 — One pause: served = 25', bill2.daysServed, 25);
assert('Case 2 — One pause: amount = ₹2500', bill2.finalAmount, 2500);

// ── Case 3: Multiple pauses (2 days + 3 days = 5 days) ──
const bill3 = calculateBill(3000, [
  { start_date: '2026-09-01', end_date: '2026-09-02' },  // 2 days
  { start_date: '2026-09-21', end_date: '2026-09-23' }   // 3 days
], '2026-09');
assert('Case 3 — Multiple pauses: paused = 5', bill3.pausedDays, 5);
assert('Case 3 — Multiple pauses: served = 25', bill3.daysServed, 25);
assert('Case 3 — Multiple pauses: amount = ₹2500', bill3.finalAmount, 2500);

// ── Case 4: Weekend days in 7-day service are active service days ──
const bill4 = calculateBill(3000, [{ start_date: '2026-09-12', end_date: '2026-09-13' }], '2026-09');
assert('Case 4 — Weekend pause (Sat-Sun = 2 days): paused = 2', bill4.pausedDays, 2);
assert('Case 4 — Weekend pause: served = 28', bill4.daysServed, 28);
assert('Case 4 — Weekend pause: amount = ₹2800', bill4.finalAmount, 2800);

// ── Case 5: Cross-month pause (Sep 28 to Oct 5) ──
// In September: Sep 28, 29, 30 = 3 days
const bill5 = calculateBill(3000, [{ start_date: '2026-09-28', end_date: '2026-10-05' }], '2026-09');
assert('Case 5 — Cross-month: paused in Sep = 3', bill5.pausedDays, 3);
assert('Case 5 — Cross-month: served in Sep = 27', bill5.daysServed, 27);
assert('Case 5 — Cross-month: amount = ₹2700', bill5.finalAmount, 2700);

// In October: Oct 1, 2, 3, 4, 5 = 5 days
const bill5Oct = calculateBill(3100, [{ start_date: '2026-09-28', end_date: '2026-10-05' }], '2026-10');
assert('Case 5b — Cross-month: paused in Oct = 5', bill5Oct.pausedDays, 5);
assert('Case 5b — October has 31 days', bill5Oct.totalDays, 31);
assert('Case 5b — Cross-month: served in Oct = 26', bill5Oct.daysServed, 26);
assert('Case 5b — Cross-month: amount', bill5Oct.finalAmount, Math.round(3100 * 26 / 31 * 100) / 100);

// ── Case 6: Full month pause ──
const bill6 = calculateBill(3000, [{ start_date: '2026-09-01', end_date: '2026-09-30' }], '2026-09');
assert('Case 6 — Full month pause: served = 0', bill6.daysServed, 0);
assert('Case 6 — Full month pause: amount = ₹0.00', bill6.finalAmount, 0);

// ── Case 7: February 2026 (28 days) ──
const FEB_DAYS = getTotalDaysInMonth(2026, 2);
assert('Case 7 — February 2026 days count = 28', FEB_DAYS, 28);

// ── Case 8: "Not Taken Today" (Single Day Pause) for Harsh (₹2200) ──
const bill8 = calculateBill(2200, [{ start_date: '2026-09-17', end_date: '2026-09-17' }], '2026-09');
assert('Case 8 — Not Taken Today: paused = 1', bill8.pausedDays, 1);
assert('Case 8 — Not Taken Today: served = 29', bill8.daysServed, 29);
assert('Case 8 — Not Taken Today: amount = ₹2126.67', bill8.finalAmount, 2126.67);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) process.exit(1);
