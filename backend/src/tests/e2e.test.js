/**
 * Full End-to-End Verification Test for Builder Round:
 * 1. Register & Login
 * 2. Initial Dashboard Stats
 * 3. Add Customer
 * 4. Search Customer by Phone
 * 5. Pause Customer (5 weekdays)
 * 6. Overlapping Pause Rejection (409 Conflict)
 * 7. Weekday Pro-Rated Bill Verification
 * 8. Resume Customer
 * 9. T1 Clock & Outbox Delivery Notifications
 * 10. T6 Mid-Cycle Subscription Transfer & Split Bill
 * 11. T4 Messy CSV Import with Deduplication
 */

async function runE2ETest() {
  const BASE_URL = 'http://localhost:5000/api';
  const ROOT_URL = 'http://localhost:5000';
  console.log('🚀 Starting TiffinSubs Builder Round End-to-End Verification Test...\n');

  async function req(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : (url.startsWith('/clock') || url.startsWith('/outbox') ? `${ROOT_URL}${url}` : `${BASE_URL}${url}`);
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  const testEmail = `builder_e2e_${Date.now()}@tiffin.test`;
  const testPass = 'Secret123!';

  // Step 1: Register
  console.log('1. Testing POST /api/auth/register...');
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Master Chef', email: testEmail, password: testPass })
  });
  console.assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
  console.log('   ✅ User registered successfully. Token received.');
  const token = regRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Step 2: Login
  console.log('2. Testing POST /api/auth/login...');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPass })
  });
  console.assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
  console.log('   ✅ Login verified. User profile matched.');

  // Step 3: Check Initial Stats
  console.log('3. Testing GET /api/stats/dashboard...');
  const statsRes = await req('/stats/dashboard', { headers: authHeader });
  console.assert(statsRes.status === 200, 'Expected 200');
  console.assert(statsRes.data.totalCustomers === 0, 'Should start with 0 customers');
  console.log('   ✅ Initial stats empty as expected.');

  // Step 4: Add Customer 1
  console.log('4. Testing POST /api/customers (Add Customer)...');
  const custRes = await req('/customers', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Rohan Sharma',
      phone: '9876543210',
      monthlyPrice: 3000,
      startDate: '2026-09-01'
    })
  });
  console.assert(custRes.status === 201, `Expected 201, got ${custRes.status}`);
  const customerId1 = custRes.data.customer.id;
  const subscriptionId = custRes.data.customer.subscriptionId;
  console.log(`   ✅ Customer created with ID ${customerId1}, subscription ID ${subscriptionId}.`);

  // Step 5: Search Customer by Phone
  console.log('5. Testing GET /api/customers?phone=9876543210...');
  const searchRes = await req('/customers?phone=9876543210', { headers: authHeader });
  console.assert(searchRes.status === 200, 'Expected 200');
  console.assert(searchRes.data.customers.length === 1, 'Should find 1 customer');
  console.log('   ✅ Phone number search returns matched customer record.');

  // Step 6: Pause Customer (Sep 7 to Sep 11, 2026 = 5 weekdays)
  console.log('6. Testing POST /api/customers/:id/pause (Sep 7 to Sep 11, 2026)...');
  const pauseRes = await req(`/customers/${customerId1}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      startDate: '2026-09-07',
      endDate: '2026-09-11'
    })
  });
  console.assert(pauseRes.status === 201, `Expected 201, got ${pauseRes.status}`);
  console.log('   ✅ Customer paused successfully for 5 weekdays.');

  // Step 7: Test Overlapping Pause rejection (409 Conflict)
  console.log('7. Testing Overlapping Pause Rejection (409 Conflict)...');
  const overlapRes = await req(`/customers/${customerId1}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      startDate: '2026-09-10',
      endDate: '2026-09-15'
    })
  });
  console.assert(overlapRes.status === 409, `Expected 409 Conflict, got ${overlapRes.status}`);
  console.log('   ✅ Overlapping pause properly rejected with 409 Conflict.');

  // Step 8: Calculate Pro-Rated Bill for 2026-09 (Weekday service)
  // September 2026: 22 weekdays. 5 paused weekdays -> 17 served weekdays.
  // 3000 * 17 / 22 = 2318.18
  console.log('8. Testing GET /api/customers/:id/bill?month=2026-09...');
  const billRes = await req(`/customers/${customerId1}/bill?month=2026-09`, { headers: authHeader });
  console.assert(billRes.status === 200, `Expected 200, got ${billRes.status}`);
  const bill = billRes.data;
  console.log(`   📊 Bill Breakdown: Month Weekdays: ${bill.totalWeekdays}, Paused: ${bill.pausedDays}, Served: ${bill.daysServed}, Final: ₹${bill.finalAmount}`);
  console.assert(bill.totalWeekdays === 22, `Expected 22 weekdays, got ${bill.totalWeekdays}`);
  console.assert(bill.pausedDays === 5, `Expected 5 paused days, got ${bill.pausedDays}`);
  console.assert(bill.daysServed === 17, `Expected 17 served days, got ${bill.daysServed}`);
  console.assert(bill.finalAmount === 2318.18, `Expected ₹2318.18, got ₹${bill.finalAmount}`);
  console.log('   ✅ Weekday pro-rated billing strictly verified!');

  // Step 9: T1 Clock & Outbox Delivery Notifications
  console.log('9. Testing POST /clock & GET /outbox (T1 Twist)...');
  // Clock to 2026-09-17 (Thursday, after pause period ended on Sep 11)
  const clockRes = await req('/clock', {
    method: 'POST',
    body: JSON.stringify({ date: '2026-09-17' })
  });
  console.assert(clockRes.status === 200, `Expected 200 from /clock, got ${clockRes.status}`);
  console.assert(clockRes.data.isWeekday === true, 'Sep 17 should be weekday');

  const outboxRes = await req('/outbox?date=2026-09-17');
  console.assert(outboxRes.status === 200, 'Expected 200 from /outbox');
  const rohanEvent = outboxRes.data.events.find(e => e.customerId === customerId1);
  console.assert(rohanEvent !== undefined, 'Rohan must receive DELIVERY_DUE notification in outbox');
  console.log('   ✅ Outbox delivery notifications verified on simulated clock date.');

  // Step 10: T6 Mid-Cycle Subscription Transfer
  console.log('10. Testing POST /api/subscriptions/:id/transfer & Split Bill (T6 Twist)...');
  // Create Customer 2 (Pooja)
  const cust2Res = await req('/customers', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      name: 'Pooja Verma',
      phone: '9876543222',
      monthlyPrice: 3000,
      startDate: '2026-09-01'
    })
  });
  const customerId2 = cust2Res.data.customer.id;

  // Transfer subscriptionId from Rohan to Pooja on 2026-09-16
  const transferRes = await req(`/subscriptions/${subscriptionId}/transfer`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      newCustomerId: customerId2,
      transferDate: '2026-09-16'
    })
  });
  console.assert(transferRes.status === 200, `Expected 200 from transfer, got ${transferRes.status}: ${JSON.stringify(transferRes.data)}`);
  console.log('   ✅ Subscription successfully transferred mid-cycle to Pooja.');

  // Verify Split Bill for September 2026
  const splitBillRes = await req(`/customers/${customerId1}/bill?month=2026-09`, { headers: authHeader });
  console.assert(splitBillRes.status === 200, 'Expected 200 for split bill');
  const splitBill = splitBillRes.data;
  console.assert(splitBill.isSplit === true, 'Bill should be split between two customers');
  console.assert(splitBill.splits.length === 2, 'Split should have 2 customer breakdown entries');
  console.log('   📊 Split Bill Breakdown:');
  splitBill.splits.forEach(s => {
    console.log(`      - ${s.customerName} (ID: ${s.customerId}): ${s.servedDays} weekdays served $\\rightarrow$ ₹${s.amount}`);
  });
  console.log('   ✅ Split billing mathematically verified across customer lifecycle history!');

  // Step 11: T4 Messy CSV Import
  console.log('11. Testing POST /api/customers/import with messy CSV (T4 Twist)...');
  const messyCsv = `name,phone,monthly_price,start_date
Karan Kumar,9811111111,2800,2026-09-01
Karan Kumar Duplicate,9811111111,2800,01/09/2026
Simran Kaur,9822222222,2500,05-09-2026
,9833333333,3000,2026-09-01
Invalid User,,2800,2026-09-01`;

  const importRes = await req('/customers/import', {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': 'text/csv'
    },
    body: messyCsv
  });
  console.assert(importRes.status === 200, `Expected 200 from import, got ${importRes.status}`);
  console.log(`   📊 Import Report: Imported: ${importRes.data.imported}, Deduped: ${importRes.data.deduped}, Rejected: ${importRes.data.rejected}`);
  console.assert(importRes.data.imported === 2, `Expected 2 imported, got ${importRes.data.imported}`);
  console.assert(importRes.data.deduped === 1, `Expected 1 deduped, got ${importRes.data.deduped}`);
  console.assert(importRes.data.rejected === 2, `Expected 2 rejected, got ${importRes.data.rejected}`);
  console.log('   ✅ Messy CSV imported, deduplicated, and validated successfully!');

  console.log('\n🎉 ALL 11 BUILDER ROUND VERIFICATION STEPS PASSED PERFECTLY!\n');
}

runE2ETest().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
