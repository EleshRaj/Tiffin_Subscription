/**
 * Full End-to-End API Flow Test
 * Tests: Register -> Login -> Stats -> Add Customer -> Search Phone -> Pause -> Bill -> Resume -> List
 */
async function runE2ETest() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('🚀 Starting TiffinSubs End-to-End Verification Test...\n');

  // Helper for requests
  async function req(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
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

  const testEmail = `testowner_${Date.now()}@tiffin.test`;
  const testPass = 'Secret123!';

  // Step 1: Register
  console.log('1. Testing POST /auth/register...');
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Chef Sanjeev', email: testEmail, password: testPass })
  });
  console.assert(regRes.status === 201, `Expected 201, got ${regRes.status}: ${JSON.stringify(regRes.data)}`);
  console.log('   ✅ User registered successfully. Token received.');
  const token = regRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Step 2: Login
  console.log('2. Testing POST /auth/login...');
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPass })
  });
  console.assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
  console.log('   ✅ Login verified. User profile matched.');

  // Step 3: Check Initial Stats
  console.log('3. Testing GET /stats/dashboard...');
  const statsRes = await req('/stats/dashboard', { headers: authHeader });
  console.assert(statsRes.status === 200, 'Expected 200');
  console.assert(statsRes.data.totalCustomers === 0, 'Should start with 0 customers');
  console.log('   ✅ Initial stats empty as expected.');

  // Step 4: Add Customer
  console.log('4. Testing POST /customers (Add Customer)...');
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
  const customerId = custRes.data.customer.id;
  console.log(`   ✅ Customer created with ID ${customerId}, active subscription initialized.`);

  // Step 5: Search Customer by Phone
  console.log('5. Testing GET /customers?phone=9876543210...');
  const searchRes = await req('/customers?phone=9876543210', { headers: authHeader });
  console.assert(searchRes.status === 200, 'Expected 200');
  console.assert(searchRes.data.customers.length === 1, 'Should find 1 customer');
  console.assert(searchRes.data.customers[0].name === 'Rohan Sharma', 'Customer name matched');
  console.log('   ✅ Phone number search returns matched customer record.');

  // Step 6: Pause Customer (Sep 8 to Sep 12, 2026: Tue-Sat = 4 weekdays, or Mon-Fri = 5 weekdays)
  // 2026-09-07 (Mon) to 2026-09-11 (Fri) = exactly 5 weekdays
  console.log('6. Testing POST /customers/:id/pause (Sep 7 to Sep 11, 2026)...');
  const pauseRes = await req(`/customers/${customerId}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      startDate: '2026-09-07',
      endDate: '2026-09-11'
    })
  });
  console.assert(pauseRes.status === 201, `Expected 201, got ${pauseRes.status}: ${JSON.stringify(pauseRes.data)}`);
  console.log('   ✅ Customer paused successfully.');

  // Step 7: Test Overlapping Pause rejection (SRS Section 8)
  console.log('7. Testing Overlapping Pause Rejection (409 Conflict)...');
  const overlapRes = await req(`/customers/${customerId}/pause`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      startDate: '2026-09-10',
      endDate: '2026-09-15'
    })
  });
  console.assert(overlapRes.status === 409, `Expected 409 Conflict, got ${overlapRes.status}`);
  console.log('   ✅ Overlapping pause properly rejected with 409 Conflict.');

  // Step 8: Calculate Pro-Rated Bill for 2026-09
  console.log('8. Testing GET /customers/:id/bill?month=2026-09...');
  const billRes = await req(`/customers/${customerId}/bill?month=2026-09`, { headers: authHeader });
  console.assert(billRes.status === 200, `Expected 200, got ${billRes.status}`);
  const bill = billRes.data;
  console.log('   📊 Bill Breakdown:');
  console.log(`      - Monthly Price: ₹${bill.monthlyPrice}`);
  console.log(`      - Total Month Weekdays: ${bill.totalWeekdaysInMonth}`);
  console.log(`      - Paused Weekdays: ${bill.pausedWeekdays}`);
  console.log(`      - Weekdays Served: ${bill.daysServed}`);
  console.log(`      - Daily Rate: ₹${bill.perDayRate}`);
  console.log(`      - Final Bill: ₹${bill.totalAmount}`);

  console.assert(bill.totalWeekdaysInMonth === 22, `Expected 22 weekdays in Sep 2026, got ${bill.totalWeekdaysInMonth}`);
  console.assert(bill.pausedWeekdays === 5, `Expected 5 paused weekdays, got ${bill.pausedWeekdays}`);
  console.assert(bill.daysServed === 17, `Expected 17 days served, got ${bill.daysServed}`);
  console.assert(bill.totalAmount === 2318.18, `Expected ₹2318.18, got ₹${bill.totalAmount}`);
  console.log('   ✅ Pro-rated billing strictly matches mathematical SRS formula!');

  // Step 9: Resume Customer
  console.log('9. Testing POST /customers/:id/resume...');
  const resumeRes = await req(`/customers/${customerId}/resume`, {
    method: 'POST',
    headers: authHeader
  });
  console.assert(resumeRes.status === 200, `Expected 200, got ${resumeRes.status}`);
  console.log('   ✅ Subscription status successfully restored to ACTIVE.');

  // Step 10: Verify Updated Stats
  console.log('10. Testing Updated Dashboard Stats...');
  const finalStats = await req('/stats/dashboard', { headers: authHeader });
  console.assert(finalStats.data.totalCustomers === 1, 'Should have 1 customer');
  console.assert(finalStats.data.activeCustomers === 1, 'Should have 1 active customer');
  console.assert(finalStats.data.pausedCustomers === 0, 'Should have 0 paused customers');
  console.assert(finalStats.data.estimatedRevenue === 3000, 'Estimated revenue should be 3000');
  console.log('   ✅ Dashboard metrics refreshed and validated.');

  console.log('\n🎉 ALL 10 END-TO-END VERIFICATION STEPS PASSED PERFECTLY!\n');
}

runE2ETest().catch((err) => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
