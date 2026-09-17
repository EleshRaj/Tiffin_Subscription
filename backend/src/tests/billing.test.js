const assert = require('assert');
const { calculateBill, calculateSplitBill, getTotalWeekdaysInMonth } = require('../services/billing.service');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  🧪 Weekday (Mon-Fri) Billing Test Suite');
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

// September 2026 check:
// Sep 1 is Tuesday. Total days = 30.
// Weekdays = 22. (Saturdays & Sundays = 8).
const sepWeekdays = getTotalWeekdaysInMonth(2026, 9);
it('September 2026 has exactly 22 weekdays', () => {
  assert.strictEqual(sepWeekdays, 22);
});

// Case 1: No pause (all 22 weekdays served)
it('Case 1 — No pause: 22 weekdays served = ₹3000', () => {
  const bill = calculateBill(3000, [], '2026-09');
  assert.strictEqual(bill.totalWeekdays, 22);
  assert.strictEqual(bill.pausedDays, 0);
  assert.strictEqual(bill.daysServed, 22);
  assert.strictEqual(bill.finalAmount, 3000);
});

// Case 2: One pause: Sep 7 to Sep 11 (Mon-Fri = 5 weekdays)
it('Case 2 — One pause (Sep 7-11): 5 paused weekdays, 17 served', () => {
  const pauses = [{ start_date: '2026-09-07', end_date: '2026-09-11' }];
  const bill = calculateBill(3000, pauses, '2026-09');
  assert.strictEqual(bill.pausedDays, 5);
  assert.strictEqual(bill.daysServed, 17);
  // 3000 * 17 / 22 = 2318.18
  assert.strictEqual(bill.finalAmount, 2318.18);
});

// Case 3: Multiple pauses: Sep 1 (1 day) + Sep 7 to Sep 8 (2 days) = 3 paused weekdays
it('Case 3 — Multiple pauses: 3 paused weekdays, 19 served', () => {
  const pauses = [
    { start_date: '2026-09-01', end_date: '2026-09-01' },
    { start_date: '2026-09-07', end_date: '2026-09-08' }
  ];
  const bill = calculateBill(2200, pauses, '2026-09');
  assert.strictEqual(bill.pausedDays, 3);
  assert.strictEqual(bill.daysServed, 19);
  // 2200 * 19 / 22 = 1900
  assert.strictEqual(bill.finalAmount, 1900);
});

// Case 4: Weekend inside pause: Sep 4 (Fri) to Sep 8 (Tue)
// Total calendar days = 5. Weekdays = Fri, Mon, Tue (3 weekdays). Sat & Sun should NOT be deducted!
it('Case 4 — Weekend inside pause (Sep 4-8): only 3 weekdays deducted', () => {
  const pauses = [{ start_date: '2026-09-04', end_date: '2026-09-08' }];
  const bill = calculateBill(2200, pauses, '2026-09');
  assert.strictEqual(bill.pausedDays, 3);
  assert.strictEqual(bill.daysServed, 19);
  assert.strictEqual(bill.finalAmount, 1900);
});

// Case 5: Pause crossing month boundary: Sep 28 to Oct 2
// Sep 28 (Mon) to Sep 30 (Wed) = 3 weekdays in September
// Oct 1 (Thu) to Oct 2 (Fri) = 2 weekdays in October
it('Case 5 — Cross-month pause: clipped to 3 weekdays in September', () => {
  const pauses = [{ start_date: '2026-09-28', end_date: '2026-10-02' }];
  const billSep = calculateBill(2200, pauses, '2026-09');
  assert.strictEqual(billSep.pausedDays, 3);
  assert.strictEqual(billSep.daysServed, 19);
  assert.strictEqual(billSep.finalAmount, 1900);

  const billOct = calculateBill(2200, pauses, '2026-10');
  assert.strictEqual(billOct.pausedDays, 2);
});

// Case 6: Full month pause: Sep 1 to Sep 30
it('Case 6 — Full month pause: 0 served days = ₹0.00', () => {
  const pauses = [{ start_date: '2026-09-01', end_date: '2026-09-30' }];
  const bill = calculateBill(3000, pauses, '2026-09');
  assert.strictEqual(bill.pausedDays, 22);
  assert.strictEqual(bill.daysServed, 0);
  assert.strictEqual(bill.finalAmount, 0);
});

// Case 7: Transfer mid-cycle with no pause
// Total weekdays in Sep = 22
// Customer A: Sep 1 to Sep 15 (Sep 1 to 15 has 11 weekdays)
// Customer B: Sep 16 to Sep 30 (Sep 16 to 30 has 11 weekdays)
it('Case 7 — Mid-cycle transfer: exactly 11 weekdays each for Customer A and B', () => {
  const assignments = [
    { customer_id: 1, customer_name: 'Customer A', start_date: '2026-09-01', end_date: '2026-09-15' },
    { customer_id: 2, customer_name: 'Customer B', start_date: '2026-09-16', end_date: null }
  ];
  const splitBill = calculateSplitBill(3000, [], assignments, '2026-09');
  assert.strictEqual(splitBill.isSplit, true);
  assert.strictEqual(splitBill.splits.length, 2);

  const a = splitBill.splits.find(s => s.customerId === 1);
  const b = splitBill.splits.find(s => s.customerId === 2);

  assert.strictEqual(a.servedDays, 11);
  assert.strictEqual(b.servedDays, 11);
  assert.strictEqual(a.amount, 1500);
  assert.strictEqual(b.amount, 1500);
  assert.strictEqual(splitBill.finalAmount, 3000);
});

// Case 8: Mid-cycle transfer with pause during Customer A's window
// Customer A pauses Sep 7 to Sep 9 (3 weekdays)
// Customer A served = 8 weekdays, Customer B served = 11 weekdays
it('Case 8 — Transfer with pause in Customer A window: A billed 8 days, B billed 11 days', () => {
  const assignments = [
    { customer_id: 1, customer_name: 'Customer A', start_date: '2026-09-01', end_date: '2026-09-15' },
    { customer_id: 2, customer_name: 'Customer B', start_date: '2026-09-16', end_date: null }
  ];
  const pauses = [{ start_date: '2026-09-07', end_date: '2026-09-09' }];
  const splitBill = calculateSplitBill(2200, pauses, assignments, '2026-09');

  const a = splitBill.splits.find(s => s.customerId === 1);
  const b = splitBill.splits.find(s => s.customerId === 2);

  assert.strictEqual(a.servedDays, 8);
  assert.strictEqual(b.servedDays, 11);
  // 2200 * 8 / 22 = 800
  assert.strictEqual(a.amount, 800);
  // 2200 * 11 / 22 = 1100
  assert.strictEqual(b.amount, 1100);
  assert.strictEqual(splitBill.finalAmount, 1900);
});

// Case 9: Mid-cycle transfer with pause spanning across transfer date
// Transfer date is Sep 16. Pause from Sep 14 (Mon) to Sep 17 (Thu) = 4 weekdays.
// Sep 14 & Sep 15 (2 weekdays) fall under Customer A -> Customer A loses 2 days.
// Sep 16 & Sep 17 (2 weekdays) fall under Customer B -> Customer B loses 2 days.
it('Case 9 — Transfer with pause spanning transfer date: split pause deduction cleanly', () => {
  const assignments = [
    { customer_id: 1, customer_name: 'Customer A', start_date: '2026-09-01', end_date: '2026-09-15' },
    { customer_id: 2, customer_name: 'Customer B', start_date: '2026-09-16', end_date: null }
  ];
  const pauses = [{ start_date: '2026-09-14', end_date: '2026-09-17' }];
  const splitBill = calculateSplitBill(2200, pauses, assignments, '2026-09');

  const a = splitBill.splits.find(s => s.customerId === 1);
  const b = splitBill.splits.find(s => s.customerId === 2);

  assert.strictEqual(a.servedDays, 9); // 11 - 2 = 9
  assert.strictEqual(b.servedDays, 9); // 11 - 2 = 9
  assert.strictEqual(a.amount, 900);
  assert.strictEqual(b.amount, 900);
  assert.strictEqual(splitBill.finalAmount, 1800);
});

// Case 10: Accurate two-decimal rounding
it('Case 10 — Accurate two-decimal rounding on odd amounts', () => {
  const pauses = [{ start_date: '2026-09-07', end_date: '2026-09-07' }]; // 1 weekday paused
  // 22 weekdays, 21 served, price = 2500
  // 2500 * 21 / 22 = 2386.3636... -> 2386.36
  const bill = calculateBill(2500, pauses, '2026-09');
  assert.strictEqual(bill.finalAmount, 2386.36);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) {
  process.exit(1);
}
